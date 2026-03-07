from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from apps.clinics.services.models import Service as ClinicService
from .models import (
    Patient, IntakeForm,
    ServiceCategory, PortalService,
    PortalLink, PortalBooking,
)
from .serializers import (
    PatientSerializer, IntakeFormSerializer,
    ServiceCategorySerializer, PortalServiceSerializer,
    PortalLinkPublicSerializer, PortalLinkAdminSerializer,
    PortalBookingCreateSerializer, PortalBookingResponseSerializer,
)
import logging

logger = logging.getLogger(__name__)


# ─── Helper ───────────────────────────────────────────────────────────────────

def _confirm_portal_booking(booking, confirmed_by_user):
    """
    When a PortalBooking is CONFIRMED:
      1. Find or create a Patient record from the booking's contact details.
      2. Find or create a proper Appointment in the diary.
      3. Link the appointment back to the booking via booking.appointment.
    Returns (patient, appointment).
    """
    from datetime import datetime, timedelta
    from apps.appointments.models import Appointment

    clinic = booking.portal_link.clinic

    # ── 1. Find or create Patient ─────────────────────────────────────────
    patient = None

    if booking.patient_email:
        patient = Patient.objects.filter(
            clinic=clinic,
            email__iexact=booking.patient_email,
            is_deleted=False,
        ).first()

    if patient is None:
        patient = Patient.objects.filter(
            clinic=clinic,
            first_name__iexact=booking.patient_first_name,
            last_name__iexact=booking.patient_last_name,
            phone=booking.patient_phone,
            is_deleted=False,
        ).first()

    if patient is None:
        patient = Patient.objects.create(
            clinic=clinic,
            first_name=booking.patient_first_name,
            last_name=booking.patient_last_name,
            date_of_birth='2000-01-01',   # placeholder — staff updates via profile
            gender='O',
            email=booking.patient_email or '',
            phone=booking.patient_phone,
            address='',
            city=clinic.city or '',
            province=clinic.province or '',
            emergency_contact_name='',
            emergency_contact_phone='',
            emergency_contact_relationship='',
            is_active=True,
        )
        logger.info(
            f"Patient created from portal booking #{booking.reference_number}: "
            f"{patient.get_full_name()} ({patient.patient_number})"
        )

    # ── 2. Find or create Appointment ─────────────────────────────────────
    # If booking already has a linked appointment, reuse it
    if booking.appointment_id:
        return patient, booking.appointment

    appointment = Appointment.objects.filter(
        clinic=clinic,
        patient=patient,
        date=booking.appointment_date,
        start_time=booking.appointment_time,
        is_deleted=False,
    ).first()

    if appointment is None:
        duration = booking.service.duration_minutes if booking.service else 60
        start_dt = datetime.combine(booking.appointment_date, booking.appointment_time)
        end_dt   = start_dt + timedelta(minutes=duration)

        appointment = Appointment.objects.create(
            clinic=clinic,
            patient=patient,
            practitioner=booking.practitioner,
            appointment_type='INITIAL',
            status='CONFIRMED',
            date=booking.appointment_date,
            start_time=booking.appointment_time,
            end_time=end_dt.time(),
            duration_minutes=duration,
            chief_complaint=booking.notes or '',
            notes=f'Created from portal booking #{booking.reference_number}',
            created_by=confirmed_by_user,
            updated_by=confirmed_by_user,
        )
        logger.info(
            f"Appointment #{appointment.id} created from portal booking "
            f"#{booking.reference_number} for {patient.get_full_name()}"
        )

    # ── 3. Link appointment back to booking ───────────────────────────────
    booking.appointment = appointment
    booking.save(update_fields=['appointment'])

    return patient, appointment 


# ─── Existing ViewSets ────────────────────────────────────────────────────────

class PatientViewSet(viewsets.ModelViewSet):
    queryset = Patient.objects.filter(is_deleted=False).select_related('clinic')
    serializer_class = PatientSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['clinic', 'gender', 'is_active']
    search_fields = ['first_name', 'last_name', 'patient_number', 'phone', 'email']
    ordering_fields = ['last_name', 'created_at']

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(clinic=user.clinic)

    @action(detail=True, methods=['get'])
    def intake_forms(self, request, pk=None):
        patient    = self.get_object()
        forms      = patient.intake_forms.all()
        serializer = IntakeFormSerializer(forms, many=True)
        return Response(serializer.data)


class IntakeFormViewSet(viewsets.ModelViewSet):
    queryset = IntakeForm.objects.all().select_related('patient', 'completed_by')
    serializer_class = IntakeFormSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['patient', 'completed_by']

    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(patient__clinic=user.clinic)


# ─── Portal Service Management (admin) ───────────────────────────────────────

class ServiceCategoryViewSet(viewsets.ModelViewSet):
    queryset           = ServiceCategory.objects.filter(is_deleted=False)
    serializer_class   = ServiceCategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ['is_active']
    search_fields      = ['name']

    def get_queryset(self):
        return self.queryset.filter(clinic=self.request.user.clinic)

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)


class PortalServiceViewSet(viewsets.ModelViewSet):
    queryset           = PortalService.objects.filter(
        is_deleted=False
    ).select_related('category', 'clinic')
    serializer_class   = PortalServiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields   = ['is_active', 'category']
    search_fields      = ['name', 'description']

    def get_queryset(self):
        return self.queryset.filter(clinic=self.request.user.clinic)

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)


# ─── Portal Link management (admin) ──────────────────────────────────────────

class PortalLinkViewSet(viewsets.ModelViewSet):
    queryset           = PortalLink.objects.select_related('clinic')
    serializer_class   = PortalLinkAdminSerializer
    permission_classes = [IsAuthenticated]
    http_method_names  = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        main_clinic = self.request.user.clinic.main_clinic
        return self.queryset.filter(clinic=main_clinic)

    def list(self, request, *args, **kwargs):
        main_clinic = request.user.clinic.main_clinic
        portal_link, created = PortalLink.get_or_create_for_clinic(main_clinic)
        if created:
            logger.info(f"Portal link auto-created for clinic: {main_clinic.name}")
        serializer = self.get_serializer(portal_link, context={'request': request})
        return Response([serializer.data])

    def retrieve(self, request, *args, **kwargs):
        instance   = self.get_object()
        serializer = self.get_serializer(instance, context={'request': request})
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        instance   = self.get_object()
        serializer = self.get_serializer(
            instance, data=request.data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        logger.info(
            f"Portal link updated for clinic: {instance.clinic.name} "
            f"by {request.user.email}"
        )
        return Response(serializer.data)


# ─── Portal Booking management (admin) ───────────────────────────────────────

class PortalBookingAdminViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PortalBooking.objects.select_related(
        'portal_link__clinic', 'service', 'practitioner__user'
    )
    serializer_class   = PortalBookingResponseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['status']
    ordering_fields    = ['appointment_date', 'created_at']

    def get_queryset(self):
        user = self.request.user
        if not user.clinic:
            return self.queryset.none()
        # ✅ Use main_clinic so all branches are included
        main_clinic = user.clinic.main_clinic
        all_branch_ids = list(
            main_clinic.get_all_branches().values_list('id', flat=True)
        )
        return self.queryset.filter(portal_link__clinic_id__in=all_branch_ids)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        booking    = self.get_object()
        new_status = request.data.get('status')
        allowed    = [s[0] for s in PortalBooking.STATUS_CHOICES]

        if new_status not in allowed:
            return Response(
                {'status': f'Must be one of: {", ".join(allowed)}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Save the new status first ─────────────────────────────────────
        booking.status = new_status
        booking.save(update_fields=['status', 'updated_at'])

        result = {'id': booking.id, 'status': booking.status}

        # ── Auto-create Patient + Appointment when CONFIRMED ──────────────
        if new_status == 'CONFIRMED':
            try:
                patient, appointment = _confirm_portal_booking(booking, request.user)
                result['patient_id']     = patient.id
                result['patient_number'] = patient.patient_number
                result['patient_name']   = patient.get_full_name()
                result['appointment_id'] = appointment.id if appointment else None
                logger.info(
                    f"Portal booking #{booking.reference_number} confirmed. "
                    f"Patient: {patient.patient_number}, "
                    f"Appointment: {appointment.id if appointment else 'N/A'}"
                )
            except Exception as e:
                logger.error(f"Failed to create patient/appointment from portal booking: {e}")
                result['warning'] = 'Booking confirmed but failed to auto-create patient record.'

        return Response(result)


# ─── Public Portal endpoints (no auth) ───────────────────────────────────────

class PublicPortalView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token: str):
        portal_link = get_object_or_404(PortalLink, token=token, is_active=True)
        serializer  = PortalLinkPublicSerializer(portal_link, context={'request': request})
        return Response(serializer.data)


class PublicPortalBookView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, token: str):
        portal_link = get_object_or_404(PortalLink, token=token, is_active=True)

        serializer = PortalBookingCreateSerializer(
            data=request.data,
            context={'request': request, 'portal_link': portal_link},
        )

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        booking = serializer.save(portal_link=portal_link)

        logger.info(
            f"New portal booking #{booking.reference_number} "
            f"for clinic '{portal_link.clinic.name}'"
        )

        response_serializer = PortalBookingResponseSerializer(
            booking, context={'request': request}
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class PublicAvailableSlotsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, token: str):
        portal_link = get_object_or_404(PortalLink, token=token, is_active=True)

        service_id      = request.query_params.get('service')
        date_str        = request.query_params.get('date')
        practitioner_id = request.query_params.get('practitioner')

        if not service_id or not date_str:
            return Response(
                {'detail': 'service and date query params are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service = get_object_or_404(
            ClinicService,
            pk=service_id,
            clinic=portal_link.clinic,
            is_active=True,
            show_in_portal=True,
        )

        from datetime import time, date as date_type, timedelta, datetime
        from apps.appointments.models import Appointment  # ✅ cross-check Diary appointments
        from apps.appointments.models import PractitionerSchedule  # ✅ respect practitioner schedule

        try:
            target_date = date_type.fromisoformat(date_str)
        except ValueError:
            return Response({'detail': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)

        if target_date < date_type.today():
            return Response({'detail': 'Cannot book a past date.'}, status=400)

        duration = service.duration_minutes

        CLINIC_START = 6 * 60    # 6:00 AM
        CLINIC_END   = 21 * 60   # 9:00 PM

        def time_to_minutes(t):
            return t.hour * 60 + t.minute

        def minutes_to_time(m):
            return time(m // 60, m % 60)

        # ── 1. Build candidate 15-min slots (respect practitioner schedule if set) ──
        weekday = target_date.weekday()
        candidate_slots: list = []

        if practitioner_id:
            schedules = PractitionerSchedule.objects.filter(
                practitioner_id=practitioner_id,
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
                # No schedule set — use clinic hours
                m = CLINIC_START
                while m + 15 <= CLINIC_END:
                    candidate_slots.append(minutes_to_time(m))
                    m += 15
        else:
            m = CLINIC_START
            while m + 15 <= CLINIC_END:
                candidate_slots.append(minutes_to_time(m))
                m += 15

        # ── 2. Collect booked ranges from BOTH sources ────────────────────────────
        booked_ranges: list[tuple] = []

        # Source A: Diary/Calendar appointments (Appointment table)
        diary_qs = Appointment.objects.filter(
            date=target_date,
            clinic=portal_link.clinic,
            status__in=['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'],
            is_deleted=False,
        )
        if practitioner_id:
            diary_qs = diary_qs.filter(practitioner_id=practitioner_id)

        for appt in diary_qs:
            booked_ranges.append((
                time_to_minutes(appt.start_time),
                time_to_minutes(appt.end_time),
            ))

        # Source B: Portal bookings (PortalBooking table)
        portal_qs = PortalBooking.objects.filter(
            portal_link=portal_link,
            appointment_date=target_date,
            status__in=['PENDING', 'CONFIRMED'],
        )
        if practitioner_id:
            portal_qs = portal_qs.filter(practitioner_id=practitioner_id)

        for booking in portal_qs:
            # Portal bookings store only start time — derive end from service duration
            booking_start = time_to_minutes(booking.appointment_time)
            booking_service_duration = (
                booking.service.duration_minutes if booking.service else duration
            )
            booking_end = booking_start + booking_service_duration
            booked_ranges.append((booking_start, booking_end))

        # ── 3. Filter candidate slots against all booked ranges ───────────────────
        available: list[str] = []
        for slot_time in candidate_slots:
            slot_start = time_to_minutes(slot_time)
            slot_end   = slot_start + duration

            if slot_end > CLINIC_END:
                continue

            overlaps = any(
                slot_start < booked_end and slot_end > booked_start
                for booked_start, booked_end in booked_ranges
            )
            if not overlaps:
                available.append(f"{slot_time.hour:02d}:{slot_time.minute:02d}")

        return Response({'date': date_str, 'slots': available})


class PortalBookingDiaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_from = request.query_params.get('date_from')
        date_to   = request.query_params.get('date_to')

        if not date_from or not date_to:
            return Response(
                {'detail': 'date_from and date_to are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        bookings = PortalBooking.objects.filter(
            portal_link__clinic=request.user.clinic,
            appointment_date__gte=date_from,
            appointment_date__lte=date_to,
            status='PENDING',  # ✅ strictly PENDING only
        ).select_related('service', 'practitioner__user')

        practitioner_id = request.query_params.get('practitioner')
        if practitioner_id:
            bookings = bookings.filter(practitioner_id=practitioner_id)

        clinic_branch = request.query_params.get('clinic_branch')
        if clinic_branch:
            bookings = bookings.filter(portal_link__clinic_id=clinic_branch)

        from datetime import datetime, timedelta
        data = []
        for b in bookings:
            duration = b.service.duration_minutes if b.service else 60
            start_dt = datetime.combine(b.appointment_date, b.appointment_time)
            end_dt   = start_dt + timedelta(minutes=duration)

            data.append({
                'id':               b.id,
                'reference_number': b.reference_number,
                'status':           b.status,
                'patient_name':     f"{b.patient_first_name} {b.patient_last_name}",
                'patient_phone':    b.patient_phone,
                'patient_email':    b.patient_email,
                'service_name':     b.service.name if b.service else '—',
                'practitioner_id':  b.practitioner_id,
                'practitioner_name': (
                    b.practitioner.user.get_full_name() if b.practitioner else 'Any Available'
                ),
                'date':             b.appointment_date.strftime('%Y-%m-%d'),
                'start_time':       b.appointment_time.strftime('%H:%M'),
                'end_time':         end_dt.strftime('%H:%M'),
                'duration_minutes': duration,
                'notes':            b.notes,
            })

        return Response(data)
 