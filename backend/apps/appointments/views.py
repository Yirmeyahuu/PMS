from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Appointment, PractitionerSchedule, AppointmentReminder
from .serializers import (
    AppointmentSerializer, PractitionerScheduleSerializer, 
    AppointmentReminderSerializer
)


class AppointmentViewSet(viewsets.ModelViewSet):
    """CRUD operations for appointments"""
    
    queryset = Appointment.objects.filter(is_deleted=False).select_related(
        'patient', 'practitioner__user', 'location', 'clinic'
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
            queryset = queryset.filter(clinic=user.clinic)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        
        return queryset
    
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