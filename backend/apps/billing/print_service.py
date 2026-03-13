"""
Helpers for the Print Appointments feature.
Builds a structured, print-ready data payload from a filtered
Appointment queryset — no PDF generation at this layer.
"""
from django.db.models import QuerySet, Count


def build_print_payload(queryset: QuerySet) -> dict:
    """
    Given a filtered & ordered Appointment queryset, return a
    dict that the frontend can use to render / print the list.
    """
    appointments = []
    for appt in queryset.select_related(
        'patient', 'practitioner__user', 'clinic', 'location'
    ):
        appointments.append(_serialize_appointment(appt))

    status_counts = (
        queryset.values('status')
        .annotate(count=Count('id'))
        .order_by('status')
    )
    by_status = {row['status']: row['count'] for row in status_counts}

    practitioner_counts = (
        queryset.values('practitioner__user__first_name',
                        'practitioner__user__last_name')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
    by_practitioner = {}
    for row in practitioner_counts:
        first = row.get('practitioner__user__first_name') or ''
        last  = row.get('practitioner__user__last_name')  or ''
        name  = f"{first} {last}".strip() or 'Unassigned'
        by_practitioner[name] = row['count']

    branch_counts = (
        queryset.values('clinic__name')
        .annotate(count=Count('id'))
        .order_by('clinic__name')
    )
    by_branch = {row['clinic__name']: row['count'] for row in branch_counts}

    return {
        'total':            queryset.count(),
        'by_status':        by_status,
        'by_practitioner':  by_practitioner,
        'by_branch':        by_branch,
        'appointments':     appointments,
    }


def _serialize_appointment(appt) -> dict:
    """Flat dict for a single appointment row."""
    practitioner_name = 'Unassigned'
    if appt.practitioner and appt.practitioner.user:
        practitioner_name = appt.practitioner.user.get_full_name()

    has_invoice = appt.billing_invoices.filter(is_deleted=False).exists()

    return {
        'id':               appt.id,
        'date':             str(appt.date),
        'start_time':       appt.start_time.strftime('%H:%M'),
        'end_time':         appt.end_time.strftime('%H:%M'),
        'duration_minutes': appt.duration_minutes,
        'status':           appt.status,
        'status_display':   appt.get_status_display(),
        'appointment_type': appt.appointment_type,
        'appointment_type_display': appt.get_appointment_type_display(),

        'patient_id':       appt.patient_id,
        'patient_name':     appt.patient.get_full_name(),
        'patient_number':   appt.patient.patient_number,

        'practitioner_id':   appt.practitioner_id,
        'practitioner_name': practitioner_name,

        'clinic_id':         appt.clinic_id,
        'clinic_name':       appt.clinic.name if appt.clinic else '',
        'location_name':     appt.location.name if appt.location else '',

        'chief_complaint':   appt.chief_complaint,
        'has_invoice':       has_invoice,
    }