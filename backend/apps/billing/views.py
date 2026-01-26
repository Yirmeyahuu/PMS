from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, Q
from .models import Invoice, InvoiceItem, Payment, Service
from .serializers import (
    InvoiceSerializer, InvoiceItemSerializer, 
    PaymentSerializer, ServiceSerializer
)


class InvoiceViewSet(viewsets.ModelViewSet):
    """CRUD operations for invoices"""
    
    queryset = Invoice.objects.filter(is_deleted=False).select_related(
        'clinic', 'patient', 'appointment'
    ).prefetch_related('items', 'payments')
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['clinic', 'patient', 'status', 'invoice_date']
    search_fields = ['invoice_number', 'patient__first_name', 'patient__last_name']
    ordering_fields = ['invoice_date', 'total_amount', 'created_at']
    
    def get_queryset(self):
        user = self.request.user
        queryset = self.queryset
        
        if not user.is_admin:
            queryset = queryset.filter(clinic=user.clinic)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(invoice_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(invoice_date__lte=end_date)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Mark invoice as paid"""
        invoice = self.get_object()
        invoice.status = 'PAID'
        invoice.amount_paid = invoice.total_amount
        invoice.save()
        return Response({'status': 'invoice marked as paid'})
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an invoice"""
        invoice = self.get_object()
        invoice.status = 'CANCELLED'
        invoice.save()
        return Response({'status': 'invoice cancelled'})
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get invoice summary statistics"""
        queryset = self.get_queryset()
        
        summary = queryset.aggregate(
            total_invoices=Count('id'),
            total_amount=Sum('total_amount'),
            total_paid=Sum('amount_paid'),
            total_outstanding=Sum('balance_due')
        )
        
        return Response(summary)


class InvoiceItemViewSet(viewsets.ModelViewSet):
    """CRUD operations for invoice items"""
    
    queryset = InvoiceItem.objects.all().select_related('invoice')
    serializer_class = InvoiceItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['invoice']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(invoice__clinic=user.clinic)


class PaymentViewSet(viewsets.ModelViewSet):
    """CRUD operations for payments"""
    
    queryset = Payment.objects.all().select_related('invoice', 'received_by')
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['invoice', 'payment_method', 'payment_date']
    ordering_fields = ['payment_date', 'amount']
    
    def get_queryset(self):
        user = self.request.user
        queryset = self.queryset
        
        if not user.is_admin:
            queryset = queryset.filter(invoice__clinic=user.clinic)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(payment_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(payment_date__lte=end_date)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(received_by=self.request.user)


class ServiceViewSet(viewsets.ModelViewSet):
    """CRUD operations for services"""
    
    queryset = Service.objects.all().select_related('clinic')
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['clinic', 'category', 'is_active']
    search_fields = ['name', 'service_code', 'description']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(clinic=user.clinic)