from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Patient, IntakeForm
from .serializers import PatientSerializer, IntakeFormSerializer


class PatientViewSet(viewsets.ModelViewSet):
    """CRUD operations for patients"""
    
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
        """Get all intake forms for a patient"""
        patient = self.get_object()
        forms = patient.intake_forms.all()
        serializer = IntakeFormSerializer(forms, many=True)
        return Response(serializer.data)


class IntakeFormViewSet(viewsets.ModelViewSet):
    """CRUD operations for intake forms"""
    
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