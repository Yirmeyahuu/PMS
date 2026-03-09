"""
Bulk Invoicing Service
======================
Extracts the heavy lifting out of InvoiceBatchViewSet.create_bulk so it can
be reused, tested, or called from management commands.

Public API
----------
run_bulk_invoice(params, user, main_clinic)  →  InvoiceBatch
preview_bulk_invoice(params, user, main_clinic)  →  dict
"""
from __future__ import annotations

import logging
from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.appointments.models import Appointment
from .models import Invoice, InvoiceItem, InvoiceBatch

logger = logging.getLogger(__name__)


# ── helpers ───────────────────────────────────────────────────────────────────

def _resolve_target_ids(params: dict, main_clinic) -> list[int]:
    """Return the branch IDs that should be invoiced."""
    all_branch_ids = list(
        main_clinic.get_all_branches().values_list('id', flat=True)
    )
    requested = params.get('clinic_ids') or []
    if requested:
        return [i for i in requested if i in all_branch_ids]
    return all_branch_ids


def _build_appointment_qs(params: dict, target_ids: list[int]):
    """Return a filtered + ordered Appointment queryset."""
    qs = (
        Appointment.objects
        .filter(
            clinic_id__in=target_ids,
            date__gte=params['date_from'],
            date__lte=params['date_to'],
            status__in=params.get('status_filter', ['COMPLETED']),
            is_deleted=False,
            patient__is_archived=False,
        )
        .select_related('patient', 'clinic', 'practitioner__user')
        .order_by('date', 'start_time')
    )

    if params.get('skip_existing', True):
        qs = qs.filter(billing_invoices__isnull=True)

    return qs


def _create_invoice_for_appointment(
    appt: Appointment,
    invoice_date,
    due_date,
    discount_percent,
    tax_percent,
    bulk_batch: InvoiceBatch,
    user,
) -> Invoice:
    """Create one Invoice + one default InvoiceItem for the appointment."""
    description = appt.get_appointment_type_display()
    unit_price  = 0

    if appt.practitioner and hasattr(appt.practitioner, 'consultation_fee'):
        unit_price = appt.practitioner.consultation_fee or 0

    invoice = Invoice.objects.create(
        clinic           = appt.clinic,
        patient          = appt.patient,
        appointment      = appt,
        invoice_date     = invoice_date,
        due_date         = due_date,
        discount_percent = discount_percent,
        tax_percent      = tax_percent,
        bulk_batch       = bulk_batch,
        created_by       = user,
        status           = 'DRAFT',
    )

    InvoiceItem.objects.create(
        invoice     = invoice,
        description = description,
        quantity    = 1,
        unit_price  = unit_price,
    )

    invoice.update_totals()
    return invoice


# ── public API ────────────────────────────────────────────────────────────────

def preview_bulk_invoice(params: dict, user, main_clinic) -> dict:
    """
    Dry-run: returns a preview of appointments that WOULD be invoiced.
    No DB writes except reading.

    Returns:
        {
            "dry_run": True,
            "total_appointments": int,
            "preview": [ { appointment snapshot }, ... ],
            "preview_capped_at": 100,
        }
    """
    target_ids = _resolve_target_ids(params, main_clinic)
    if not target_ids:
        return {
            'dry_run':            True,
            'total_appointments': 0,
            'preview':            [],
            'preview_capped_at':  100,
            'error':              'No valid clinic IDs found.',
        }

    appt_qs            = _build_appointment_qs(params, target_ids)
    total_appointments = appt_qs.count()

    preview = [
        {
            'appointment_id':          a.id,
            'date':                    str(a.date),
            'start_time':              a.start_time.strftime('%H:%M'),
            'patient_name':            a.patient.get_full_name(),
            'patient_number':          a.patient.patient_number,
            'clinic_name':             a.clinic.name,
            'practitioner':            (
                a.practitioner.user.get_full_name()
                if a.practitioner else 'Unassigned'
            ),
            'appointment_type':        a.get_appointment_type_display(),
            'estimated_unit_price':    (
                float(a.practitioner.consultation_fee)
                if a.practitioner and hasattr(a.practitioner, 'consultation_fee')
                   and a.practitioner.consultation_fee
                else 0
            ),
        }
        for a in appt_qs[:100]
    ]

    return {
        'dry_run':            True,
        'total_appointments': total_appointments,
        'preview':            preview,
        'preview_capped_at':  100,
    }


def run_bulk_invoice(params: dict, user, main_clinic) -> InvoiceBatch:
    """
    Execute the bulk invoice operation.

    Creates one InvoiceBatch, then iterates over matching appointments
    creating one Invoice + one default InvoiceItem per appointment.

    Each appointment is wrapped in its own atomic save so a single
    failure does not roll back the entire batch.

    Returns the saved InvoiceBatch instance.
    """
    target_ids = _resolve_target_ids(params, main_clinic)
    if not target_ids:
        raise ValueError('No valid clinic IDs found for this user.')

    appt_qs            = _build_appointment_qs(params, target_ids)
    total_appointments = appt_qs.count()

    invoice_date     = params.get('invoice_date') or timezone.now().date()
    due_date         = params.get('due_date')
    discount_percent = params.get('discount_percent', 0)
    tax_percent      = params.get('tax_percent', 0)

    # ── Create the batch record ───────────────────────────────────────────────
    batch = InvoiceBatch.objects.create(
        clinic             = main_clinic,
        created_by         = user,
        date_from          = params['date_from'],
        date_to            = params['date_to'],
        clinic_ids         = target_ids,
        filters_used       = {
            'status_filter':    params.get('status_filter', ['COMPLETED']),
            'skip_existing':    params.get('skip_existing', True),
            'discount_percent': str(discount_percent),
            'tax_percent':      str(tax_percent),
        },
        total_appointments = total_appointments,
        status             = 'PROCESSING',
    )

    created        = 0
    failed         = 0
    error_log: list[dict[str, Any]] = []
    total_invoiced = 0.0

    # ── Process each appointment individually ─────────────────────────────────
    for appt in appt_qs:
        try:
            with transaction.atomic():
                invoice = _create_invoice_for_appointment(
                    appt             = appt,
                    invoice_date     = invoice_date,
                    due_date         = due_date,
                    discount_percent = discount_percent,
                    tax_percent      = tax_percent,
                    bulk_batch       = batch,
                    user             = user,
                )
                total_invoiced += float(invoice.total_amount)
                created += 1

        except Exception as exc:
            failed += 1
            error_log.append({'appointment_id': appt.id, 'error': str(exc)})
            logger.error(
                "Bulk invoice failed for appointment %s: %s", appt.id, exc
            )

    # ── Finalise batch ────────────────────────────────────────────────────────
    batch.status                = 'COMPLETED' if failed == 0 else 'FAILED'
    batch.total_created         = created
    batch.total_skipped         = 0          # reserved for future use
    batch.total_failed          = failed
    batch.error_log             = error_log
    batch.total_invoiced_amount = total_invoiced
    batch.save()

    logger.info(
        "Bulk batch %s: created=%s failed=%s total=₱%s",
        batch.batch_number, created, failed, total_invoiced,
    )

    return batch