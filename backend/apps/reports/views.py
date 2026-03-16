import logging

from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Sum, Avg, Q, Prefetch
from django.utils import timezone
from datetime import date, datetime, timedelta

from .models import Report
from .serializers import ReportSerializer
from apps.appointments.models import Appointment
from apps.billing.models import Invoice, Payment
from apps.patients.models import Patient
from apps.records.models import ClinicalNote

logger = logging.getLogger(__name__)



# ─── Helpers ──────────────────────────────────────────────────────────────────

def _parse_date(value, fallback: date) -> date:
    if not value:
        return fallback
    try:
        return datetime.strptime(str(value), '%Y-%m-%d').date()
    except ValueError:
        return fallback


def _default_range():
    today = timezone.now().date()
    return today.replace(day=1), today


def _appointment_qs(clinic):
    return (
        Appointment.objects
        .filter(clinic=clinic, is_deleted=False)
        .select_related(
            'patient',
            'practitioner__user',
            'service',
            'branch',
        )
    )


def _serialize_appointment_base(appt) -> dict:
    today = timezone.now().date()
    return {
        'appointment_id':    appt.id,
        'date':              str(appt.date),
        'start_time':        str(appt.start_time),
        'end_time':          str(appt.end_time),
        'appointment_type':  appt.appointment_type,
        'status':            appt.status,
        'patient_id':        appt.patient_id,
        'patient_name':      appt.patient.get_full_name() if appt.patient else '',
        'patient_number':    appt.patient.patient_number if appt.patient else '',
        'practitioner_name': (
            appt.practitioner.user.get_full_name()
            if appt.practitioner and appt.practitioner.user
            else ''
        ),
        'service_name':  appt.service.name  if appt.service  else '',
        'branch_name':   appt.branch.name   if appt.branch   else None,
    }


# ─── ViewSet ──────────────────────────────────────────────────────────────────

class ReportViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for saved reports + live report-data endpoints.

    Live report endpoints (Administration tab):
        GET /reports/uninvoiced_bookings/
        GET /reports/cancellations/

    Live report endpoints (Clinic tab):
        GET /reports/clients_cases/
        GET /reports/clinical_notes/

    Print endpoints:
        GET /reports/uninvoiced_bookings/print/
        GET /reports/cancellations/print/
    """

    queryset = Report.objects.all().select_related('clinic', 'generated_by')
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['clinic', 'report_type', 'tab', 'start_date', 'end_date']
    ordering_fields = ['created_at', 'start_date']

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(clinic=user.clinic)

    # ── Shared date-range parsing ──────────────────────────────────────────────

    def _get_date_range(self, request):
        month_start, today = _default_range()
        start = _parse_date(request.query_params.get('start_date'), month_start)
        end   = _parse_date(request.query_params.get('end_date'),   today)
        if start > end:
            start, end = end, start
        return start, end

    def _get_clinic_and_branch_ids(self, request):
        """
        Returns the user's clinic and all applicable branch IDs.
        Respects optional clinic_branch and practitioner_id filters.
        """
        user        = request.user
        clinic      = user.clinic
        main_clinic = clinic.main_clinic if hasattr(clinic, 'main_clinic') else clinic
        all_branch_ids = list(
            main_clinic.get_all_branches().values_list('id', flat=True)
        )
        return clinic, main_clinic, all_branch_ids

    # ══════════════════════════════════════════════════════════════════════════
    #  ADMINISTRATION TAB
    # ══════════════════════════════════════════════════════════════════════════

    # ── 1. Uninvoiced Bookings ─────────────────────────────────────────────────

    def _build_uninvoiced_data(self, request):
        clinic, main_clinic, all_branch_ids = self._get_clinic_and_branch_ids(request)
        start, end = self._get_date_range(request)

        # ── DEBUG ─────────────────────────────────────────────────────────────
        logger.debug(
            "[UNINVOICED] clinic=%s | main_clinic=%s | branch_ids=%s | range=%s → %s",
            clinic, main_clinic, all_branch_ids, start, end
        )

        # Base queryset
        qs = (
            Appointment.objects
            .filter(
                clinic_id__in=all_branch_ids,
                is_deleted=False,
                patient__is_archived=False,
                date__range=[start, end],
            )
            .select_related(
                'patient',
                'practitioner__user',
                'clinic',
            )
            .prefetch_related('billing_invoices')
        )

        status_filter = request.query_params.get('status', 'COMPLETED')
        if status_filter == 'ALL':
            pass
        else:
            qs = qs.filter(status=status_filter)

        # ── DEBUG ─────────────────────────────────────────────────────────────
        logger.debug(
            "[UNINVOICED] status_filter=%s | appointments_in_range=%s",
            status_filter, qs.count()
        )

        practitioner_id = request.query_params.get('practitioner_id')
        branch_id       = request.query_params.get('branch_id')
        if practitioner_id:
            try:
                qs = qs.filter(practitioner_id=int(practitioner_id))
            except (ValueError, TypeError):
                pass
        if branch_id:
            try:
                qs = qs.filter(clinic_id=int(branch_id))
            except (ValueError, TypeError):
                pass

        today = timezone.now().date()
        items = []

        # ── DEBUG: count totals before invoice filter ──────────────────────
        total_appointments = qs.count()
        skipped_invoiced   = 0
        skipped_no_relation = 0

        for appt in qs.order_by('date', 'start_time'):
            all_inv = list(appt.billing_invoices.all())

            active_invoices = [
                inv for inv in all_inv
                if not getattr(inv, 'is_deleted', False)
            ]

            # ── UPDATED LOGIC ──────────────────────────────────────────────
            # Consider an appointment "properly invoiced" ONLY if it has
            # at least one invoice that is PAID, PARTIALLY_PAID, or OVERDUE.
            # DRAFT and PENDING invoices still count as "uninvoiced" since
            # no payment has been collected yet.
            INVOICED_STATUSES = ('PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED')

            has_real_invoice = any(
                inv.status in INVOICED_STATUSES
                for inv in active_invoices
            )

            if has_real_invoice:
                skipped_invoiced += 1
                logger.debug(
                    "[UNINVOICED] SKIP appt_id=%s — has paid/overdue invoice(s): %s",
                    appt.id,
                    [f"{inv.invoice_number}({inv.status})" for inv in active_invoices],
                )
                continue

            # Determine invoice_status to show:
            # Priority: PENDING > DRAFT > None
            invoice_status = None
            invoice_number = None
            if active_invoices:
                # Sort so PENDING shows before DRAFT
                priority = {'PENDING': 0, 'DRAFT': 1}
                sorted_inv = sorted(
                    active_invoices,
                    key=lambda i: priority.get(i.status, 99)
                )
                invoice_status = sorted_inv[0].status
                invoice_number = sorted_inv[0].invoice_number

            items.append({
                'appointment_id':       appt.id,
                'date':                 str(appt.date),
                'start_time':           str(appt.start_time),
                'end_time':             str(appt.end_time),
                'appointment_type':     appt.appointment_type,
                'appointment_status':   appt.status,
                'patient_id':           appt.patient_id,
                'patient_name':         appt.patient.get_full_name() if appt.patient else '',
                'patient_number':       appt.patient.patient_number if appt.patient else '',
                'practitioner_name':    (
                    appt.practitioner.user.get_full_name()
                    if appt.practitioner and appt.practitioner.user else ''
                ),
                'branch_name':          appt.clinic.name if appt.clinic else None,
                'days_since_completed': (today - appt.date).days if appt.date else None,
                'invoice_status':       invoice_status,
                'invoice_number':       invoice_number,
            })

        # ── DEBUG SUMMARY ──────────────────────────────────────────────────
        logger.debug(
            "[UNINVOICED] SUMMARY → total_appts=%s | skipped_invoiced=%s | "
            "uninvoiced_items=%s",
            total_appointments, skipped_invoiced, len(items)
        )

        # ── CRITICAL DEBUG: if 0 results, log why ─────────────────────────
        if len(items) == 0:
            logger.warning(
                "[UNINVOICED] ZERO RESULTS — "
                "branch_ids=%s | start=%s | end=%s | status_filter=%s | "
                "total_appointments_in_range=%s | skipped_because_invoiced=%s",
                all_branch_ids, start, end, status_filter,
                total_appointments, skipped_invoiced
            )

            # Extra: check if there ARE any appointments at all for this clinic
            any_appts = Appointment.objects.filter(
                clinic_id__in=all_branch_ids,
                is_deleted=False,
            ).count()
            logger.warning(
                "[UNINVOICED] Total clinic appointments (all time, no date filter)=%s",
                any_appts
            )

            # Check if patient__is_archived filter is killing results
            without_archived_filter = Appointment.objects.filter(
                clinic_id__in=all_branch_ids,
                is_deleted=False,
                date__range=[start, end],
                status=status_filter,
            ).count()
            logger.warning(
                "[UNINVOICED] Without is_archived filter: count=%s",
                without_archived_filter
            )

        meta = {
            'report_type':  'UNINVOICED_BOOKINGS',
            'tab':          'ADMINISTRATION',
            'start_date':   str(start),
            'end_date':     str(end),
            'total_count':  len(items),
            'generated_at': timezone.now().isoformat(),
            'filters': {
                'status':           status_filter,
                'practitioner_id':  practitioner_id,
                'branch_id':        branch_id,
            },
            # ── DEBUG field — remove after debugging ──────────────────────
            '_debug': {
                'total_appointments_in_range': total_appointments,
                'skipped_invoiced':            skipped_invoiced,
                'branch_ids':                  all_branch_ids,
            }
        }
        return items, meta

    @action(detail=False, methods=['get'], url_path='uninvoiced_bookings')
    def uninvoiced_bookings(self, request):
        """
        GET /reports/uninvoiced_bookings/

        Query params:
            start_date      (YYYY-MM-DD)  default: first day of current month
            end_date        (YYYY-MM-DD)  default: today
            status          (str)         default: COMPLETED  — use ALL for any status
            practitioner_id (int)         optional
            branch_id       (int)         optional
        """
        items, meta = self._build_uninvoiced_data(request)
        return Response({**meta, 'results': items})

    @action(detail=False, methods=['get'], url_path='uninvoiced_bookings/print')
    def uninvoiced_bookings_print(self, request):
        """
        GET /reports/uninvoiced_bookings/print/
        Returns a print-ready payload (same data, extra summary block).
        """
        items, meta = self._build_uninvoiced_data(request)

        # Summary breakdowns for the print header
        overdue_count    = sum(1 for i in items if (i['days_since_completed'] or 0) > 7)
        this_week_count  = sum(1 for i in items if (i['days_since_completed'] or 0) <= 7)
        no_invoice_count = sum(1 for i in items if i['invoice_status'] is None)
        draft_count      = sum(1 for i in items if i['invoice_status'] == 'DRAFT')

        summary = {
            'overdue_count':    overdue_count,
            'this_week_count':  this_week_count,
            'no_invoice_count': no_invoice_count,
            'draft_only_count': draft_count,
            'practitioners':    list({i['practitioner_name'] for i in items if i['practitioner_name']}),
            'branches':         list({i['branch_name'] for i in items if i['branch_name']}),
        }

        return Response({**meta, 'summary': summary, 'results': items})

    # ── 2. Cancellations ──────────────────────────────────────────────────────

    def _build_cancellations_data(self, request):
        """
        Core logic for cancellations — shared between JSON and print endpoints.

        Returns a tuple: (items: list, meta: dict)
        """
        clinic, main_clinic, all_branch_ids = self._get_clinic_and_branch_ids(request)
        start, end = self._get_date_range(request)

        include_no_show_param = request.query_params.get('include_no_show', 'true').lower()
        include_no_show       = include_no_show_param not in ('false', '0', 'no')

        cancel_statuses = ['CANCELLED']
        if include_no_show:
            cancel_statuses.append('NO_SHOW')

        qs = (
            Appointment.objects
            .filter(
                clinic_id__in=all_branch_ids,
                is_deleted=False,
                patient__is_archived=False,
                status__in=cancel_statuses,
                date__range=[start, end],
            )
            .select_related(
                'patient',
                'practitioner__user',
                'clinic',
                'cancelled_by',
            )
        )

        # Optional filters
        practitioner_id = request.query_params.get('practitioner_id')
        branch_id       = request.query_params.get('branch_id')
        if practitioner_id:
            try:
                qs = qs.filter(practitioner_id=int(practitioner_id))
            except (ValueError, TypeError):
                pass
        if branch_id:
            try:
                qs = qs.filter(clinic_id=int(branch_id))
            except (ValueError, TypeError):
                pass

        items = []
        for appt in qs.order_by('date', 'start_time'):
            cancelled_by_name = None
            if appt.cancelled_by:
                cancelled_by_name = appt.cancelled_by.get_full_name()

            items.append({
                'appointment_id':    appt.id,
                'date':              str(appt.date),
                'start_time':        str(appt.start_time),
                'end_time':          str(appt.end_time),
                'appointment_type':  appt.appointment_type,
                'status':            appt.status,
                'patient_id':        appt.patient_id,
                'patient_name':      appt.patient.get_full_name() if appt.patient else '',
                'patient_number':    appt.patient.patient_number if appt.patient else '',
                'practitioner_name': (
                    appt.practitioner.user.get_full_name()
                    if appt.practitioner and appt.practitioner.user else ''
                ),
                'branch_name':       appt.clinic.name if appt.clinic else None,
                'cancelled_at':      appt.cancelled_at.isoformat() if appt.cancelled_at else None,
                'cancelled_by':      cancelled_by_name,
                'reason':            appt.cancellation_reason or None,
            })

        cancelled_count = sum(1 for i in items if i['status'] == 'CANCELLED')
        no_show_count   = sum(1 for i in items if i['status'] == 'NO_SHOW')

        meta = {
            'report_type':       'CANCELLATIONS',
            'tab':               'ADMINISTRATION',
            'start_date':        str(start),
            'end_date':          str(end),
            'total_count':       len(items),
            'cancelled_count':   cancelled_count,
            'no_show_count':     no_show_count,
            'generated_at':      timezone.now().isoformat(),
            'filters': {
                'include_no_show': include_no_show,
                'practitioner_id': practitioner_id,
                'branch_id':       branch_id,
            }
        }
        return items, meta

    @action(detail=False, methods=['get'], url_path='cancellations')
    def cancellations(self, request):
        """
        GET /reports/cancellations/

        Query params:
            start_date      (YYYY-MM-DD)
            end_date        (YYYY-MM-DD)
            include_no_show (bool, default true)
            practitioner_id (int)
            branch_id       (int)
        """
        items, meta = self._build_cancellations_data(request)
        return Response({**meta, 'results': items})

    @action(detail=False, methods=['get'], url_path='cancellations/print')
    def cancellations_print(self, request):
        """
        GET /reports/cancellations/print/
        Returns a print-ready payload with extra summary block.
        """
        items, meta = self._build_cancellations_data(request)

        with_reason_count    = sum(1 for i in items if i['reason'])
        without_reason_count = sum(1 for i in items if not i['reason'])
        practitioners        = list({i['practitioner_name'] for i in items if i['practitioner_name']})
        branches             = list({i['branch_name'] for i in items if i['branch_name']})

        summary = {
            'with_reason_count':    with_reason_count,
            'without_reason_count': without_reason_count,
            'practitioners':        practitioners,
            'branches':             branches,
        }

        return Response({**meta, 'summary': summary, 'results': items})

    # ══════════════════════════════════════════════════════════════════════════
    #  CLINIC TAB
    # ══════════════════════════════════════════════════════════════════════════

    @action(detail=False, methods=['get'], url_path='clients_cases')
    def clients_cases(self, request):
        clinic, main_clinic, all_branch_ids = self._get_clinic_and_branch_ids(request)
        start, end = self._get_date_range(request)
        today      = timezone.now().date()

        new_only_param = request.query_params.get('new_only', 'false').lower()
        new_only       = new_only_param in ('true', '1', 'yes')

        patients_qs = (
            Patient.objects
            .filter(clinic=clinic, is_deleted=False)
            .prefetch_related(
                Prefetch(
                    'appointments',
                    queryset=(
                        Appointment.objects
                        .filter(clinic_id__in=all_branch_ids, is_deleted=False)
                        .order_by('date', 'start_time')
                    ),
                    to_attr='all_appointments',
                )
            )
            .order_by('last_name', 'first_name')
        )

        if new_only:
            patients_qs = patients_qs.filter(created_at__date__range=[start, end])
        else:
            patients_qs = patients_qs.filter(
                Q(created_at__date__range=[start, end]) |
                Q(appointments__date__range=[start, end], appointments__is_deleted=False)
            ).distinct()

        items = []
        for patient in patients_qs:
            range_appts = [a for a in patient.all_appointments if start <= a.date <= end]
            upcoming_appts = [
                a for a in patient.all_appointments
                if a.date >= today and a.status in ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN')
            ]

            upcoming_list = []
            for appt in upcoming_appts[:10]:
                upcoming_list.append({
                    'appointment_id':    appt.id,
                    'date':              str(appt.date),
                    'start_time':        str(appt.start_time),
                    'appointment_type':  appt.appointment_type,
                    'status':            appt.status,
                    'practitioner_name': (
                        appt.practitioner.user.get_full_name()
                        if appt.practitioner and appt.practitioner.user else ''
                    ),
                    'service_name': appt.service.name if appt.service else '',
                })

            items.append({
                'patient_id':         patient.id,
                'patient_name':       patient.get_full_name(),
                'patient_number':     patient.patient_number,
                'gender':             patient.gender,
                'date_of_birth':      str(patient.date_of_birth) if patient.date_of_birth else None,
                'phone':              patient.phone or None,
                'email':              patient.email or None,
                'registered_on':      str(patient.created_at.date()),
                'is_new_this_period': start <= patient.created_at.date() <= end,
                'total_bookings':     len(patient.all_appointments),
                'range_bookings':     len(range_appts),
                'upcoming_bookings':  upcoming_list,
            })

        new_clients_count    = sum(1 for i in items if i['is_new_this_period'])
        total_range_bookings = sum(i['range_bookings'] for i in items)

        return Response({
            'report_type':          'CLIENTS_CASES',
            'tab':                  'CLINIC',
            'start_date':           str(start),
            'end_date':             str(end),
            'total_patients':       len(items),
            'new_clients_count':    new_clients_count,
            'total_range_bookings': total_range_bookings,
            'results':              items,
        })

    @action(detail=False, methods=['get'], url_path='clinical_notes')
    def clinical_notes(self, request):
        clinic, main_clinic, all_branch_ids = self._get_clinic_and_branch_ids(request)
        start, end = self._get_date_range(request)
        today      = timezone.now().date()

        include_unsigned_param = request.query_params.get('include_unsigned', 'false').lower()
        include_unsigned       = include_unsigned_param in ('true', '1', 'yes')

        qs = (
            Appointment.objects
            .filter(
                clinic_id__in=all_branch_ids,
                is_deleted=False,
                patient__is_archived=False,
                status='COMPLETED',
                date__range=[start, end],
            )
            .prefetch_related(
                Prefetch(
                    'clinical_note',
                    queryset=ClinicalNote.objects.filter(is_deleted=False),
                )
            )
        )

        practitioner_id = request.query_params.get('practitioner_id')
        if practitioner_id:
            try:
                qs = qs.filter(practitioner_id=int(practitioner_id))
            except (ValueError, TypeError):
                pass

        missing_items  = []
        unsigned_items = []

        for appt in qs.order_by('date', 'start_time'):
            try:
                note = appt.clinical_note
            except ClinicalNote.DoesNotExist:
                note = None

            days_since = (today - appt.date).days if appt.date else 0

            row = {
                'appointment_id':    appt.id,
                'date':              str(appt.date),
                'start_time':        str(appt.start_time),
                'end_time':          str(appt.end_time),
                'appointment_type':  appt.appointment_type,
                'status':            appt.status,
                'patient_id':        appt.patient_id,
                'patient_name':      appt.patient.get_full_name() if appt.patient else '',
                'patient_number':    appt.patient.patient_number if appt.patient else '',
                'practitioner_name': (
                    appt.practitioner.user.get_full_name()
                    if appt.practitioner and appt.practitioner.user else ''
                ),
                'service_name':      appt.service.name if appt.service else '',
                'branch_name':       appt.branch.name  if appt.branch  else None,
                'days_since':        days_since,
            }

            if note is None:
                row['note_status'] = 'MISSING'
                missing_items.append(row)
            elif not note.is_signed:
                row['note_status'] = 'UNSIGNED_DRAFT'
                row['note_id']     = note.id
                unsigned_items.append(row)

        results = missing_items[:]
        if include_unsigned:
            results += unsigned_items

        results.sort(key=lambda x: (x['date'], x['start_time']), reverse=True)

        return Response({
            'report_type':          'CLINICAL_NOTES',
            'tab':                  'CLINIC',
            'start_date':           str(start),
            'end_date':             str(end),
            'total_count':          len(results),
            'missing_note_count':   len(missing_items),
            'unsigned_note_count':  len(unsigned_items),
            'results':              results,
        })

    # ══════════════════════════════════════════════════════════════════════════
    #  LEGACY SUMMARY ENDPOINTS
    # ══════════════════════════════════════════════════════════════════════════

    @action(detail=False, methods=['get'])
    def appointments_summary(self, request):
        clinic     = request.user.clinic
        start, end = self._get_date_range(request)
        appointments = Appointment.objects.filter(
            clinic=clinic, date__range=[start, end], is_deleted=False
        )
        summary = {
            'total_appointments': appointments.count(),
            'completed':          appointments.filter(status='COMPLETED').count(),
            'cancelled':          appointments.filter(status='CANCELLED').count(),
            'no_show':            appointments.filter(status='NO_SHOW').count(),
            'by_type':            list(appointments.values('appointment_type').annotate(count=Count('id'))),
            'by_practitioner':    list(
                appointments
                .values('practitioner__user__first_name', 'practitioner__user__last_name')
                .annotate(count=Count('id'))
            ),
        }
        return Response(summary)

    @action(detail=False, methods=['get'])
    def revenue_summary(self, request):
        clinic     = request.user.clinic
        start, end = self._get_date_range(request)
        invoices = Invoice.objects.filter(
            clinic=clinic, invoice_date__range=[start, end], is_deleted=False
        )
        payments = Payment.objects.filter(
            invoice__clinic=clinic, payment_date__range=[start, end]
        )
        summary = {
            'total_invoiced':    invoices.aggregate(total=Sum('total_amount'))['total'] or 0,
            'total_paid':        payments.aggregate(total=Sum('amount'))['total'] or 0,
            'outstanding':       invoices.aggregate(total=Sum('balance_due'))['total'] or 0,
            'by_payment_method': list(payments.values('payment_method').annotate(total=Sum('amount'))),
            'invoice_count':     invoices.count(),
            'payment_count':     payments.count(),
        }
        return Response(summary)

    @action(detail=False, methods=['get'])
    def patient_statistics(self, request):
        clinic   = request.user.clinic
        patients = Patient.objects.filter(clinic=clinic, is_deleted=False)
        summary  = {
            'total_patients':  patients.count(),
            'active_patients': patients.filter(is_active=True).count(),
            'new_this_month':  patients.filter(
                created_at__gte=timezone.now().replace(day=1)
            ).count(),
            'by_gender': list(patients.values('gender').annotate(count=Count('id'))),
        }
        return Response(summary)

    @action(detail=False, methods=['get'])
    def practitioner_performance(self, request):
        from apps.clinics.models import Practitioner
        clinic, main_clinic, all_branch_ids = self._get_clinic_and_branch_ids(request)
        start, end = self._get_date_range(request)
        practitioners = Practitioner.objects.filter(
            clinic_id__in=all_branch_ids, is_deleted=False
        )
        performance = []
        for practitioner in practitioners:
            appts = Appointment.objects.filter(
                practitioner=practitioner, date__range=[start, end], is_deleted=False
            )
            performance.append({
                'practitioner':       practitioner.user.get_full_name(),
                'total_appointments': appts.count(),
                'completed':          appts.filter(status='COMPLETED').count(),
                'cancelled':          appts.filter(status='CANCELLED').count(),
                'revenue':            Invoice.objects.filter(
                    appointment__practitioner=practitioner,
                    invoice_date__range=[start, end],
                    is_deleted=False,
                ).aggregate(total=Sum('total_amount'))['total'] or 0,
            })
        return Response(performance)

    @action(detail=False, methods=['get'])
    def dashboard_metrics(self, request):
        clinic, main_clinic, all_branch_ids = self._get_clinic_and_branch_ids(request)
        today       = timezone.now().date()
        month_start = today.replace(day=1)

        today_appointments = Appointment.objects.filter(
            clinic_id__in=all_branch_ids, date=today, is_deleted=False
        )
        month_revenue = Invoice.objects.filter(
            clinic_id__in=all_branch_ids, invoice_date__gte=month_start, is_deleted=False
        ).aggregate(total=Sum('total_amount'))['total'] or 0

        metrics = {
            'today_appointments': today_appointments.count(),
            'today_completed':    today_appointments.filter(status='COMPLETED').count(),
            'today_pending':      today_appointments.filter(
                status__in=['SCHEDULED', 'CONFIRMED']
            ).count(),
            'month_revenue':     float(month_revenue),
            'active_patients':   Patient.objects.filter(
                clinic=clinic, is_active=True, is_deleted=False
            ).count(),
            'pending_invoices':  Invoice.objects.filter(
                clinic_id__in=all_branch_ids, status='PENDING', is_deleted=False
            ).count(),
        }
        return Response(metrics)