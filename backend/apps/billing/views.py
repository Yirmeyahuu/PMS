import logging

from django.db.models import Sum, Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.appointments.models import Appointment
from .bulk_invoice_service import preview_bulk_invoice, run_bulk_invoice
from .filters import AppointmentPrintFilter, InvoiceBatchFilter, InvoiceFilter
from .models import Invoice, InvoiceItem, InvoiceBatch, Payment, Service
from .print_service import build_print_payload
from .serializers import (
    AppointmentPrintSerializer,
    BulkInvoiceRequestSerializer,
    InvoiceBatchSerializer,
    InvoiceItemSerializer,
    InvoiceSerializer,
    PaymentSerializer,
    ServiceSerializer,
)

logger = logging.getLogger(__name__)


# ── Invoice ───────────────────────────────────────────────────────────────────

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.filter(is_deleted=False).select_related(
        'clinic', 'patient', 'appointment', 'created_by', 'bulk_batch'
    ).prefetch_related('items')
    serializer_class   = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class    = InvoiceFilter
    search_fields      = ['invoice_number', 'patient__first_name', 'patient__last_name']
    ordering_fields    = ['invoice_date', 'due_date', 'total_amount']

    def get_queryset(self):
        user = self.request.user
        if not user.clinic:
            return self.queryset.none()
        main_clinic    = user.clinic.main_clinic
        all_branch_ids = list(
            main_clinic.get_all_branches().values_list('id', flat=True)
        )
        return self.queryset.filter(clinic_id__in=all_branch_ids)

    def perform_create(self, serializer):
        clinic = self.request.user.clinic

        # Auto-derive patient from appointment if not explicitly provided
        patient = serializer.validated_data.get('patient')
        if not patient:
            appointment = serializer.validated_data.get('appointment')
            if appointment:
                patient = appointment.patient

        serializer.save(
            clinic     = clinic,
            patient    = patient,
            created_by = self.request.user,
        )

    @action(detail=True, methods=['post'], url_path='mark_paid')
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status == 'PAID':
            return Response(
                {'detail': 'Invoice is already marked as paid.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        invoice.mark_paid(
            payment_method    = request.data.get('payment_method', 'CASH'),
            payment_reference = request.data.get('payment_reference', ''),
        )
        logger.info("Invoice %s marked PAID by %s", invoice.invoice_number, request.user.email)
        return Response(InvoiceSerializer(invoice).data)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        qs  = self.filter_queryset(self.get_queryset())
        agg = qs.aggregate(
            total_invoiced = Sum('total_amount'),
            total_paid     = Sum('amount_paid'),
            total_balance  = Sum('balance_due'),
            count          = Count('id'),
        )
        by_status = (
            qs.values('status')
            .annotate(count=Count('id'), total=Sum('total_amount'))
            .order_by('status')
        )
        return Response({
            'total_invoiced': agg['total_invoiced'] or 0,
            'total_paid':     agg['total_paid']     or 0,
            'total_balance':  agg['total_balance']  or 0,
            'count':          agg['count']          or 0,
            'by_status': [
                {'status': r['status'], 'count': r['count'], 'total': r['total'] or 0}
                for r in by_status
            ],
        })


# ── Invoice Item ──────────────────────────────────────────────────────────────

class InvoiceItemViewSet(viewsets.ModelViewSet):
    queryset           = InvoiceItem.objects.all().select_related('invoice')
    serializer_class   = InvoiceItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['invoice']

    def get_queryset(self):
        user = self.request.user
        if not user.clinic:
            return self.queryset.none()
        main_clinic    = user.clinic.main_clinic
        all_branch_ids = list(main_clinic.get_all_branches().values_list('id', flat=True))
        return self.queryset.filter(invoice__clinic_id__in=all_branch_ids)


# ── Payment ───────────────────────────────────────────────────────────────────

class PaymentViewSet(viewsets.ModelViewSet):
    queryset           = Payment.objects.all().select_related('invoice', 'received_by')
    serializer_class   = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['invoice', 'payment_method']
    ordering_fields    = ['payment_date', 'amount']

    def get_queryset(self):
        user = self.request.user
        if not user.clinic:
            return self.queryset.none()
        main_clinic    = user.clinic.main_clinic
        all_branch_ids = list(main_clinic.get_all_branches().values_list('id', flat=True))
        return self.queryset.filter(invoice__clinic_id__in=all_branch_ids)

    def perform_create(self, serializer):
        serializer.save(received_by=self.request.user)


# ── Service catalog ───────────────────────────────────────────────────────────

class ServiceViewSet(viewsets.ModelViewSet):
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


# ── Invoice Batch (Bulk Invoicing) ────────────────────────────────────────────

class InvoiceBatchViewSet(viewsets.ReadOnlyModelViewSet):
    """
    list/retrieve  →  GET  /api/invoice-batches/
    create_bulk    →  POST /api/invoice-batches/create_bulk/
    """
    serializer_class   = InvoiceBatchSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class    = InvoiceBatchFilter
    ordering           = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.clinic:
            return InvoiceBatch.objects.none()
        return InvoiceBatch.objects.filter(clinic=user.clinic.main_clinic)

    @action(detail=False, methods=['post'], url_path='create_bulk')
    def create_bulk(self, request):
        """
        POST /api/invoice-batches/create_bulk/

        Body (all optional except date_from / date_to):
        {
            "date_from":        "2026-03-01",
            "date_to":          "2026-03-31",
            "clinic_ids":       [],
            "status_filter":    ["COMPLETED"],
            "invoice_date":     "2026-03-31",
            "due_date":         "2026-04-07",
            "discount_percent": 0,
            "tax_percent":      0,
            "skip_existing":    true,
            "dry_run":          false
        }
        """
        req_ser = BulkInvoiceRequestSerializer(data=request.data)
        req_ser.is_valid(raise_exception=True)
        params = req_ser.validated_data

        user        = request.user
        main_clinic = user.clinic.main_clinic if user.clinic else None

        if not main_clinic:
            return Response(
                {'detail': 'User has no clinic assigned.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Dry run ────────────────────────────────────────────────────────────
        if params['dry_run']:
            preview = preview_bulk_invoice(params, user, main_clinic)
            if preview.get('error'):
                return Response({'detail': preview['error']}, status=status.HTTP_400_BAD_REQUEST)
            return Response(preview)

        # ── Live run ───────────────────────────────────────────────────────────
        try:
            batch = run_bulk_invoice(params, user, main_clinic)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        http_status = (
            status.HTTP_201_CREATED
            if batch.status == 'COMPLETED'
            else status.HTTP_207_MULTI_STATUS       # partial failures
        )
        return Response(InvoiceBatchSerializer(batch).data, status=http_status)


# ── Print Appointments ────────────────────────────────────────────────────────

class AppointmentPrintViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/appointments-print/          → paginated list (for table)
    GET /api/appointments-print/summary/  → aggregate counts (for print header)
    GET /api/appointments-print/payload/  → full print payload (no pagination)
    """
    serializer_class   = AppointmentPrintSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class    = AppointmentPrintFilter
    ordering_fields    = ['date', 'start_time', 'patient__last_name', 'status']
    ordering           = ['date', 'start_time']
    search_fields      = ['patient__first_name', 'patient__last_name', 'patient__patient_number']

    def get_queryset(self):
        user = self.request.user
        if not user.clinic:
            return Appointment.objects.none()

        main_clinic    = user.clinic.main_clinic
        all_branch_ids = list(
            main_clinic.get_all_branches().values_list('id', flat=True)
        )
        return (
            Appointment.objects
            .filter(
                clinic_id__in=all_branch_ids,
                is_deleted=False,
                patient__is_archived=False,
            )
            .select_related('patient', 'practitioner__user', 'clinic', 'location')
            .prefetch_related('billing_invoices')
        )

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """Aggregate counts for the print page header."""
        qs = self.filter_queryset(self.get_queryset())
        counts = (
            qs.values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )
        return Response({
            'total':     qs.count(),
            'by_status': {row['status']: row['count'] for row in counts},
        })

    @action(detail=False, methods=['get'], url_path='payload')
    def payload(self, request):
        """
        Full print payload — no pagination, includes summary aggregates.
        Intended for the browser print dialog / PDF generation.
        """
        qs = self.filter_queryset(self.get_queryset())
        return Response(build_print_payload(qs))