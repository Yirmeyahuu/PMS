from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import ClinicalTemplate, ClinicalNote, ClinicalNoteAuditLog
from .serializers import (
    ClinicalTemplateSerializer, ClinicalNoteSerializer, ClinicalNoteAuditLogSerializer
)
from .permissions import (
    IsAdminOrReadOnly, IsSameClinic, IsPractitionerOrAdmin, CanEditClinicalNote
)


class ClinicalTemplateViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for clinical templates.
    
    Permissions:
    - Admin: Full CRUD
    - Other users: Read-only
    
    Security: Scoped to user's clinic
    """
    
    queryset = ClinicalTemplate.objects.filter(is_deleted=False)
    serializer_class = ClinicalTemplateSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly, IsSameClinic]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active', 'is_archived']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'version']
    
    def get_queryset(self):
        """Filter templates by user's clinic"""
        user = self.request.user
        return self.queryset.filter(clinic=user.clinic)
    
    @action(detail=True, methods=['post'])
    def create_version(self, request, pk=None):
        """
        Create a new version of an existing template.
        
        POST /api/templates/{id}/create_version/
        """
        if not request.user.is_admin:
            return Response(
                {'detail': 'Only administrators can create template versions'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        template = self.get_object()
        new_version = template.create_new_version(request.user)
        
        serializer = self.get_serializer(new_version)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """
        Archive a template (soft delete).
        
        POST /api/templates/{id}/archive/
        """
        if not request.user.is_admin:
            return Response(
                {'detail': 'Only administrators can archive templates'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        template = self.get_object()
        template.is_archived = True
        template.is_active = False
        template.save(update_fields=['is_archived', 'is_active'])
        
        return Response({'detail': 'Template archived successfully'})
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Get only active, non-archived templates.
        
        GET /api/templates/active/
        """
        templates = self.get_queryset().filter(is_active=True, is_archived=False)
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)


class ClinicalNoteViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for clinical notes.
    
    Permissions:
    - Practitioners can create/edit their own notes
    - Admins can view all notes in clinic
    - Notes cannot be edited once signed
    
    Security: Content is encrypted, scoped to clinic
    """
    
    queryset = ClinicalNote.objects.filter(is_deleted=False).select_related(
        'patient', 'practitioner__user', 'appointment', 'template', 'clinic'
    )
    serializer_class = ClinicalNoteSerializer
    permission_classes = [IsAuthenticated, IsPractitionerOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'practitioner', 'date', 'is_draft', 'is_signed', 'template']
    search_fields = ['patient__first_name', 'patient__last_name']
    ordering_fields = ['date', 'created_at']
    
    def get_permissions(self):
        """Use CanEditClinicalNote for update/delete"""
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), CanEditClinicalNote()]
        return super().get_permissions()
    
    def get_queryset(self):
        """Filter notes by user's clinic"""
        user = self.request.user
        queryset = self.queryset.filter(clinic=user.clinic)
        
        # Practitioners see only their own notes
        if user.is_practitioner and not user.is_admin:
            queryset = queryset.filter(practitioner__user=user)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def sign(self, request, pk=None):
        """
        Sign and finalize a clinical note.
        
        POST /api/clinical-notes/{id}/sign/
        """
        note = self.get_object()
        
        try:
            note.sign_note(request.user)
            
            # Log signing
            ClinicalNoteAuditLog.objects.create(
                clinical_note=note,
                user=request.user,
                action='SIGNED',
                ip_address=self._get_client_ip(),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            serializer = self.get_serializer(note)
            return Response(serializer.data)
        
        except ValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def autosave(self, request, pk=None):
        """
        Auto-save draft note without validation.
        
        POST /api/clinical-notes/{id}/autosave/
        Body: { "content": {...} }
        """
        note = self.get_object()
        
        if note.is_signed:
            return Response(
                {'detail': 'Cannot modify signed notes'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        content = request.data.get('content')
        if content:
            note.set_content(content)
            note.last_autosave = timezone.now()
            note.save(update_fields=['encrypted_content', 'last_autosave'])
        
        return Response({'detail': 'Draft saved', 'last_autosave': note.last_autosave})
    
    @action(detail=True, methods=['get'])
    def audit_log(self, request, pk=None):
        """
        Get audit log for a clinical note.
        
        GET /api/clinical-notes/{id}/audit_log/
        """
        note = self.get_object()
        logs = note.audit_logs.all()
        serializer = ClinicalNoteAuditLogSerializer(logs, many=True)
        return Response(serializer.data)
    
    def _get_client_ip(self):
        """Extract client IP from request"""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return self.request.META.get('REMOTE_ADDR')