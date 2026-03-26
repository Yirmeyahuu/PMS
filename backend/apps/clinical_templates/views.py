from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
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
    
    @action(detail=True, methods=['post'])
    def email_note(self, request, pk=None):
        """
        Send clinical note to patient's email address.
        
        POST /api/clinical-notes/{id}/email_note/
        """
        note = self.get_object()
        patient = note.patient
        clinic = note.clinic
        
        # Validate patient has email
        if not patient.email:
            return Response(
                {'detail': 'Patient has no email address'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Build the formatted note content for email
        content = note.content
        sections_html = ''
        
        if note.template and note.template.structure:
            template_structure = note.template.structure
            for section in template_structure.get('sections', []):
                section_title = section.get('title', '')
                section_fields = section.get('fields', [])
                
                fields_html = ''
                for field in section_fields:
                    field_id = field.get('id', '')
                    field_label = field.get('label', '')
                    field_value = content.get(field_id, '')
                    
                    if field_value:
                        if isinstance(field_value, list):
                            field_value = ', '.join(field_value)
                        fields_html += f'<p><strong>{field_label}:</strong> {field_value}</p>'
                
                if fields_html:
                    sections_html += f'''
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px;">{section_title}</h3>
                        {fields_html}
                    </div>
                    '''
        
        # If no template structure, show raw content
        if not sections_html and content:
            for key, value in content.items():
                if value:
                    if isinstance(value, list):
                        value = ', '.join(value)
                    sections_html += f'<p><strong>{key}:</strong> {value}</p>'
        
        context = {
            'patient_name': patient.get_full_name(),
            'clinic_name': clinic.name,
            'practitioner_name': note.practitioner.user.get_full_name() if note.practitioner and note.practitioner.user else 'Practitioner',
            'date': note.date.strftime('%B %d, %Y') if note.date else '',
            'template_name': note.template.name if note.template else 'Clinical Note',
            'sections_html': sections_html,
            'is_signed': note.is_signed,
            'signed_at': note.signed_at.strftime('%B %d, %Y at %I:%M %p') if note.signed_at else None,
        }
        
        try:
            subject = f"Clinical Note - {context['date']} - {clinic.name}"
            
            # Render HTML content
            html_content = f'''
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: #1e40af; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                    .content {{ background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
                    .footer {{ background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2 style="margin: 0;">Clinical Note</h2>
                        <p style="margin: 5px 0 0 0;">{context['clinic_name']}</p>
                    </div>
                    <div class="content">
                        <p><strong>Patient:</strong> {context['patient_name']}</p>
                        <p><strong>Date:</strong> {context['date']}</p>
                        <p><strong>Practitioner:</strong> {context['practitioner_name']}</p>
                        <p><strong>Template:</strong> {context['template_name']}</p>
                        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                        {context['sections_html']}
                    </div>
                    <div class="footer">
                        <p>This is an automated message from {context['clinic_name']}. Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
            '''
            
            # Send email
            email = EmailMultiAlternatives(
                subject=subject,
                from_email=getattr(clinic, 'email', settings.DEFAULT_FROM_EMAIL),
                to=[patient.email]
            )
            email.attach_alternative(html_content, 'text/html')
            email.send(fail_silently=False)
            
            # Log the email action
            ClinicalNoteAuditLog.objects.create(
                clinical_note=note,
                user=request.user,
                action='EMAILED',
                ip_address=self._get_client_ip(),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({'detail': f'Clinical note sent to {patient.email}'})
            
        except Exception as e:
            return Response(
                {'detail': f'Failed to send email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def print_note(self, request, pk=None):
        """
        Get printable version of clinical note.
        
        GET /api/clinical-notes/{id}/print_note/
        """
        note = self.get_object()
        patient = note.patient
        clinic = note.clinic
        
        # Get practitioner user for avatar and profile
        practitioner_user = None
        practitioner_avatar = None
        practitioner_initials = ''
        if note.practitioner and note.practitioner.user:
            practitioner_user = note.practitioner.user
            # Get avatar URL from user model
            if hasattr(practitioner_user, 'avatar') and practitioner_user.avatar:
                practitioner_avatar = practitioner_user.avatar.url if hasattr(practitioner_user.avatar, 'url') else str(practitioner_user.avatar)
            # Generate initials
            first = getattr(practitioner_user, 'first_name', '') or ''
            last = getattr(practitioner_user, 'last_name', '') or ''
            practitioner_initials = f"{first[0] if first else ''}{last[0] if last else ''}".upper()
        
        # Build the formatted note content for printing
        content = note.content
        sections = []
        
        if note.template and note.template.structure:
            template_structure = note.template.structure
            for section in template_structure.get('sections', []):
                section_title = section.get('title', '')
                section_description = section.get('description', '')
                section_fields = section.get('fields', [])
                
                fields = []
                for field in section_fields:
                    field_id = field.get('id', '')
                    field_label = field.get('label', '')
                    field_value = content.get(field_id, '')
                    
                    if field_value:
                        if isinstance(field_value, list):
                            field_value = ', '.join(field_value)
                        fields.append({
                            'label': field_label,
                            'value': str(field_value)
                        })
                
                if fields:
                    sections.append({
                        'title': section_title,
                        'description': section_description,
                        'fields': fields
                    })
        
        # If no template structure, show raw content
        if not sections and content:
            raw_fields = []
            for key, value in content.items():
                if value:
                    if isinstance(value, list):
                        value = ', '.join(value)
                    raw_fields.append({
                        'label': key.replace('_', ' ').title(),
                        'value': str(value)
                    })
            if raw_fields:
                sections.append({
                    'title': 'Clinical Note Content',
                    'description': '',
                    'fields': raw_fields
                })
        
        # Format date/time for header
        note_date = note.date if note.date else None
        now = timezone.now()
        
        day_name = ''
        month = ''
        day = ''
        year = ''
        time_str = ''
        
        if note_date:
            # Day name (Monday, Tuesday, etc.)
            day_name = note_date.strftime('%A')
            # Month name
            month = note_date.strftime('%B')
            # Day number
            day = str(note_date.day)
            # Year
            year = str(note_date.year)
        
        # Use created_at for time or default to current time
        note_time = note.created_at if note.created_at else now
        time_str = note_time.strftime('%I:%M %p')
        
        response_data = {
            'patient_name': patient.get_full_name(),
            'patient_number': patient.patient_number,
            'clinic_name': clinic.name,
            'clinic_address': getattr(clinic, 'address', ''),
            'clinic_phone': getattr(clinic, 'phone', ''),
            'clinic_email': getattr(clinic, 'email', ''),
            'practitioner_name': practitioner_user.get_full_name() if practitioner_user else 'Practitioner',
            'practitioner_title': getattr(practitioner_user, 'title', '') if practitioner_user else '',
            'practitioner_avatar': practitioner_avatar,
            'practitioner_initials': practitioner_initials,
            'date': note.date.isoformat() if note.date else None,
            'day_name': day_name,
            'month': month,
            'day': day,
            'year': year,
            'time': time_str,
            'template_name': note.template.name if note.template else 'Clinical Note',
            'template_category': note.template.category if note.template else 'CLINICAL',
            'note_type': note.note_type,
            'is_signed': note.is_signed,
            'signed_at': note.signed_at.isoformat() if note.signed_at else None,
            'created_at': note.created_at.isoformat() if note.created_at else None,
            'sections': sections,
        }
        
        return Response(response_data)
    
    @action(detail=True, methods=['get'])
    def print_note_html(self, request, pk=None):
        """
        Get rendered HTML version of clinical note for printing.
        
        GET /api/clinical-notes/{id}/print_note_html/
        """
        # Call print_note to get the data
        print_note_response = self.print_note(request, pk)
        note_data = print_note_response.data
        
        # Render the template
        html_content = render_to_string('clinical_templates/print_note.html', {
            'note': note_data,
            'practitioner_avatar': note_data.get('practitioner_avatar'),
            'practitioner_initials': note_data.get('practitioner_initials', ''),
        })
        
        return HttpResponse(html_content, content_type='text/html')