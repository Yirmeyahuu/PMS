from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Clinic, Practitioner, Location
from .serializers import ClinicSerializer, PractitionerSerializer, LocationSerializer


class ClinicViewSet(viewsets.ModelViewSet):
    """CRUD operations for clinics"""
    
    queryset = Clinic.objects.filter(is_deleted=False)
    serializer_class = ClinicSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'city', 'province']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(id=user.clinic_id) if user.clinic else self.queryset.none()


class PractitionerViewSet(viewsets.ModelViewSet):
    """CRUD operations for practitioners"""
    
    queryset = Practitioner.objects.filter(is_deleted=False).select_related('user', 'clinic')
    serializer_class = PractitionerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['clinic', 'is_accepting_patients']
    search_fields = ['user__first_name', 'user__last_name', 'specialization']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(clinic=user.clinic)


class LocationViewSet(viewsets.ModelViewSet):
    """CRUD operations for clinic locations"""
    
    queryset = Location.objects.filter(is_deleted=False)
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['clinic', 'is_active']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(clinic=user.clinic)