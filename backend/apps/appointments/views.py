from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, timedelta
from .models import Appointment, PractitionerSchedule, AppointmentReminder
from .serializers import (
    AppointmentSerializer, PractitionerScheduleSerializer,
    AppointmentReminderSerializer, AppointmentPrintSerializer
)
from apps.patients.models import PortalBooking
from apps.appointments.email_service import send_appointment_reminder_email, send_bulk_reminders
from apps.appointments.sms_service import send_appointment_reminder_sms
from apps.appointments.reminder_service import send_all_reminders, send_bulk_all_reminders

from apps.appointments.filters import AppointmentFilter



class AppointmentViewSet(viewsets.ModelViewSet):
    """CRUD operations for appointments"""

    queryset = Appointment.objects.filter(is_deleted=False).select_related(
        'patient', 'practitioner__user', 'location', 'clinic', 'created_by', 'updated_by'
    )
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    # ✅ Remove 'clinic' from filterset_fields — we handle scoping manually in get_queryset
    filterset_fields = ['patient', 'practitioner', 'status', 'date', 'appointment_type']
    search_fields = ['patient__first_name', 'patient__last_name', 'chief_complaint']
    ordering_fields = ['date', 'start_time', 'created_at']

    def get_queryset(self):
        user = self.request.user
        queryset = self.queryset

        # ── 1. Scope to the user's clinic family ──────────────────────────
        if not user.clinic:
            return queryset.none()

        main_clinic = user.clinic.main_clinic
        all_branch_ids = list(
            main_clinic.get_all_branches().values_list('id', flat=True)
        )
        queryset = queryset.filter(clinic_id__in=all_branch_ids)

        # ── 2. ✅ Exclude appointments for archived patients ───────────────
        queryset = queryset.filter(patient__is_archived=False)

        # ── 3. Filter by specific clinic branch if provided ───────────────
        clinic_branch_param = self.request.query_params.get('clinic_branch')
        if clinic_branch_param:
            try:
                branch_id = int(clinic_branch_param)
                if branch_id in all_branch_ids:
                    queryset = queryset.filter(clinic_id=branch_id)
                else:
                    return queryset.none()
            except (ValueError, TypeError):
                pass

        # ── 4. Filter by practitioner if provided ─────────────────────────
        practitioner_param = self.request.query_params.get('practitioner')
        if practitioner_param:
            try:
                queryset = queryset.filter(practitioner_id=int(practitioner_param))
            except (ValueError, TypeError):
                pass

        # ── 5. Filter by date range ───────────────────────────────────────
        start_date = (
            self.request.query_params.get('start_date') or
            self.request.query_params.get('date_from')
        )
        end_date = (
            self.request.query_params.get('end_date') or
            self.request.query_params.get('date_to')
        )
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        return queryset

    @action(detail=False, methods=['get'])
    def portal_bookings(self, request):
        user = request.user

        if not user.clinic:
            return Response([])

        main_clinic = user.clinic.main_clinic
        all_branch_ids = list(
            main_clinic.get_all_branches().values_list('id', flat=True)
        )

        qs = PortalBooking.objects.filter(
            portal_link__clinic_id__in=all_branch_ids,
            status='PENDING',
        ).select_related('service', 'practitioner__user', 'portal_link__clinic')

        # ── Date range ────────────────────────────────────────────────────
        start_date = request.query_params.get('start_date')
        end_date   = request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(appointment_date__gte=start_date)
        if end_date:
            qs = qs.filter(appointment_date__lte=end_date)

        # ── Clinic branch filter ──────────────────────────────────────────
        clinic_branch_param = request.query_params.get('clinic_branch')
        if clinic_branch_param:
            try:
                branch_id = int(clinic_branch_param)
                if branch_id in all_branch_ids:
                    qs = qs.filter(portal_link__clinic_id=branch_id)
                else:
                    return Response([])
            except (ValueError, TypeError):
                pass

        # ── Practitioner filter ───────────────────────────────────────────
        practitioner_id = request.query_params.get('practitioner')
        if practitioner_id:
            try:
                qs = qs.filter(practitioner_id=int(practitioner_id))
            except (ValueError, TypeError):
                pass

        data = []
        for booking in qs:
            duration = booking.service.duration_minutes if booking.service else 60
            start_dt = datetime.combine(booking.appointment_date, booking.appointment_time)
            end_dt   = start_dt + timedelta(minutes=duration)

            data.append({
                'id':               booking.id,
                'type':             'portal_booking',
                'reference_number': booking.reference_number,
                'patient_name':     f"{booking.patient_first_name} {booking.patient_last_name}",
                'patient_email':    booking.patient_email,
                'patient_phone':    booking.patient_phone,
                'service_name':     booking.service.name if booking.service else '',
                'service_id':       booking.service_id,
                'practitioner_id':  booking.practitioner_id,
                'practitioner_name': (
                    booking.practitioner.user.get_full_name()
                    if booking.practitioner else 'Any Available'
                ),
                'date':             booking.appointment_date.isoformat(),
                'start_time':       booking.appointment_time.strftime('%H:%M'),
                'end_time':         end_dt.time().strftime('%H:%M'),
                'duration_minutes': duration,
                'status':           booking.status,
                'notes':            booking.notes,
            })

        return Response(data)

    @action(detail=False, methods=['patch'], url_path='portal_bookings/(?P<booking_id>[^/.]+)/update')
    def update_portal_booking(self, request, booking_id=None):
        """
        PATCH /api/appointments/portal_bookings/{id}/update/
        body: { "status": "CONFIRMED" | "CANCELLED" }
        """
        from django.shortcuts import get_object_or_404
        booking = get_object_or_404(PortalBooking, pk=booking_id)
        new_status = request.data.get('status')

        allowed = ['CONFIRMED', 'CANCELLED']
        if new_status not in allowed:
            return Response(
                {'detail': f'status must be one of: {", ".join(allowed)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        booking.status = new_status
        booking.save(update_fields=['status'])
        return Response({'id': booking.id, 'status': booking.status})

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        appointment = self.get_object()
        appointment.status = 'CONFIRMED'
        appointment.save()
        return Response({'status': 'appointment confirmed'})

    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        appointment = self.get_object()
        appointment.status = 'CHECKED_IN'
        appointment.save()
        return Response({'status': 'patient checked in'})

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        appointment = self.get_object()
        appointment.status = 'IN_PROGRESS'
        appointment.save()
        return Response({'status': 'appointment started'})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        appointment = self.get_object()
        appointment.status = 'COMPLETED'
        appointment.save()
        return Response({'status': 'appointment completed'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        appointment = self.get_object()
        appointment.status = 'CANCELLED'
        appointment.cancelled_by = request.user
        appointment.cancellation_reason = request.data.get('reason', '')
        appointment.cancelled_at = timezone.now()
        appointment.save()
        return Response({'status': 'appointment cancelled'})

    @action(detail=False, methods=['get'])
    def available_slots(self, request):
        """Get available 15-min time slots for a practitioner on a specific date"""
        from datetime import date as date_type, time, timedelta
        from apps.clinics.models import Practitioner

        CLINIC_START = 6 * 60
        CLINIC_END   = 21 * 60

        practitioner_id = request.query_params.get('practitioner')
        date_str        = request.query_params.get('date')
        service_id      = request.query_params.get('service')

        if not date_str:
            return Response(
                {'error': 'date parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)

        weekday = target_date.weekday()

        def time_to_minutes(t):
            return t.hour * 60 + t.minute

        def minutes_to_time(m):
            return time(m // 60, m % 60)

        candidate_slots: list = []

        if practitioner_id:
            try:
                practitioner = Practitioner.objects.get(pk=practitioner_id)
            except Practitioner.DoesNotExist:
                return Response({'error': 'Practitioner not found.'}, status=404)

            schedules = PractitionerSchedule.objects.filter(
                practitioner=practitioner,
                weekday=weekday,
                is_available=True,
            )

            if schedules.exists():
                for sched in schedules:
                    start_min = max(time_to_minutes(sched.start_time), CLINIC_START)
                    end_min   = min(time_to_minutes(sched.end_time),   CLINIC_END)
                    m = start_min
                    while m + 15 <= end_min:
                        candidate_slots.append(minutes_to_time(m))
                        m += 15
            else:
                m = CLINIC_START
                while m + 15 <= CLINIC_END:
                    candidate_slots.append(minutes_to_time(m))
                    m += 15
        else:
            m = CLINIC_START
            while m + 15 <= CLINIC_END:
                candidate_slots.append(minutes_to_time(m))
                m += 15

        duration = 15
        if service_id:
            try:
                from apps.clinics.models import ClinicService
                svc = ClinicService.objects.get(pk=service_id)
                duration = svc.duration_minutes
            except Exception:
                pass

        booked_qs = Appointment.objects.filter(
            date=target_date,
            status__in=['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'],
            is_deleted=False,
        )
        if practitioner_id:
            booked_qs = booked_qs.filter(practitioner_id=practitioner_id)

        booked_ranges = [(a.start_time, a.end_time) for a in booked_qs]

        available: list[str] = []
        for slot_time in candidate_slots:
            slot_start = time_to_minutes(slot_time)
            slot_end   = slot_start + duration

            if slot_end > CLINIC_END:
                continue

            overlaps = any(
                slot_start < time_to_minutes(end) and slot_end > time_to_minutes(start)
                for start, end in booked_ranges
            )
            if not overlaps:
                available.append(f"{slot_time.hour:02d}:{slot_time.minute:02d}")

        return Response({'slots': available})

    @action(detail=False, methods=['get'])
    def practitioners(self, request):
        """
        GET /api/appointments/practitioners/?clinic_branch=<id>
        """
        from apps.clinics.models import Practitioner

        user = request.user

        if not user.clinic:
            return Response({'practitioners': []})

        main_clinic = user.clinic.main_clinic
        all_branch_ids = list(
            main_clinic.get_all_branches().values_list('id', flat=True)
        )

        base_qs = Practitioner.objects.filter(
            clinic_id__in=all_branch_ids,
            user__is_active=True,
            user__is_deleted=False,
        ).select_related('user', 'clinic', 'user__clinic_branch')

        clinic_branch_param = request.query_params.get('clinic_branch')

        if clinic_branch_param:
            try:
                branch_id = int(clinic_branch_param)
            except ValueError:
                return Response({'practitioners': []})

            base_qs = base_qs.filter(
                Q(user__clinic_branch_id=branch_id) |
                Q(clinic_id=branch_id, user__clinic_branch__isnull=True)
            )

        practitioners_data = [
            {
                'id':                 p.id,
                'name':               p.user.get_full_name(),
                'email':              p.user.email,
                'specialization':     p.specialization or None,
                'clinic_id':          p.clinic_id,
                'clinic_name':        p.clinic.name if p.clinic else None,
                'clinic_branch_id':   p.user.clinic_branch_id,
                'clinic_branch_name': p.user.clinic_branch.name if p.user.clinic_branch else None,
            }
            for p in base_qs
        ]

        return Response({'practitioners': practitioners_data})
    
    @action(detail=True, methods=['post'], url_path='send_reminder')
    def send_reminder(self, request, pk=None):
        """
        POST /api/appointments/{id}/send_reminder/
        body: { "channel": "email" | "sms" | "both" }  — defaults to "both"
        """
        appointment = self.get_object()

        if appointment.status not in ['SCHEDULED', 'CONFIRMED']:
            return Response(
                {'detail': 'Reminders can only be sent for Scheduled or Confirmed appointments.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        channel = request.data.get('channel', 'both').lower()
        if channel not in ['email', 'sms', 'both']:
            return Response(
                {'detail': "channel must be 'email', 'sms', or 'both'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Reset reminder_sent so email_service doesn't skip resend
        appointment.reminder_sent = False
        appointment.save(update_fields=['reminder_sent'])

        result = {}

        if channel in ['email', 'both']:
            if not getattr(appointment.patient, 'email', None):
                result['email'] = {'success': False, 'message': 'Patient has no email address on file.'}
            else:
                ok, msg = send_appointment_reminder_email(appointment)
                result['email'] = {'success': ok, 'message': msg or 'Sent successfully.'}

        if channel in ['sms', 'both']:
            ok, msg = send_appointment_reminder_sms(appointment)
            result['sms'] = {'success': ok, 'message': msg or 'Sent successfully.'}

        any_success = any(v.get('success') for v in result.values())
        return Response(
            result,
            status=status.HTTP_200_OK if any_success else status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @action(detail=False, methods=['post'], url_path='send_bulk_reminders')
    def send_bulk_reminders_action(self, request):
        """
        POST /api/appointments/send_bulk_reminders/
        body: { "date": "YYYY-MM-DD", "channel": "email" | "sms" | "both" }
        Restricted to admin users.
        """
        if not request.user.is_admin:
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        date_str = request.data.get('date')
        channel  = request.data.get('channel', 'both').lower()

        if channel not in ['email', 'sms', 'both']:
            return Response(
                {'detail': "channel must be 'email', 'sms', or 'both'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if date_str:
            try:
                from datetime import datetime
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {'detail': 'Invalid date format. Use YYYY-MM-DD.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            from datetime import timedelta
            target_date = timezone.now().date() + timedelta(days=1)

        user   = request.user
        clinic = user.clinic
        if not clinic:
            return Response({'detail': 'User has no clinic.'}, status=400)

        main_clinic    = clinic.main_clinic
        all_branch_ids = list(main_clinic.get_all_branches().values_list('id', flat=True))

        qs = Appointment.objects.filter(
            clinic_id__in=all_branch_ids,
            date=target_date,
            status__in=['SCHEDULED', 'CONFIRMED'],
            reminder_sent=False,
            is_deleted=False,
        ).select_related('patient', 'practitioner__user', 'clinic', 'location')

        if channel == 'both':
            summary = send_bulk_all_reminders(qs)
        elif channel == 'email':
            from apps.appointments.email_service import send_bulk_reminders
            raw = send_bulk_reminders(qs)
            summary = {'email': raw}
        else:  # sms
            from apps.appointments.sms_service import send_bulk_sms_reminders
            raw = send_bulk_sms_reminders(qs)
            summary = {'sms': raw}

        return Response({'target_date': str(target_date), 'channel': channel, **summary})



class PractitionerScheduleViewSet(viewsets.ModelViewSet):
    """CRUD operations for practitioner schedules"""

    queryset = PractitionerSchedule.objects.all().select_related('practitioner__user', 'location')
    serializer_class = PractitionerScheduleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['practitioner', 'location', 'weekday', 'is_available']

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(practitioner__clinic=user.clinic)


class AppointmentReminderViewSet(viewsets.ReadOnlyModelViewSet):
    """View appointment reminders"""

    queryset = AppointmentReminder.objects.all().select_related('appointment')
    serializer_class = AppointmentReminderSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['appointment', 'reminder_type', 'is_successful']

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(appointment__clinic=user.clinic)

class AppointmentPrintViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset dedicated to the Print Appointments feature.
    Supports filtering by clinic branch, practitioner, date range, and status.
    Returns a structured list suitable for printing/PDF generation.
    """
    serializer_class   = AppointmentPrintSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_class    = AppointmentFilter
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
            .select_related(
                'patient',
                'practitioner__user',
                'clinic',
                'location',
            )
        )

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """
        GET /api/appointments/print/summary/
        Returns aggregate counts grouped by status for the filtered queryset.
        Useful for the print header.
        """
        qs = self.filter_queryset(self.get_queryset())

        from django.db.models import Count
        counts = (
            qs.values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )

        total = qs.count()

        return Response({
            'total':    total,
            'by_status': {row['status']: row['count'] for row in counts},
        })