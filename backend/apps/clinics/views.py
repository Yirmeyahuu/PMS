from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q  # ✅ ADD THIS IMPORT
from .models import Clinic, Practitioner, Location
from .serializers import (
    ClinicSerializer, ClinicBranchSerializer, 
    PractitionerSerializer, LocationSerializer
)

class ClinicViewSet(viewsets.ModelViewSet):
    """CRUD operations for clinics"""
    
    queryset = Clinic.objects.filter(is_deleted=False)
    serializer_class = ClinicSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['name', 'city', 'province', 'branch_code']
    filterset_fields = ['is_main_branch', 'parent_clinic']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            # Admin sees their clinic and all branches
            if user.clinic:
                main_clinic = user.clinic.main_clinic
                return self.queryset.filter(
                    Q(id=main_clinic.id) | Q(parent_clinic=main_clinic)  # ✅ FIXED
                )
            return self.queryset
        # Non-admin sees only their assigned clinic
        return self.queryset.filter(id=user.clinic_id) if user.clinic else self.queryset.none()
    
    @action(detail=False, methods=['get'])
    def branches(self, request):
        """Get all clinic branches for the current user's clinic"""
        user = request.user
        
        if not user.clinic:
            return Response({'branches': []})
        
        # Get main clinic
        main_clinic = user.clinic.main_clinic
        
        # Get all branches including main clinic
        branches = Clinic.objects.filter(
            Q(id=main_clinic.id) | Q(parent_clinic=main_clinic)  # ✅ FIXED
        ).filter(is_deleted=False, is_active=True).order_by('-is_main_branch', 'name')
        
        serializer = ClinicBranchSerializer(branches, many=True)
        
        return Response({
            'branches': serializer.data,
            'main_clinic_id': main_clinic.id
        })
    
    @action(detail=True, methods=['post'])
    def create_branch(self, request, pk=None):
        """Create a new branch for an existing clinic"""
        main_clinic = self.get_object()
        
        # Ensure user is admin of the main clinic
        if not request.user.is_admin or request.user.clinic.main_clinic.id != main_clinic.id:
            return Response(
                {'detail': 'Only clinic administrators can create branches.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Ensure the clinic is a main clinic
        if main_clinic.is_branch:
            return Response(
                {'detail': 'Cannot create a branch under another branch.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create branch
        branch_data = request.data.copy()
        branch_data['parent_clinic'] = main_clinic.id
        branch_data['is_main_branch'] = False
        branch_data['subscription_plan'] = main_clinic.subscription_plan
        branch_data['subscription_expires'] = main_clinic.subscription_expires
        
        serializer = ClinicSerializer(data=branch_data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


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