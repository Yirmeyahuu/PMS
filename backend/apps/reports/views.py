from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Report
from .serializers import ReportSerializer
from apps.appointments.models import Appointment
from apps.billing.models import Invoice, Payment
from apps.patients.models import Patient


class ReportViewSet(viewsets.ModelViewSet):
    """CRUD operations for reports"""
    
    queryset = Report.objects.all().select_related('clinic', 'generated_by')
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['clinic', 'report_type', 'start_date', 'end_date']
    ordering_fields = ['created_at', 'start_date']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(clinic=user.clinic)
    
    @action(detail=False, methods=['get'])
    def appointments_summary(self, request):
        """Get appointment statistics"""
        clinic = request.user.clinic
        start_date = request.query_params.get('start_date', timezone.now().date())
        end_date = request.query_params.get('end_date', timezone.now().date())
        
        appointments = Appointment.objects.filter(
            clinic=clinic,
            date__range=[start_date, end_date],
            is_deleted=False
        )
        
        summary = {
            'total_appointments': appointments.count(),
            'completed': appointments.filter(status='COMPLETED').count(),
            'cancelled': appointments.filter(status='CANCELLED').count(),
            'no_show': appointments.filter(status='NO_SHOW').count(),
            'by_type': list(appointments.values('appointment_type').annotate(count=Count('id'))),
            'by_practitioner': list(
                appointments.values('practitioner__user__first_name', 'practitioner__user__last_name')
                .annotate(count=Count('id'))
            ),
        }
        
        return Response(summary)
    
    @action(detail=False, methods=['get'])
    def revenue_summary(self, request):
        """Get revenue statistics"""
        clinic = request.user.clinic
        start_date = request.query_params.get('start_date', timezone.now().date())
        end_date = request.query_params.get('end_date', timezone.now().date())
        
        invoices = Invoice.objects.filter(
            clinic=clinic,
            invoice_date__range=[start_date, end_date],
            is_deleted=False
        )
        
        payments = Payment.objects.filter(
            invoice__clinic=clinic,
            payment_date__range=[start_date, end_date]
        )
        
        summary = {
            'total_invoiced': invoices.aggregate(total=Sum('total_amount'))['total'] or 0,
            'total_paid': payments.aggregate(total=Sum('amount'))['total'] or 0,
            'outstanding': invoices.aggregate(total=Sum('balance_due'))['total'] or 0,
            'by_payment_method': list(
                payments.values('payment_method').annotate(total=Sum('amount'))
            ),
            'invoice_count': invoices.count(),
            'payment_count': payments.count(),
        }
        
        return Response(summary)
    
    @action(detail=False, methods=['get'])
    def patient_statistics(self, request):
        """Get patient statistics"""
        clinic = request.user.clinic
        
        patients = Patient.objects.filter(clinic=clinic, is_deleted=False)
        
        # Age distribution
        from datetime import date
        today = date.today()
        
        summary = {
            'total_patients': patients.count(),
            'active_patients': patients.filter(is_active=True).count(),
            'new_this_month': patients.filter(
                created_at__gte=timezone.now().replace(day=1)
            ).count(),
            'by_gender': list(patients.values('gender').annotate(count=Count('id'))),
        }
        
        return Response(summary)
    
    @action(detail=False, methods=['get'])
    def practitioner_performance(self, request):
        """Get practitioner performance metrics"""
        clinic = request.user.clinic
        start_date = request.query_params.get('start_date', timezone.now().date())
        end_date = request.query_params.get('end_date', timezone.now().date())
        
        from apps.clinics.models import Practitioner
        
        practitioners = Practitioner.objects.filter(clinic=clinic, is_deleted=False)
        
        performance = []
        for practitioner in practitioners:
            appointments = Appointment.objects.filter(
                practitioner=practitioner,
                date__range=[start_date, end_date],
                is_deleted=False
            )
            
            performance.append({
                'practitioner': practitioner.user.get_full_name(),
                'total_appointments': appointments.count(),
                'completed': appointments.filter(status='COMPLETED').count(),
                'cancelled': appointments.filter(status='CANCELLED').count(),
                'revenue': Invoice.objects.filter(
                    appointment__practitioner=practitioner,
                    invoice_date__range=[start_date, end_date],
                    is_deleted=False
                ).aggregate(total=Sum('total_amount'))['total'] or 0,
            })
        
        return Response(performance)
    
    @action(detail=False, methods=['get'])
    def dashboard_metrics(self, request):
        """Get dashboard overview metrics"""
        clinic = request.user.clinic
        today = timezone.now().date()
        
        # Today's appointments
        today_appointments = Appointment.objects.filter(
            clinic=clinic,
            date=today,
            is_deleted=False
        )
        
        # This month's revenue
        month_start = today.replace(day=1)
        month_revenue = Invoice.objects.filter(
            clinic=clinic,
            invoice_date__gte=month_start,
            is_deleted=False
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        metrics = {
            'today_appointments': today_appointments.count(),
            'today_completed': today_appointments.filter(status='COMPLETED').count(),
            'today_pending': today_appointments.filter(status__in=['SCHEDULED', 'CONFIRMED']).count(),
            'month_revenue': float(month_revenue),
            'active_patients': Patient.objects.filter(clinic=clinic, is_active=True, is_deleted=False).count(),
            'pending_invoices': Invoice.objects.filter(
                clinic=clinic,
                status='PENDING',
                is_deleted=False
            ).count(),
        }
        
        return Response(metrics)