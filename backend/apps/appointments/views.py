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
    AppointmentReminderSerializer
)
from apps.patients.models import PortalBooking


class AppointmentViewSet(viewsets.ModelViewSet):
    """CRUD operations for appointments"""
    
    queryset = Appointment.objects.filter(is_deleted=False).select_related(
        'patient', 'practitioner__user', 'location', 'clinic', 'created_by', 'updated_by'
    )
    serializer_class = AppointmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['clinic', 'patient', 'practitioner', 'status', 'date', 'appointment_type']
    search_fields = ['patient__first_name', 'patient__last_name', 'chief_complaint']
    ordering_fields = ['date', 'start_time', 'created_at']
    
    def get_queryset(self):
        # ...existing code ... (keep all existing logic unchanged)
        user = self.request.user
        queryset = self.queryset

        if not user.is_admin:
            queryset = queryset.filter(clinic=user.clinic)
        else:
            if user.clinic:
                main_clinic = user.clinic.main_clinic
                branch_ids = list(
                    main_clinic.get_all_branches().values_list('id', flat=True)
                )
                queryset = queryset.filter(clinic_id__in=branch_ids)

        clinic_id = self.request.query_params.get('clinic_branch')
        if clinic_id:
            queryset = queryset.filter(clinic_id=clinic_id)

        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)

        return queryset

    # ✅ NEW: endpoint to fetch portal bookings for the diary
    @action(detail=False, methods=['get'])
    def portal_bookings(self, request):
        """
        Returns PENDING portal bookings for the diary calendar.
        These are shown as orange 'pending' blocks until confirmed.
        GET /api/appointments/portal_bookings/?start_date=...&end_date=...
        """
        user = request.user
        main_clinic = user.clinic.main_clinic if user.clinic else None

        if not main_clinic:
            return Response([])

        qs = PortalBooking.objects.filter(
            portal_link__clinic=main_clinic,
            status__in=['PENDING', 'CONFIRMED'],
        ).select_related('service', 'practitioner__user', 'portal_link__clinic')

        start_date = request.query_params.get('start_date')
        end_date   = request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(appointment_date__gte=start_date)
        if end_date:
            qs = qs.filter(appointment_date__lte=end_date)

        clinic_id = request.query_params.get('clinic_branch')
        if clinic_id:
            qs = qs.filter(portal_link__clinic_id=clinic_id)

        practitioner_id = request.query_params.get('practitioner')
        if practitioner_id:
            qs = qs.filter(practitioner_id=practitioner_id)

        from datetime import datetime, timedelta
        data = []
        for booking in qs:
            duration = booking.service.duration_minutes if booking.service else 60
            start_dt = datetime.combine(booking.appointment_date, booking.appointment_time)
            end_dt   = start_dt + timedelta(minutes=duration)

            data.append({
                'id':             booking.id,
                'type':           'portal_booking',          # ✅ flag for frontend
                'reference_number': booking.reference_number,
                'patient_name':   f"{booking.patient_first_name} {booking.patient_last_name}",
                'patient_email':  booking.patient_email,
                'patient_phone':  booking.patient_phone,
                'service_name':   booking.service.name if booking.service else '',
                'service_id':     booking.service_id,
                'practitioner_id': booking.practitioner_id,
                'practitioner_name': (
                    booking.practitioner.user.get_full_name()
                    if booking.practitioner else 'Any Available'
                ),
                'date':           booking.appointment_date.isoformat(),
                'start_time':     booking.appointment_time.strftime('%H:%M'),
                'end_time':       end_dt.time().strftime('%H:%M'),
                'duration_minutes': duration,
                'status':         booking.status,   # PENDING | CONFIRMED
                'notes':          booking.notes,
            })

        return Response(data)

    # ✅ NEW: confirm or cancel a portal booking
    @action(detail=False, methods=['patch'], url_path='portal_bookings/(?P<booking_id>[^/.]+)/update')
    def update_portal_booking(self, request, booking_id=None):
        """
        PATCH /api/appointments/portal_bookings/{id}/update/
        body: { "status": "CONFIRMED" | "CANCELLED" }
        """
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
        """Auto-populate created_by"""
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
    
    def perform_update(self, serializer):
        """Auto-populate updated_by"""
        serializer.save(updated_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Confirm an appointment"""
        appointment = self.get_object()
        appointment.status = 'CONFIRMED'
        appointment.save()
        return Response({'status': 'appointment confirmed'})
    
    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        """Check in a patient for appointment"""
        appointment = self.get_object()
        appointment.status = 'CHECKED_IN'
        appointment.save()
        return Response({'status': 'patient checked in'})
    
    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Start an appointment"""
        appointment = self.get_object()
        appointment.status = 'IN_PROGRESS'
        appointment.save()
        return Response({'status': 'appointment started'})
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Complete an appointment"""
        appointment = self.get_object()
        appointment.status = 'COMPLETED'
        appointment.save()
        return Response({'status': 'appointment completed'})
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an appointment"""
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

        CLINIC_START = 6 * 60   # 6:00 AM in minutes
        CLINIC_END   = 21 * 60  # 9:00 PM in minutes

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

        weekday = target_date.weekday()  # 0=Monday … 6=Sunday

        # ── 1. Determine working hours ────────────────────────────────────
        def time_to_minutes(t):
            return t.hour * 60 + t.minute

        def minutes_to_time(m):
            return time(m // 60, m % 60)

        # ── 2. Build candidate 15-min slots ──────────────────────────────
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
                    # Clamp schedule to clinic hours
                    start_min = max(time_to_minutes(sched.start_time), CLINIC_START)
                    end_min   = min(time_to_minutes(sched.end_time),   CLINIC_END)
                    m = start_min
                    while m + 15 <= end_min:
                        candidate_slots.append(minutes_to_time(m))
                        m += 15
            else:
                # Practitioner exists but no schedule set → use clinic hours
                m = CLINIC_START
                while m + 15 <= CLINIC_END:
                    candidate_slots.append(minutes_to_time(m))
                    m += 15
        else:
            # No practitioner filter → use clinic hours only
            m = CLINIC_START
            while m + 15 <= CLINIC_END:
                candidate_slots.append(minutes_to_time(m))
                m += 15

        # ── 3. Get service duration (default 60 min) ──────────────────────
        duration = 15  # ✅ FIX: Default to 15-min slots, not 60
        if service_id:
            try:
                from apps.clinics.models import ClinicService
                svc = ClinicService.objects.get(pk=service_id)
                duration = svc.duration_minutes
            except Exception:
                pass

        # ── 4. Find booked appointments on this date ──────────────────────
        booked_qs = Appointment.objects.filter(
            date=target_date,
            status__in=['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'],
            is_deleted=False,
        )
        if practitioner_id:
            booked_qs = booked_qs.filter(practitioner_id=practitioner_id)

        booked_ranges = [(a.start_time, a.end_time) for a in booked_qs]

        # ── 5. Filter out overlapping slots ──────────────────────────────
        available: list[str] = []
        for slot_time in candidate_slots:
            slot_start = time_to_minutes(slot_time)
            slot_end   = slot_start + duration

            # Also ensure the slot END doesn't exceed clinic closing time
            if slot_end > CLINIC_END:
                continue

            overlaps = any(
                slot_start < time_to_minutes(end) and slot_end > time_to_minutes(start)
                for start, end in booked_ranges
            )
            if not overlaps:
                available.append(f"{slot_time.hour:02d}:{slot_time.minute:02d}")

        return Response({'slots': available})
    
    # ✅ NEW: Get list of practitioners for filtering
    @action(detail=False, methods=['get'])
    def practitioners(self, request):
        """Get list of active practitioners for the clinic"""
        from apps.clinics.models import Practitioner
        
        user = request.user
        
        # ✅ NEW: Filter by clinic branch if provided
        clinic_id = request.query_params.get('clinic_branch')
        
        if user.is_admin:
            if clinic_id:
                # Filter by specific branch
                practitioners = Practitioner.objects.filter(
                    clinic_id=clinic_id,
                    user__is_active=True,
                    user__is_deleted=False
                ).select_related('user')
            else:
                # Get practitioners from all branches
                main_clinic = user.clinic.main_clinic if user.clinic else None
                if main_clinic:
                    branch_ids = list(
                        main_clinic.get_all_branches().values_list('id', flat=True)
                    )
                    practitioners = Practitioner.objects.filter(
                        clinic_id__in=branch_ids,
                        user__is_active=True,
                        user__is_deleted=False
                    ).select_related('user', 'clinic')
                else:
                    practitioners = Practitioner.objects.filter(
                        user__is_active=True,
                        user__is_deleted=False
                    ).select_related('user', 'clinic')
        else:
            practitioners = Practitioner.objects.filter(
                clinic=user.clinic,
                user__is_active=True,
                user__is_deleted=False
            ).select_related('user')
        
        # Format response
        practitioners_data = [
            {
                'id': p.id,
                'name': p.user.get_full_name(),
                'email': p.user.email,
                'specialization': p.specialization if p.specialization else None,
                'clinic_id': p.clinic_id,
                'clinic_name': p.clinic.name if p.clinic else None
            }
            for p in practitioners
        ]
        
        return Response({'practitioners': practitioners_data})


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