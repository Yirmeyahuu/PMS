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
        user = self.request.user
        queryset = self.queryset
        
        if not user.is_admin:
            # Staff/Practitioner: only see their clinic's appointments
            queryset = queryset.filter(clinic=user.clinic)
        else:
            # Admin: see all appointments from main clinic and branches
            if user.clinic:
                main_clinic = user.clinic.main_clinic
                # Get appointments from main clinic and all branches
                branch_ids = list(
                    main_clinic.get_all_branches().values_list('id', flat=True)
                )
                queryset = queryset.filter(clinic_id__in=branch_ids)
        
        # ✅ NEW: Filter by specific clinic branch if provided
        clinic_id = self.request.query_params.get('clinic_branch')
        if clinic_id:
            queryset = queryset.filter(clinic_id=clinic_id)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset
    
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
        """Get available time slots for a practitioner on a specific date"""
        practitioner_id = request.query_params.get('practitioner')
        date_str = request.query_params.get('date')
        
        if not practitioner_id or not date_str:
            return Response(
                {'error': 'practitioner and date parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Implementation for calculating available slots
        # This is a simplified version
        return Response({'available_slots': []})
    
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