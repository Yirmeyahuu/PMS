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
    """Admin CRUD for portal service categories."""

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


class PortalServiceViewSet(viewsets.ModelViewSet):          # ✅ renamed class
    """Admin CRUD for portal services."""

    queryset           = PortalService.objects.filter(      # ✅ PortalService
        is_deleted=False
    ).select_related('category', 'clinic')
    serializer_class   = PortalServiceSerializer            # ✅ PortalServiceSerializer
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
    """
    Admin endpoint to view the portal link.
    The link is always tied to the MAIN clinic — shared across all branches.

    GET   /api/portal-links/       → returns the clinic's portal link (auto-creates if missing)
    PATCH /api/portal-links/{id}/  → update heading / description / is_active
    """

    queryset           = PortalLink.objects.select_related('clinic')
    serializer_class   = PortalLinkAdminSerializer
    permission_classes = [IsAuthenticated]
    # Disable POST (create) — link is auto-created; disable DELETE
    http_method_names  = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        # Always resolve to the main clinic
        main_clinic = self.request.user.clinic.main_clinic
        return self.queryset.filter(clinic=main_clinic)

    def list(self, request, *args, **kwargs):
        """
        Auto-create the portal link if it doesn't exist yet,
        then return it as a single-item list (keeps frontend interface unchanged).
        """
        main_clinic = request.user.clinic.main_clinic
        portal_link, created = PortalLink.get_or_create_for_clinic(main_clinic)
        if created:
            logger.info(f"Portal link auto-created for clinic: {main_clinic.name}")
        serializer = self.get_serializer(
            portal_link, context={'request': request}
        )
        return Response([serializer.data])

    def retrieve(self, request, *args, **kwargs):
        instance   = self.get_object()
        serializer = self.get_serializer(instance, context={'request': request})
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """PATCH — allow updating heading, description, is_active only."""
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
    """
    Admin read-only view of incoming portal bookings.
    GET   /api/portal-bookings/
    PATCH /api/portal-bookings/{id}/update_status/  → update status
    """

    queryset = PortalBooking.objects.select_related(
        'portal_link__clinic', 'service', 'practitioner__user'
    )
    serializer_class   = PortalBookingResponseSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['status']
    ordering_fields    = ['appointment_date', 'created_at']

    def get_queryset(self):
        return self.queryset.filter(portal_link__clinic=self.request.user.clinic)

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

        booking.status = new_status
        booking.save(update_fields=['status'])
        return Response(self.get_serializer(booking).data)


# ─── Public Portal endpoints (no auth) ───────────────────────────────────────

class PublicPortalView(APIView):
    """
    GET /api/public/portal/<token>/
    Returns clinic branding + services for the booking page.
    No authentication required.
    """

    permission_classes = [AllowAny]

    def get(self, request, token: str):
        portal_link = get_object_or_404(PortalLink, token=token, is_active=True)
        serializer  = PortalLinkPublicSerializer(portal_link, context={'request': request})
        return Response(serializer.data)


class PublicPortalBookView(APIView):
    """
    POST /api/public/portal/<token>/book/
    Creates a PortalBooking. No authentication required.
    """

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
    """
    GET /api/portal-bookings/diary/?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    Returns PENDING + CONFIRMED portal bookings shaped for the Diary calendar.
    Requires authentication (staff/admin only).
    """
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
            status__in=['PENDING', 'CONFIRMED'],
        ).select_related('service', 'practitioner__user')

        from datetime import datetime, timedelta

        data = []
        for b in bookings:
            duration = b.service.duration_minutes if b.service else 60
            start_dt = datetime.combine(b.appointment_date, b.appointment_time)
            end_dt   = start_dt + timedelta(minutes=duration)

            practitioner_name = (
                b.practitioner.user.get_full_name() if b.practitioner else 'Any Available'
            )

            data.append({
                'id':               b.id,
                'reference_number': b.reference_number,
                'status':           b.status,
                'patient_name':     f"{b.patient_first_name} {b.patient_last_name}",
                'patient_phone':    b.patient_phone,
                'patient_email':    b.patient_email,
                'service_name':     b.service.name if b.service else '—',
                'practitioner_name': practitioner_name,
                'date':             b.appointment_date.strftime('%Y-%m-%d'),
                'start_time':       b.appointment_time.strftime('%H:%M'),
                'end_time':         end_dt.strftime('%H:%M'),
                'duration_minutes': duration,
                'notes':            b.notes,
            })

        return Response(data)
