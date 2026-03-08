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


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _parse_date(value, fallback: date) -> date:
    """Safely parse a query param date string; fall back to `fallback`."""
    if not value:
        return fallback
    try:
        return datetime.strptime(str(value), '%Y-%m-%d').date()
    except ValueError:
        return fallback


def _default_range():
    """Default: first day of current month → today."""
    today = timezone.now().date()
    return today.replace(day=1), today


def _appointment_qs(clinic):
    """Base non-deleted appointment queryset for a clinic."""
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
    """Common flat dict used across multiple report items."""
    today = timezone.now().date()
    return {
        'appointment_id':    appt.id,
        'date':              appt.date,
        'start_time':        appt.start_time,
        'end_time':          appt.end_time,
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

    Legacy summary endpoints (kept for dashboard compatibility):
        GET /reports/appointments_summary/
        GET /reports/revenue_summary/
        GET /reports/patient_statistics/
        GET /reports/practitioner_performance/
        GET /reports/dashboard_metrics/
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

    # ══════════════════════════════════════════════════════════════════════════
    #  ADMINISTRATION TAB
    # ══════════════════════════════════════════════════════════════════════════

    # ── 1. Uninvoiced Bookings ─────────────────────────────────────────────────

    @action(detail=False, methods=['get'], url_path='uninvoiced_bookings')
    def uninvoiced_bookings(self, request):
        """
        Returns COMPLETED appointments that have no associated Invoice.

        Query params:
            start_date  (YYYY-MM-DD)  default: first day of current month
            end_date    (YYYY-MM-DD)  default: today
            practitioner_id (int)     optional filter
            branch_id       (int)     optional filter
        """
        clinic      = request.user.clinic
        start, end  = self._get_date_range(request)

        qs = (
            _appointment_qs(clinic)
            .filter(
                status='COMPLETED',
                date__range=[start, end],
            )
            # Exclude appointments that already have an invoice
            .exclude(invoice__isnull=False)
        )

        # Optional extra filters
        practitioner_id = request.query_params.get('practitioner_id')
        branch_id       = request.query_params.get('branch_id')
        if practitioner_id:
            qs = qs.filter(practitioner_id=practitioner_id)
        if branch_id:
            qs = qs.filter(branch_id=branch_id)

        today = timezone.now().date()
        items = []
        for appt in qs.order_by('date', 'start_time'):
            row = _serialize_appointment_base(appt)
            row['days_since_completed'] = (today - appt.date).days if appt.date else None
            items.append(row)

        return Response({
            'report_type':  'UNINVOICED_BOOKINGS',
            'tab':          'ADMINISTRATION',
            'start_date':   start,
            'end_date':     end,
            'total_count':  len(items),
            'results':      items,
        })

    # ── 2. Cancellations ──────────────────────────────────────────────────────

    @action(detail=False, methods=['get'], url_path='cancellations')
    def cancellations(self, request):
        """
        Returns CANCELLED and NO_SHOW appointments in the date range.

        Query params:
            start_date      (YYYY-MM-DD)
            end_date        (YYYY-MM-DD)
            include_no_show (bool, default true)
            practitioner_id (int)
            branch_id       (int)
        """
        clinic     = request.user.clinic
        start, end = self._get_date_range(request)

        include_no_show_param = request.query_params.get('include_no_show', 'true').lower()
        include_no_show       = include_no_show_param not in ('false', '0', 'no')

        cancel_statuses = ['CANCELLED']
        if include_no_show:
            cancel_statuses.append('NO_SHOW')

        qs = (
            _appointment_qs(clinic)
            .filter(
                status__in=cancel_statuses,
                date__range=[start, end],
            )
        )

        practitioner_id = request.query_params.get('practitioner_id')
        branch_id       = request.query_params.get('branch_id')
        if practitioner_id:
            qs = qs.filter(practitioner_id=practitioner_id)
        if branch_id:
            qs = qs.filter(branch_id=branch_id)

        items = []
        for appt in qs.order_by('date', 'start_time'):
            row = _serialize_appointment_base(appt)
            row['cancelled_at'] = getattr(appt, 'cancelled_at', None)
            row['cancelled_by'] = getattr(appt, 'cancelled_by_name', None)
            row['reason']       = getattr(appt, 'cancellation_reason', None)
            items.append(row)

        # Summary breakdown
        cancelled_count = sum(1 for i in items if i['status'] == 'CANCELLED')
        no_show_count   = sum(1 for i in items if i['status'] == 'NO_SHOW')

        return Response({
            'report_type':       'CANCELLATIONS',
            'tab':               'ADMINISTRATION',
            'start_date':        start,
            'end_date':          end,
            'total_count':       len(items),
            'cancelled_count':   cancelled_count,
            'no_show_count':     no_show_count,
            'results':           items,
        })

    # ══════════════════════════════════════════════════════════════════════════
    #  CLINIC TAB
    # ══════════════════════════════════════════════════════════════════════════

    # ── 3. Clients & Cases ────────────────────────────────────────────────────

    @action(detail=False, methods=['get'], url_path='clients_cases')
    def clients_cases(self, request):
        """
        Shows new Client registrations and Case (appointment) Bookings in the
        date range, and lists upcoming bookings for each patient.

        Query params:
            start_date  (YYYY-MM-DD)
            end_date    (YYYY-MM-DD)
            new_only    (bool, default false) — only show patients registered
                        within the date range
        """
        clinic     = request.user.clinic
        start, end = self._get_date_range(request)
        today      = timezone.now().date()

        new_only_param = request.query_params.get('new_only', 'false').lower()
        new_only       = new_only_param in ('true', '1', 'yes')

        # Patients for this clinic (not archived, not deleted)
        patients_qs = (
            Patient.objects
            .filter(clinic=clinic, is_deleted=False)
            .prefetch_related(
                Prefetch(
                    'appointments',
                    queryset=_appointment_qs(clinic).order_by('date', 'start_time'),
                    to_attr='all_appointments',
                )
            )
            .order_by('last_name', 'first_name')
        )

        if new_only:
            patients_qs = patients_qs.filter(
                created_at__date__range=[start, end]
            )
        else:
            # Patients who either registered OR had an appointment in the range
            patients_qs = patients_qs.filter(
                Q(created_at__date__range=[start, end]) |
                Q(appointments__date__range=[start, end],
                  appointments__is_deleted=False)
            ).distinct()

        items = []
        for patient in patients_qs:
            # Bookings within the date range
            range_appts = [
                a for a in patient.all_appointments
                if start <= a.date <= end
            ]
            # Upcoming bookings (from today onwards)
            upcoming_appts = [
                a for a in patient.all_appointments
                if a.date >= today and a.status in (
                    'SCHEDULED', 'CONFIRMED', 'CHECKED_IN'
                )
            ]

            upcoming_list = []
            for appt in upcoming_appts[:10]:   # cap at 10 per patient
                upcoming_list.append({
                    'appointment_id':    appt.id,
                    'date':              appt.date,
                    'start_time':        appt.start_time,
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
                'date_of_birth':      patient.date_of_birth,
                'phone':              patient.phone,
                'email':              patient.email,
                'registered_on':      patient.created_at.date(),
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
            'start_date':           start,
            'end_date':             end,
            'total_patients':       len(items),
            'new_clients_count':    new_clients_count,
            'total_range_bookings': total_range_bookings,
            'results':              items,
        })

    # ── 4. Clinical Notes ─────────────────────────────────────────────────────

    @action(detail=False, methods=['get'], url_path='clinical_notes')
    def clinical_notes(self, request):
        """
        Identifies COMPLETED appointments that have no finalised
        (is_signed=True) Clinical Note attached.

        Query params:
            start_date      (YYYY-MM-DD)
            end_date        (YYYY-MM-DD)
            practitioner_id (int)
            include_unsigned (bool, default false) — also include appointments
                             with a draft (unsigned) note
        """
        clinic     = request.user.clinic
        start, end = self._get_date_range(request)
        today      = timezone.now().date()

        include_unsigned_param = request.query_params.get('include_unsigned', 'false').lower()
        include_unsigned       = include_unsigned_param in ('true', '1', 'yes')

        # Base: completed appointments in range
        qs = (
            _appointment_qs(clinic)
            .filter(
                status='COMPLETED',
                date__range=[start, end],
            )
            .prefetch_related(
                Prefetch(
                    'clinical_note',   # OneToOne reverse
                    queryset=ClinicalNote.objects.filter(is_deleted=False),
                )
            )
        )

        practitioner_id = request.query_params.get('practitioner_id')
        if practitioner_id:
            qs = qs.filter(practitioner_id=practitioner_id)

        missing_items  = []   # No note at all
        unsigned_items = []   # Has draft note (unsigned)

        for appt in qs.order_by('date', 'start_time'):
            # Access the reverse OneToOne (returns None if missing)
            try:
                note = appt.clinical_note
            except ClinicalNote.DoesNotExist:
                note = None

            days_since = (today - appt.date).days if appt.date else 0

            row = _serialize_appointment_base(appt)
            row['days_since'] = days_since

            if note is None:
                row['note_status'] = 'MISSING'
                missing_items.append(row)
            elif not note.is_signed:
                row['note_status'] = 'UNSIGNED_DRAFT'
                row['note_id']     = note.id
                unsigned_items.append(row)
            # else: has a signed note — exclude from this report

        results = missing_items[:]
        if include_unsigned:
            results += unsigned_items

        # Sort combined list by date desc
        results.sort(key=lambda x: (x['date'], x['start_time']), reverse=True)

        return Response({
            'report_type':          'CLINICAL_NOTES',
            'tab':                  'CLINIC',
            'start_date':           start,
            'end_date':             end,
            'total_count':          len(results),
            'missing_note_count':   len(missing_items),
            'unsigned_note_count':  len(unsigned_items),
            'results':              results,
        })

    # ══════════════════════════════════════════════════════════════════════════
    #  LEGACY SUMMARY ENDPOINTS (kept for Dashboard compatibility)
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
            'by_type':            list(
                appointments.values('appointment_type').annotate(count=Count('id'))
            ),
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
            'total_invoiced':     invoices.aggregate(total=Sum('total_amount'))['total'] or 0,
            'total_paid':         payments.aggregate(total=Sum('amount'))['total'] or 0,
            'outstanding':        invoices.aggregate(total=Sum('balance_due'))['total'] or 0,
            'by_payment_method':  list(payments.values('payment_method').annotate(total=Sum('amount'))),
            'invoice_count':      invoices.count(),
            'payment_count':      payments.count(),
        }
        return Response(summary)

    @action(detail=False, methods=['get'])
    def patient_statistics(self, request):
        clinic   = request.user.clinic
        patients = Patient.objects.filter(clinic=clinic, is_deleted=False)
        summary  = {
            'total_patients':   patients.count(),
            'active_patients':  patients.filter(is_active=True).count(),
            'new_this_month':   patients.filter(
                created_at__gte=timezone.now().replace(day=1)
            ).count(),
            'by_gender': list(patients.values('gender').annotate(count=Count('id'))),
        }
        return Response(summary)

    @action(detail=False, methods=['get'])
    def practitioner_performance(self, request):
        from apps.clinics.models import Practitioner

        clinic     = request.user.clinic
        start, end = self._get_date_range(request)
        practitioners = Practitioner.objects.filter(clinic=clinic, is_deleted=False)

        performance = []
        for practitioner in practitioners:
            appts = Appointment.objects.filter(
                practitioner=practitioner,
                date__range=[start, end],
                is_deleted=False,
            )
            performance.append({
                'practitioner':        practitioner.user.get_full_name(),
                'total_appointments':  appts.count(),
                'completed':           appts.filter(status='COMPLETED').count(),
                'cancelled':           appts.filter(status='CANCELLED').count(),
                'revenue':             Invoice.objects.filter(
                    appointment__practitioner=practitioner,
                    invoice_date__range=[start, end],
                    is_deleted=False,
                ).aggregate(total=Sum('total_amount'))['total'] or 0,
            })
        return Response(performance)

    @action(detail=False, methods=['get'])
    def dashboard_metrics(self, request):
        clinic       = request.user.clinic
        today        = timezone.now().date()
        month_start  = today.replace(day=1)

        today_appointments = Appointment.objects.filter(
            clinic=clinic, date=today, is_deleted=False
        )
        month_revenue = Invoice.objects.filter(
            clinic=clinic, invoice_date__gte=month_start, is_deleted=False
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
                clinic=clinic, status='PENDING', is_deleted=False
            ).count(),
        }
        return Response(metrics)