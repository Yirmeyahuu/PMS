import logging

from django.db import transaction
from django.db.models import F, Sum, Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .filters import ProductFilter, StockMovementFilter
from .models import Category, Product, StockMovement
from .serializers import (
    CategorySerializer,
    ProductSerializer,
    ProductListSerializer,
    StockMovementSerializer,
    StockAdjustmentSerializer,
)

logger = logging.getLogger(__name__)


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class   = CategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['name']
    ordering_fields    = ['name', 'created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.clinic:
            return Category.objects.none()
        main_clinic    = user.clinic.main_clinic
        all_branch_ids = list(
            main_clinic.get_all_branches().values_list('id', flat=True)
        )
        return Category.objects.filter(clinic_id__in=all_branch_ids)

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)


class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class    = ProductFilter
    search_fields      = ['name', 'sku', 'barcode', 'description']
    ordering_fields    = ['name', 'selling_price', 'quantity_in_stock', 'created_at']
    ordering           = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.clinic:
            return Product.objects.none()
        main_clinic    = user.clinic.main_clinic
        all_branch_ids = list(
            main_clinic.get_all_branches().values_list('id', flat=True)
        )
        # Default: exclude archived unless explicitly requested
        qs = (
            Product.objects
            .filter(clinic_id__in=all_branch_ids, is_deleted=False)
            .select_related('category', 'created_by', 'clinic')
        )
        return qs

    def perform_create(self, serializer):
        serializer.save(
            clinic     = self.request.user.clinic,
            created_by = self.request.user,
        )

    # ── Archive / Restore ─────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='archive')
    def archive(self, request, pk=None):
        product = self.get_object()
        if product.is_archived:
            return Response(
                {'detail': 'Product is already archived.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        product.is_archived = True
        product.is_active   = False
        product.save(update_fields=['is_archived', 'is_active', 'updated_at'])
        logger.info("Product %s archived by %s", product.name, request.user.email)
        return Response(ProductSerializer(product).data)

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        product = self.get_object()
        if not product.is_archived:
            return Response(
                {'detail': 'Product is not archived.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        product.is_archived = False
        product.is_active   = True
        product.save(update_fields=['is_archived', 'is_active', 'updated_at'])
        logger.info("Product %s restored by %s", product.name, request.user.email)
        return Response(ProductSerializer(product).data)

    # ── Stock Adjustment ──────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='adjust_stock')
    def adjust_stock(self, request, pk=None):
        product = self.get_object()
        ser     = StockAdjustmentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        d             = ser.validated_data
        movement_type = d['movement_type']
        quantity      = d['quantity']

        with transaction.atomic():
            qty_before = product.quantity_in_stock

            if movement_type == 'IN' or movement_type == 'RETURN':
                product.quantity_in_stock = qty_before + quantity
            elif movement_type == 'OUT':
                if quantity > qty_before:
                    return Response(
                        {'detail': 'Insufficient stock.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                product.quantity_in_stock = qty_before - quantity
            elif movement_type == 'ADJUSTMENT':
                # quantity is the NEW absolute value
                product.quantity_in_stock = quantity

            qty_after = product.quantity_in_stock
            product.save(update_fields=['quantity_in_stock', 'updated_at'])

            StockMovement.objects.create(
                product         = product,
                performed_by    = request.user,
                movement_type   = movement_type,
                quantity        = quantity,
                quantity_before = qty_before,
                quantity_after  = qty_after,
                reference       = d['reference'],
                notes           = d['notes'],
            )

        logger.info(
            "Stock adjustment on %s: %s %s (before=%s after=%s) by %s",
            product.name, movement_type, quantity,
            qty_before, qty_after, request.user.email,
        )
        return Response(ProductSerializer(product).data)

    # ── Stats ─────────────────────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        qs  = self.filter_queryset(self.get_queryset())
        agg = qs.aggregate(
            total_products  = Count('id'),
            total_active    = Count('id', filter=Q(is_active=True,   is_archived=False)),
            total_archived  = Count('id', filter=Q(is_archived=True)),
            low_stock_count = Count('id', filter=Q(quantity_in_stock__lte=F('reorder_level'))),
            total_stock_value = Sum(F('quantity_in_stock') * F('cost_price')),
        )
        return Response({
            'total_products':    agg['total_products']    or 0,
            'total_active':      agg['total_active']      or 0,
            'total_archived':    agg['total_archived']    or 0,
            'low_stock_count':   agg['low_stock_count']   or 0,
            'total_stock_value': agg['total_stock_value'] or 0,
        })


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only audit log of all stock movements."""
    serializer_class   = StockMovementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class    = StockMovementFilter
    ordering_fields    = ['created_at', 'movement_type']
    ordering           = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.clinic:
            return StockMovement.objects.none()
        main_clinic    = user.clinic.main_clinic
        all_branch_ids = list(
            main_clinic.get_all_branches().values_list('id', flat=True)
        )
        return (
            StockMovement.objects
            .filter(product__clinic_id__in=all_branch_ids)
            .select_related('product', 'performed_by')
        )