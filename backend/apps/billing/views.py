import logging

from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Count
from django.shortcuts import get_object_or_404
from django.template.response import TemplateResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.appointments.models import Appointment
from .authentication import QueryParamJWTAuthentication
from .bulk_invoice_service import preview_bulk_invoice, run_bulk_invoice
from .filters import AppointmentPrintFilter, InvoiceBatchFilter, InvoiceFilter
from .models import Invoice, InvoiceItem, InvoiceBatch, InvoicePrintSettings, Payment, Service
from .print_service import build_print_payload
from .serializers import (
    AppointmentPrintSerializer,
    BulkInvoiceRequestSerializer,
    InvoiceBatchSerializer,
    InvoiceCreateSerializer,
    InvoiceItemSerializer,
    InvoiceSerializer,
    PaymentSerializer,
    ServiceSerializer,
)
from io import BytesIO

logger = logging.getLogger(__name__)


# ── Invoice ───────────────────────────────────────────────────────────────────

class InvoiceViewSet(viewsets.ModelViewSet):
    """Full CRUD for invoices + custom actions."""
    lookup_field       = 'pk'
    lookup_value_regex = r'[0-9]+'

    queryset = Invoice.objects.filter(is_deleted=False).select_related(
        'clinic', 'patient', 'appointment', 'created_by', 'bulk_batch',
    ).prefetch_related('items', 'payments')

    serializer_class   = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class    = InvoiceFilter
    search_fields      = ['invoice_number', 'patient__first_name', 'patient__last_name']
    ordering_fields    = ['invoice_date', 'due_date', 'total_amount', 'created_at']
    ordering           = ['-invoice_date', '-created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.clinic:
            return self.queryset.none()

        main_clinic    = user.clinic.main_clinic
        all_branch_ids = list(
            main_clinic.get_all_branches().values_list('id', flat=True)
        )
        qs = self.queryset.filter(clinic_id__in=all_branch_ids)

        appointment_id = self.request.query_params.get('appointment')
        if appointment_id:
            try:
                qs = qs.filter(appointment_id=int(appointment_id))
            except (ValueError, TypeError):
                pass

        return qs

    def perform_create(self, serializer):
        clinic  = self.request.user.clinic
        patient = serializer.validated_data.get('patient')
        if not patient:
            appointment = serializer.validated_data.get('appointment')
            if appointment:
                patient = appointment.patient

        instance = serializer.save(
            clinic     = clinic,
            patient    = patient,
            created_by = self.request.user,
        )

        inline_items = self.request.data.get('inline_items', [])
        if inline_items:
            for item_data in inline_items:
                InvoiceItem.objects.create(
                    invoice          = instance,
                    description      = item_data.get('description', ''),
                    quantity         = item_data.get('quantity', 1),
                    unit_price       = Decimal(str(item_data.get('unit_price', 0))),
                    discount_percent = Decimal(str(item_data.get('discount_percent', 0))),
                    tax_percent      = Decimal(str(item_data.get('tax_percent', 0))),
                    service_code     = item_data.get('service_code', ''),
                )
            instance.update_totals()
            instance.refresh_from_db()

        logger.info(
            "Invoice %s created for appointment %s by %s",
            instance.invoice_number, instance.appointment_id, self.request.user.email,
        )

    # ── Create invoice from appointment ───────────────────────────────────────
    @action(
        detail=False,
        methods=['post'],
        url_path='create-from-appointment',
        url_name='create-from-appointment',
    )
    def create_from_appointment(self, request):
        """POST /api/invoices/create-from-appointment/"""
        ser = InvoiceCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        appt    = data['appointment']
        patient = data.get('patient') or appt.patient
        clinic  = data.get('clinic')  or request.user.clinic

        if not clinic:
            return Response(
                {'detail': 'User has no clinic assigned.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing = Invoice.objects.filter(
            appointment=appt, is_deleted=False
        ).first()
        if existing:
            return Response(
                InvoiceSerializer(existing).data,
                status=status.HTTP_200_OK,
            )

        try:
            with transaction.atomic():
                invoice = Invoice.objects.create(
                    clinic       = clinic,
                    patient      = patient,
                    appointment  = appt,
                    invoice_date = data['invoice_date'],
                    due_date     = data.get('due_date'),
                    notes        = data.get('notes', ''),
                    created_by   = request.user,
                    status       = 'DRAFT',
                )

                items = data.get('items', [])
                if items:
                    for item_data in items:
                        InvoiceItem.objects.create(
                            invoice          = invoice,
                            description      = item_data.get('description', ''),
                            quantity         = item_data.get('quantity', 1),
                            unit_price       = Decimal(str(item_data.get('unit_price', 0))),
                            discount_percent = Decimal(str(item_data.get('discount_percent', 0))),
                            tax_percent      = Decimal(str(item_data.get('tax_percent', 0))),
                            service_code     = item_data.get('service_code', ''),
                        )
                else:
                    from apps.clinics.services.models import Service as ClinicService

                    description = appt.get_appointment_type_display()
                    unit_price  = Decimal('0')

                    main_clinic    = clinic.main_clinic if hasattr(clinic, 'main_clinic') else clinic
                    all_branch_ids = list(
                        main_clinic.get_all_branches().values_list('id', flat=True)
                    )

                    service_qs = ClinicService.objects.filter(
                        clinic_id__in=all_branch_ids,
                        is_active=True,
                        is_deleted=False,
                    )

                    matching_service = (
                        service_qs.filter(name__iexact=description).first()
                        or service_qs.filter(name__icontains=description).first()
                        or service_qs.filter(name__icontains=appt.appointment_type).first()
                        or service_qs.filter(name__iexact=appt.appointment_type).first()
                    )

                    # Word-by-word fallback
                    if not matching_service:
                        for word in [w for w in description.split() if len(w) > 3]:
                            matching_service = service_qs.filter(name__icontains=word).first()
                            if matching_service:
                                break

                    if matching_service:
                        description = matching_service.name
                        unit_price  = Decimal(str(matching_service.price))
                        logger.info(
                            "Auto-matched clinic service '%s' (₱%s) for appointment %s",
                            matching_service.name, unit_price, appt.id,
                        )
                    else:
                        if appt.practitioner and hasattr(appt.practitioner, 'consultation_fee'):
                            unit_price = Decimal(str(appt.practitioner.consultation_fee or 0))
                        logger.warning(
                            "No clinic service matched for appointment %s (type=%s). unit_price=₱%s",
                            appt.id, appt.appointment_type, unit_price,
                        )

                    InvoiceItem.objects.create(
                        invoice     = invoice,
                        description = description,
                        quantity    = 1,
                        unit_price  = unit_price,
                    )

                invoice.update_totals()

        except Exception as exc:
            logger.exception("Failed to create invoice for appointment %s: %s", appt.id, exc)
            return Response(
                {'detail': f'Failed to create invoice: {str(exc)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        logger.info(
            "Invoice %s created from appointment %s by %s",
            invoice.invoice_number, appt.id, request.user.email,
        )
        return Response(
            InvoiceSerializer(invoice).data,
            status=status.HTTP_201_CREATED,
        )

    # ── Get invoice by appointment ID ─────────────────────────────────────────
    @action(
        detail=False,
        methods=['get'],
        url_path=r'by-appointment/(?P<appointment_id>[0-9]+)',
        url_name='by-appointment',
    )
    def by_appointment(self, request, appointment_id=None):
        """GET /api/invoices/by-appointment/<appointment_id>/"""
        try:
            appt_id = int(appointment_id)
        except (ValueError, TypeError):
            return Response(
                {'detail': 'Invalid appointment ID.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invoice = self.get_queryset().filter(appointment_id=appt_id).first()

        if not invoice:
            return Response(None, status=status.HTTP_200_OK)

        return Response(InvoiceSerializer(invoice).data)

    # ── Mark as paid — scoped strictly to one invoice ─────────────────────────
    @action(detail=True, methods=['post'], url_path='mark-paid', url_name='mark-paid')
    def mark_paid(self, request, pk=None):
        """
        POST /api/invoices/{id}/mark-paid/
        Marks ONLY this invoice as paid. No other invoices are touched.
        """
        invoice = self.get_object()

        if invoice.status == 'PAID':
            return Response(
                {'detail': 'Invoice is already marked as paid.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_method    = request.data.get('payment_method', 'CASH')
        payment_reference = request.data.get('payment_reference', '')

        # Use scoped DB update — guarantees only this invoice row is modified
        invoice.mark_paid(
            payment_method    = payment_method,
            payment_reference = payment_reference,
        )

        logger.info(
            "Invoice %s (pk=%s) marked PAID by %s",
            invoice.invoice_number, invoice.pk, request.user.email,
        )

        # Return fresh data from DB
        fresh = Invoice.objects.get(pk=invoice.pk)
        return Response(InvoiceSerializer(fresh).data)

    # ── Update status — scoped strictly to one invoice ────────────────────────
    @action(detail=True, methods=['post'], url_path='update-status', url_name='update-status')
    def update_status(self, request, pk=None):
        """
        POST /api/invoices/{id}/update-status/
        Updates ONLY this invoice's status.
        """
        invoice    = self.get_object()
        new_status = request.data.get('status')

        allowed = [s[0] for s in Invoice.STATUS_CHOICES]
        if new_status not in allowed:
            return Response(
                {'detail': f'Status must be one of: {", ".join(allowed)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if new_status == 'PAID':
            invoice.mark_paid(
                payment_method    = request.data.get('payment_method', 'CASH'),
                payment_reference = request.data.get('payment_reference', ''),
            )
        else:
            # Scoped update — only this invoice's row
            Invoice.objects.filter(pk=invoice.pk).update(status=new_status)

        logger.info(
            "Invoice %s (pk=%s) status → %s by %s",
            invoice.invoice_number, invoice.pk, new_status, request.user.email,
        )

        fresh = Invoice.objects.get(pk=invoice.pk)
        return Response(InvoiceSerializer(fresh).data)

    # ── Add line item ─────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='add-item', url_name='add-item')
    def add_item(self, request, pk=None):
        """POST /api/invoices/{id}/add-item/"""
        invoice = self.get_object()

        try:
            description      = request.data.get('description', '')
            quantity         = Decimal(str(request.data.get('quantity', 1)))
            unit_price       = Decimal(str(request.data.get('unit_price', 0)))
            discount_percent = Decimal(str(request.data.get('discount_percent', 0)))
            tax_percent      = Decimal(str(request.data.get('tax_percent', 0)))
            service_code     = request.data.get('service_code', '')

            item = InvoiceItem(
                invoice          = invoice,
                description      = description,
                quantity         = quantity,
                unit_price       = unit_price,
                discount_percent = discount_percent,
                tax_percent      = tax_percent,
                service_code     = service_code,
            )
            item.save()  # item.total is computed in InvoiceItem.save()

        except Exception as exc:
            logger.exception("Failed to add item to invoice %s: %s", invoice.invoice_number, exc)
            return Response(
                {'detail': f'Failed to add item: {str(exc)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invoice.update_totals()
        fresh = Invoice.objects.get(pk=invoice.pk)
        return Response(InvoiceSerializer(fresh).data, status=status.HTTP_201_CREATED)

    # ── Print invoice (HTML) ──────────────────────────────────────────────────
    @action(
        detail=True,
        methods=['get'],
        url_path='print',
        url_name='print',
        authentication_classes=[QueryParamJWTAuthentication],
    )
    def print_invoice(self, request, pk=None):
        """GET /api/invoices/{id}/print/ — Renders printable HTML for this invoice only."""
        invoice = self.get_object()

        # Force recalculate totals from items to ensure accuracy
        invoice.update_totals()
        invoice = Invoice.objects.get(pk=invoice.pk)  # fresh from DB

        items    = list(invoice.items.all().order_by('id'))
        payments = invoice.payments.all().order_by('-payment_date')

        print_settings      = InvoicePrintSettings.get_for_clinic(invoice.clinic)
        clinic_display_name = print_settings.clinic_name or invoice.clinic.name

        date_format = print_settings.date_format or '%B %d, %Y'
        django_date_format_map = {
            '%B %d, %Y': 'F j, Y',
            '%m/%d/%Y':  'm/d/Y',
            '%d/%m/%Y':  'd/m/Y',
            '%Y-%m-%d':  'Y-m-d',
            '%b %d, %Y': 'M j, Y',
        }
        template_date_format = django_date_format_map.get(date_format, 'F j, Y')

        has_discounts = any(item.discount_percent > 0 for item in items)
        has_taxes     = any(item.tax_percent > 0 for item in items)
        currency      = print_settings.currency_symbol or '₱'

        computed_subtotal    = sum(
            Decimal(str(item.quantity)) * Decimal(str(item.unit_price)) for item in items
        )
        computed_items_total = sum(Decimal(str(item.total)) for item in items)
        discount_amount      = Decimal(str(invoice.discount_amount or 0))
        tax_amount           = Decimal(str(invoice.tax_amount or 0))
        philhealth           = Decimal(str(invoice.philhealth_coverage or 0))
        hmo                  = Decimal(str(invoice.hmo_coverage or 0))
        amount_paid          = Decimal(str(invoice.amount_paid or 0))
        computed_total       = computed_items_total - discount_amount + tax_amount
        computed_balance_due = max(computed_total - amount_paid - philhealth - hmo, Decimal('0'))

        context = {
            'invoice':              invoice,
            'items':                items,
            'payments':             payments,
            'settings':             print_settings,
            'clinic_display_name':  clinic_display_name,
            'date_format':          template_date_format,
            'has_discounts':        has_discounts,
            'has_taxes':            has_taxes,
            'currency':             currency,
            'computed_subtotal':    f'{computed_subtotal:,.2f}',
            'computed_total':       f'{computed_total:,.2f}',
            'computed_balance_due': f'{computed_balance_due:,.2f}',
        }

        return TemplateResponse(request, 'billing/invoice_print.html', context)

    # ── Download invoice as PDF ───────────────────────────────────────────────
    @action(
        detail=True,
        methods=['get'],
        url_path='download-pdf',
        url_name='download-pdf',
        authentication_classes=[QueryParamJWTAuthentication],
    )
    def download_pdf(self, request, pk=None):
        """
        GET /api/invoices/{id}/download-pdf/ — Downloads the invoice as a PDF file.
        This endpoint is used by the frontend to fetch the PDF for email attachment.
        Falls back to HTML if PDF generation fails.
        """
        from django.http import HttpResponse
        from django.template.loader import render_to_string

        invoice = self.get_object()

        try:
            # Try to generate PDF using WeasyPrint
            try:
                from weasyprint import HTML
                
                # Force recalculate totals from items to ensure accuracy
                invoice.update_totals()
                invoice = Invoice.objects.get(pk=invoice.pk)
                items    = list(invoice.items.all().order_by('id'))
                payments = invoice.payments.all().order_by('-payment_date')

                print_settings      = InvoicePrintSettings.get_for_clinic(invoice.clinic)
                clinic_display_name = print_settings.clinic_name or invoice.clinic.name

                date_format = print_settings.date_format or '%B %d, %Y'
                template_date_format = 'F j, Y'

                has_discounts = any(item.discount_percent > 0 for item in items)
                has_taxes     = any(item.tax_percent > 0 for item in items)
                currency      = print_settings.currency_symbol or '₱'

                computed_subtotal    = sum(
                    Decimal(str(item.quantity)) * Decimal(str(item.unit_price)) for item in items
                )
                computed_items_total = sum(Decimal(str(item.total)) for item in items)
                discount_amount      = Decimal(str(invoice.discount_amount or 0))
                tax_amount           = Decimal(str(invoice.tax_amount or 0))
                amount_paid          = Decimal(str(invoice.amount_paid or 0))
                computed_total       = computed_items_total - discount_amount + tax_amount
                computed_balance_due = max(computed_total - amount_paid, Decimal('0'))

                context = {
                    'invoice':              invoice,
                    'items':                items,
                    'payments':             payments,
                    'settings':             print_settings,
                    'clinic_display_name':  clinic_display_name,
                    'date_format':          template_date_format,
                    'has_discounts':        has_discounts,
                    'has_taxes':            has_taxes,
                    'currency':             currency,
                    'computed_subtotal':    f'{computed_subtotal:,.2f}',
                    'computed_total':       f'{computed_total:,.2f}',
                    'computed_balance_due': f'{computed_balance_due:,.2f}',
                }

                html_string = render_to_string('billing/invoice_print.html', context)
                pdf_file = BytesIO()
                html = HTML(string=html_string)
                html.write_pdf(pdf_file)
                pdf_file.seek(0)

                response = HttpResponse(pdf_file.getvalue(), content_type='application/pdf')
                response['Content-Disposition'] = f'attachment; filename="Invoice_{invoice.invoice_number}.pdf"'
                logger.info(f"Generated PDF for invoice #{invoice.invoice_number}")
                return response
                
            except Exception as pdf_err:
                # Fall back to HTML
                logger.warning(f"PDF generation failed for invoice #{invoice.invoice_number}, falling back to HTML: {pdf_err}")
                
                # Build context for HTML
                invoice.update_totals()
                invoice = Invoice.objects.get(pk=invoice.pk)
                items    = list(invoice.items.all().order_by('id'))
                payments = invoice.payments.all().order_by('-payment_date')

                print_settings      = InvoicePrintSettings.get_for_clinic(invoice.clinic)
                clinic_display_name = print_settings.clinic_name or invoice.clinic.name
                template_date_format = 'F j, Y'
                has_discounts = any(item.discount_percent > 0 for item in items)
                has_taxes     = any(item.tax_percent > 0 for item in items)
                currency      = print_settings.currency_symbol or '₱'
                computed_subtotal    = sum(Decimal(str(item.quantity)) * Decimal(str(item.unit_price)) for item in items)
                computed_items_total = sum(Decimal(str(item.total)) for item in items)
                discount_amount      = Decimal(str(invoice.discount_amount or 0))
                tax_amount           = Decimal(str(invoice.tax_amount or 0))
                amount_paid          = Decimal(str(invoice.amount_paid or 0))
                computed_total       = computed_items_total - discount_amount + tax_amount
                computed_balance_due = max(computed_total - amount_paid, Decimal('0'))
                context = {
                    'invoice':              invoice,
                    'items':                items,
                    'payments':             payments,
                    'settings':             print_settings,
                    'clinic_display_name':  clinic_display_name,
                    'date_format':          template_date_format,
                    'has_discounts':        has_discounts,
                    'has_taxes':            has_taxes,
                    'currency':             currency,
                    'computed_subtotal':    f'{computed_subtotal:,.2f}',
                    'computed_total':       f'{computed_total:,.2f}',
                    'computed_balance_due': f'{computed_balance_due:,.2f}',
                }
                html_string = render_to_string('billing/invoice_print.html', context)
                response = HttpResponse(html_string, content_type='text/html')
                return response
                
        except Exception as exc:
            logger.exception(f"Failed to generate output for invoice {invoice.invoice_number}: {exc}")
            return Response(
                {'detail': f'Failed to generate invoice: {str(exc)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # ── Send invoice via email ─────────────────────────────────────────────────
    @action(
        detail=True,
        methods=['post'],
        url_path='send-email',
        url_name='send-email',
    )
    def send_email(self, request, pk=None):
        """POST /api/invoices/{id}/send-email/ — Send invoice PDF via email."""
        from django.core.mail import EmailMessage
        from django.conf import settings
        from io import BytesIO

        invoice = self.get_object()

        # Handle both JSON and multipart/form-data requests
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Multipart request - use request.POST for text fields
            to_email = request.POST.get('to_email')
            subject = request.POST.get('subject', f'Invoice #{invoice.invoice_number}')
            body = request.POST.get('body', f'Please find attached invoice #{invoice.invoice_number}.')
            html_content = request.POST.get('html_content')
        else:
            # JSON request
            to_email = request.data.get('to_email')
            subject = request.data.get('subject', f'Invoice #{invoice.invoice_number}')
            body = request.data.get('body', f'Please find attached invoice #{invoice.invoice_number}.')
            html_content = None

        if not to_email:
            return Response(
                {'detail': 'to_email is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            pdf_content = None
            pdf_error = None
            
            # Check if HTML content was sent from frontend - convert to PDF using WeasyPrint
            if html_content:
                try:
                    from weasyprint import HTML
                    
                    logger.info(f"Converting HTML to PDF for invoice #{invoice.invoice_number}")
                    logger.info(f"HTML content length: {len(html_content)} characters")
                    logger.info(f"HTML content first 200 chars: {html_content[:200]}")
                    
                    # Convert HTML to PDF
                    pdf_file = BytesIO()
                    html = HTML(string=html_content)
                    html.write_pdf(pdf_file)
                    pdf_file.seek(0)
                    pdf_content = pdf_file.getvalue()
                    
                    logger.info(f"Successfully converted HTML to PDF, size: {len(pdf_content)} bytes")
                    logger.info(f"PDF header: {pdf_content[:20]}")
                    
                except Exception as pdf_err:
                    pdf_error = str(pdf_err)
                    logger.error(f"Failed to convert HTML to PDF: {pdf_error}")
                    import traceback
                    logger.error(f"Traceback: {traceback.format_exc()}")
                    pdf_content = None
            # Check if a PDF file was uploaded from frontend
            elif 'attachment' in request.FILES:
                pdf_file_obj = request.FILES['attachment']
                pdf_content = pdf_file_obj.read()
                logger.info(f"Using uploaded PDF for invoice #{invoice.invoice_number}, size: {len(pdf_content)} bytes, filename: {pdf_file_obj.name}")
                logger.info(f"PDF content first 20 bytes: {pdf_content[:20]}")
            else:
                # Generate PDF from scratch using WeasyPrint
                try:
                    from django.template.loader import render_to_string
                    from weasyprint import HTML

                    # Build the invoice print context
                    invoice.update_totals()
                    invoice = Invoice.objects.get(pk=invoice.pk)

                    items    = list(invoice.items.all().order_by('id'))
                    payments = invoice.payments.all().order_by('-payment_date')

                    print_settings      = InvoicePrintSettings.get_for_clinic(invoice.clinic)
                    clinic_display_name = print_settings.clinic_name or invoice.clinic.name

                    date_format = print_settings.date_format or '%B %d, %Y'
                    template_date_format = 'F j, Y'

                    has_discounts = any(item.discount_percent > 0 for item in items)
                    has_taxes     = any(item.tax_percent > 0 for item in items)
                    currency      = print_settings.currency_symbol or '₱'

                    computed_subtotal    = sum(
                        Decimal(str(item.quantity)) * Decimal(str(item.unit_price)) for item in items
                    )
                    computed_items_total = sum(Decimal(str(item.total)) for item in items)
                    discount_amount      = Decimal(str(invoice.discount_amount or 0))
                    tax_amount           = Decimal(str(invoice.tax_amount or 0))
                    amount_paid          = Decimal(str(invoice.amount_paid or 0))
                    computed_total       = computed_items_total - discount_amount + tax_amount
                    computed_balance_due = max(computed_total - amount_paid, Decimal('0'))

                    context = {
                        'invoice':              invoice,
                        'items':                items,
                        'payments':             payments,
                        'settings':             print_settings,
                        'clinic_display_name':  clinic_display_name,
                        'date_format':          template_date_format,
                        'has_discounts':        has_discounts,
                        'has_taxes':            has_taxes,
                        'currency':             currency,
                        'computed_subtotal':    f'{computed_subtotal:,.2f}',
                        'computed_total':       f'{computed_total:,.2f}',
                        'computed_balance_due': f'{computed_balance_due:,.2f}',
                    }

                    # Render HTML and convert to PDF
                    html_string = render_to_string('billing/invoice_print.html', context)
                    pdf_file = BytesIO()
                    html = HTML(string=html_string)
                    html.write_pdf(pdf_file)
                    pdf_file.seek(0)
                    pdf_content = pdf_file.getvalue()
                    
                    logger.info(f"Generated PDF for invoice #{invoice.invoice_number}, size: {len(pdf_content)} bytes")
                except Exception as pdf_err:
                    pdf_error = str(pdf_err)
                    logger.error(f"Failed to generate PDF: {pdf_error}")
                    pdf_content = None

            # Create email
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None)
            
            email = EmailMessage(
                subject=subject,
                body=body,
                from_email=from_email,
                to=[to_email],
            )
            
            # Attach PDF if available and valid
            if pdf_content and len(pdf_content) > 0:
                logger.info(f"Attempting to attach PDF, pdf_content length: {len(pdf_content)}")
                # Verify it's a valid PDF (starts with %PDF)
                if pdf_content[:4] == b'%PDF':
                    email.attach(
                        filename=f'Invoice_{invoice.invoice_number}.pdf',
                        content=pdf_content,
                        mimetype='application/pdf'
                    )
                    logger.info(f"Attached PDF to email for invoice #{invoice.invoice_number}")
                else:
                    logger.error(f"PDF content is invalid (not starting with %PDF) for invoice #{invoice.invoice_number}, got: {pdf_content[:20]}")
                    # Fallback: attach as HTML
                    if html_content:
                        email.attach(
                            filename=f'Invoice_{invoice.invoice_number}.html',
                            content=html_content.encode('utf-8') if isinstance(html_content, str) else html_content,
                            mimetype='text/html'
                        )
            else:
                # No PDF - send email without attachment or with HTML fallback
                logger.warning(f"No PDF generated for invoice #{invoice.invoice_number}, pdf_error: {pdf_error}")
                if html_content:
                    email.attach(
                        filename=f'Invoice_{invoice.invoice_number}.html',
                        content=html_content.encode('utf-8') if isinstance(html_content, str) else html_content,
                        mimetype='text/html'
                    )
            
            email.send(fail_silently=False)

            logger.info(f"Invoice #{invoice.invoice_number} sent to {to_email}")

            return Response({
                'detail': 'Invoice sent successfully',
                'sent_to': to_email,
                'has_attachment': pdf_content is not None and len(pdf_content) > 0
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Failed to send invoice #{invoice.invoice_number}: {str(e)}")
            return Response(
                {'detail': f'Failed to send email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # ── Stats ─────────────────────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='stats', url_name='stats')
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
        user   = self.request.user
        clinic = getattr(user, 'clinic', None)
        if not clinic:
            return self.queryset.none()
        main_clinic    = clinic.main_clinic
        all_branch_ids = list(main_clinic.get_all_branches().values_list('id', flat=True))
        return self.queryset.filter(invoice__clinic_id__in=all_branch_ids)

    def perform_update(self, serializer):
        instance = serializer.save()
        instance.invoice.update_totals()

    def perform_destroy(self, instance):
        invoice = instance.invoice
        instance.delete()
        invoice.update_totals()


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

    @action(detail=False, methods=['post'], url_path='create-bulk', url_name='create-bulk')
    def create_bulk(self, request):
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

        if params['dry_run']:
            preview = preview_bulk_invoice(params, user, main_clinic)
            if preview.get('error'):
                return Response({'detail': preview['error']}, status=status.HTTP_400_BAD_REQUEST)
            return Response(preview)

        try:
            batch = run_bulk_invoice(params, user, main_clinic)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        http_status = (
            status.HTTP_201_CREATED
            if batch.status == 'COMPLETED'
            else status.HTTP_207_MULTI_STATUS
        )
        return Response(InvoiceBatchSerializer(batch).data, status=http_status)


# ── Print Appointments ────────────────────────────────────────────────────────

class AppointmentPrintViewSet(viewsets.ReadOnlyModelViewSet):
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
        qs = self.filter_queryset(self.get_queryset())
        return Response(build_print_payload(qs))



class UninvoicedBookingsView(APIView):
    permission_classes = [IsAuthenticated]

    # ── Shared logic ──────────────────────────────────────────────────────────
    def _get_data(self, request):
        user = request.user
        if not user.clinic:
            return None, Response(
                {'detail': 'User has no clinic assigned.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        main_clinic    = user.clinic.main_clinic
        all_branch_ids = list(
            main_clinic.get_all_branches().values_list('id', flat=True)
        )

        start_date_str = request.query_params.get('start_date')
        end_date_str   = request.query_params.get('end_date')
        practitioner_id = request.query_params.get('practitioner_id')
        branch_id       = request.query_params.get('branch_id')

        # ── FIXED: include all meaningful statuses, not just COMPLETED ────────
        # "No invoice yet" can appear on COMPLETED, CHECKED_IN, IN_PROGRESS, etc.
        status_param = request.query_params.get('status', 'ALL')

        BILLABLE_STATUSES = ['COMPLETED', 'CHECKED_IN', 'IN_PROGRESS', 'CONFIRMED', 'SCHEDULED']

        if status_param == 'ALL':
            target_statuses = BILLABLE_STATUSES
        elif status_param == 'COMPLETED':
            target_statuses = ['COMPLETED']
        else:
            target_statuses = [status_param] if status_param in BILLABLE_STATUSES else BILLABLE_STATUSES

        try:
            from datetime import date as date_type
            start_date = date_type.fromisoformat(start_date_str) if start_date_str else None
            end_date   = date_type.fromisoformat(end_date_str)   if end_date_str   else None
        except ValueError:
            return None, Response(
                {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from apps.appointments.models import Appointment
        from apps.billing.models import Invoice

        qs = (
            Appointment.objects
            .filter(
                clinic_id__in=all_branch_ids,
                is_deleted=False,
                patient__is_archived=False,
                status__in=target_statuses,
            )
            .select_related('patient', 'practitioner__user', 'clinic')
            .prefetch_related('billing_invoices')
            .order_by('date', 'start_time')
        )

        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
        if practitioner_id:
            try:
                qs = qs.filter(practitioner_id=int(practitioner_id))
            except (ValueError, TypeError):
                pass
        if branch_id:
            try:
                bid = int(branch_id)
                if bid in all_branch_ids:
                    qs = qs.filter(clinic_id=bid)
            except (ValueError, TypeError):
                pass

        total_in_range   = qs.count()
        skipped_invoiced = 0
        results          = []
        today            = date_type.today()

        # ── Statuses that mean "properly invoiced — no action needed" ─────────
        # DRAFT and PENDING = invoice exists but unpaid = still "uninvoiced"
        INVOICED_STATUSES = {'PAID', 'PARTIALLY_PAID', 'OVERDUE'}

        for appt in qs:
            active_invoices = [
                inv for inv in appt.billing_invoices.all()
                if not getattr(inv, 'is_deleted', False)
            ]

            has_real_invoice = any(
                inv.status in INVOICED_STATUSES
                for inv in active_invoices
            )

            if has_real_invoice:
                skipped_invoiced += 1
                continue

            # Determine invoice_status to show
            invoice_status = None
            invoice_number = None
            if active_invoices:
                # Priority: PENDING > DRAFT (most urgent first)
                priority = {'PENDING': 0, 'DRAFT': 1}
                sorted_inv = sorted(
                    active_invoices,
                    key=lambda i: priority.get(i.status, 99)
                )
                invoice_status = sorted_inv[0].status
                invoice_number = sorted_inv[0].invoice_number

            days_since = None
            if appt.status == 'COMPLETED':
                days_since = (today - appt.date).days

            results.append({
                'appointment_id':       appt.id,
                'date':                 str(appt.date),
                'start_time':           appt.start_time.strftime('%H:%M'),
                'end_time':             appt.end_time.strftime('%H:%M'),
                'appointment_type':     appt.appointment_type,
                'appointment_status':   appt.status,
                'patient_id':           appt.patient_id,
                'patient_name':         appt.patient.get_full_name(),
                'patient_number':       appt.patient.patient_number,
                'practitioner_name':    (
                    appt.practitioner.user.get_full_name()
                    if appt.practitioner else ''
                ),
                'branch_name':          appt.clinic.name if appt.clinic else None,
                'days_since_completed': days_since,
                'invoice_status':       invoice_status,
                'invoice_number':       invoice_number,
            })

        from django.utils import timezone

        return {
            'report_type':  'uninvoiced_bookings',
            'tab':          'administration',
            'start_date':   start_date_str or '',
            'end_date':     end_date_str   or '',
            'total_count':  len(results),
            'generated_at': timezone.now().isoformat(),
            'filters': {
                'status':           status_param,
                'practitioner_id':  practitioner_id,
                'branch_id':        branch_id,
            },
            'results': results,
            # ── Debug block (remove in production) ───────────────────────────
            '_debug': {
                'branch_ids':                   all_branch_ids,
                'target_statuses':              target_statuses,
                'total_appointments_in_range':  total_in_range,
                'skipped_invoiced':             skipped_invoiced,
                'result_count':                 len(results),
            },
        }, None

    def get(self, request):
        data, err = self._get_data(request)
        if err:
            return err
        return Response(data)
    


class UninvoicedBookingsPrintView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        base_view = UninvoicedBookingsView()
        base_view.request = request
        data, err = base_view._get_data(request)
        if err:
            return err

        results = data['results']
        today   = __import__('datetime').date.today()

        overdue_count    = sum(1 for r in results if (r['days_since_completed'] or 0) > 7)
        this_week_count  = sum(1 for r in results if r['days_since_completed'] is not None and (r['days_since_completed'] or 0) <= 7)
        no_invoice_count = sum(1 for r in results if r['invoice_status'] is None)
        draft_only_count = sum(1 for r in results if r['invoice_status'] == 'DRAFT')

        practitioners = sorted({r['practitioner_name'] for r in results if r['practitioner_name']})
        branches      = sorted({r['branch_name'] for r in results if r['branch_name']})

        data['summary'] = {
            'overdue_count':    overdue_count,
            'this_week_count':  this_week_count,
            'no_invoice_count': no_invoice_count,
            'draft_only_count': draft_only_count,
            'practitioners':    practitioners,
            'branches':         branches,
        }

        return Response(data)