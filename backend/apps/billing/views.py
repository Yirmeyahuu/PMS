from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Invoice, InvoiceItem, Payment, Service   # ✅ billing.Service only
from .serializers import (
    InvoiceSerializer, InvoiceItemSerializer,
    PaymentSerializer, ServiceSerializer,
)


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.filter(is_deleted=False).select_related(
        'clinic', 'patient', 'appointment'
    )
    serializer_class   = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['status', 'clinic', 'patient']
    search_fields      = ['invoice_number', 'patient__first_name', 'patient__last_name']
    ordering_fields    = ['invoice_date', 'due_date', 'total_amount']

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(clinic=user.clinic)

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)


class InvoiceItemViewSet(viewsets.ModelViewSet):
    queryset           = InvoiceItem.objects.all().select_related('invoice')
    serializer_class   = InvoiceItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['invoice']

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(invoice__clinic=user.clinic)


class PaymentViewSet(viewsets.ModelViewSet):
    queryset           = Payment.objects.all().select_related('invoice', 'received_by')
    serializer_class   = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['invoice', 'payment_method']
    ordering_fields    = ['payment_date', 'amount']

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(invoice__clinic=user.clinic)

    def perform_create(self, serializer):
        serializer.save(received_by=self.request.user)


class ServiceViewSet(viewsets.ModelViewSet):
    """Billing service catalog — lives at /api/services/"""
    queryset           = Service.objects.all().select_related('clinic')
    serializer_class   = ServiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ['is_active', 'category']
    search_fields      = ['name', 'service_code', 'description']

    def get_queryset(self):
        return self.queryset.filter(clinic=self.request.user.clinic)

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)