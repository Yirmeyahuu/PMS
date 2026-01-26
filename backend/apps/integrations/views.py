from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import PhilHealthClaim, HMOClaim
from .serializers import PhilHealthClaimSerializer, HMOClaimSerializer


class PhilHealthClaimViewSet(viewsets.ModelViewSet):
    """CRUD operations for PhilHealth claims"""
    
    queryset = PhilHealthClaim.objects.all().select_related('clinic', 'patient', 'invoice')
    serializer_class = PhilHealthClaimSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['clinic', 'patient', 'status', 'claim_date']
    search_fields = ['claim_number', 'patient__first_name', 'patient__last_name', 'philhealth_number']
    ordering_fields = ['claim_date', 'created_at']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(clinic=user.clinic)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit claim to PhilHealth"""
        claim = self.get_object()
        from django.utils import timezone
        claim.status = 'SUBMITTED'
        claim.submission_date = timezone.now().date()
        claim.save()
        return Response({'status': 'claim submitted'})
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Mark claim as approved"""
        claim = self.get_object()
        approved_amount = request.data.get('approved_amount')
        claim.status = 'APPROVED'
        claim.approved_amount = approved_amount
        claim.save()
        return Response({'status': 'claim approved'})
    
    @action(detail=True, methods=['post'])
    def deny(self, request, pk=None):
        """Mark claim as denied"""
        claim = self.get_object()
        denial_reason = request.data.get('denial_reason', '')
        claim.status = 'DENIED'
        claim.denial_reason = denial_reason
        claim.save()
        return Response({'status': 'claim denied'})


class HMOClaimViewSet(viewsets.ModelViewSet):
    """CRUD operations for HMO claims"""
    
    queryset = HMOClaim.objects.all().select_related('clinic', 'patient', 'invoice')
    serializer_class = HMOClaimSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['clinic', 'patient', 'status', 'hmo_provider', 'claim_date']
    search_fields = ['claim_number', 'patient__first_name', 'patient__last_name', 'hmo_number']
    ordering_fields = ['claim_date', 'created_at']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(clinic=user.clinic)
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit claim to HMO"""
        claim = self.get_object()
        from django.utils import timezone
        claim.status = 'SUBMITTED'
        claim.submission_date = timezone.now().date()
        claim.save()
        return Response({'status': 'claim submitted'})
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Mark claim as approved"""
        claim = self.get_object()
        approved_amount = request.data.get('approved_amount')
        claim.status = 'APPROVED'
        claim.approved_amount = approved_amount
        claim.save()
        return Response({'status': 'claim approved'})
    
    @action(detail=True, methods=['post'])
    def deny(self, request, pk=None):
        """Mark claim as denied"""
        claim = self.get_object()
        denial_reason = request.data.get('denial_reason', '')
        claim.status = 'DENIED'
        claim.denial_reason = denial_reason
        claim.save()
        return Response({'status': 'claim denied'})