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
    ClinicalTemplateSerializer, ClinicalNoteSerializer, ClinicalNoteAuditLogSerializer, ClinicalNoteVersionSerializer
)
from .permissions import (
    IsAdminOrReadOnly, IsSameClinic, IsPractitionerOrAdmin, CanEditClinicalNote
)
from apps.billing.authentication import QueryParamJWTAuthentication


class ClinicalTemplateViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for clinical templates.
    
    Permissions:
    - All authenticated users: Create, Read, Update
    - Admin: Delete
    
    Security: Scoped to user's clinic
    """
    
    queryset = ClinicalTemplate.objects.filter(is_deleted=False)
    serializer_class = ClinicalTemplateSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly, IsSameClinic]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'discipline', 'is_active', 'is_archived']
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
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'practitioner', 'date', 'status', 'template', 'appointment', 'patient_case']
    search_fields = ['patient__first_name', 'patient__last_name']
    ordering_fields = ['date', 'created_at']
    
    def get_permissions(self):
        """Use CanEditClinicalNote for update/delete"""
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), CanEditClinicalNote()]
        return super().get_permissions()
    
    def get_queryset(self):
        """Filter notes by user's clinic branches and role"""
        user = self.request.user
        
        # 1. Base filter: restrict to allowed branches based on RBAC
        from apps.accounts.utils.rbac import validate_branch_access
        allowed_branches, is_branch_restricted = validate_branch_access(user)
        
        if is_branch_restricted:
            if allowed_branches:
                queryset = self.queryset.filter(clinic_id__in=allowed_branches)
            else:
                return self.queryset.none()
        else:
            # If not restricted (ADMIN), show all branches in their clinic network
            if user.clinic:
                main_clinic = user.clinic.parent_clinic if user.clinic.parent_clinic else user.clinic
                from django.db.models import Q
                queryset = self.queryset.filter(
                    Q(clinic=main_clinic) | Q(clinic__parent_clinic=main_clinic)
                )
            else:
                return self.queryset.none()
            
        # Filter out notes belonging to archived cases
        from django.db.models import Q
        queryset = queryset.filter(Q(patient_case__isnull=True) | Q(patient_case__is_archived=False))
        
        # If filtering by patient, log that too
        patient_filter = self.request.query_params.get('patient')
        if patient_filter:
            print(f'[ClinicalNoteViewSet] Patient filter: {patient_filter}')
        
        print(f'[ClinicalNoteViewSet] Final queryset count: {queryset.count()}')
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Override create to log what's being saved"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f'[ClinicalNote Create] Request.data: {request.data}')
        return super().create(request, *args, **kwargs)
        
    def update(self, request, *args, **kwargs):
        """Override update to log what's being saved"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f'[ClinicalNote Edit] Request.data: {request.data}')
        return super().update(request, *args, **kwargs)
    

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """
        Archive a clinical note (soft delete).
        
        POST /api/clinical-notes/{id}/archive/
        """
        note = self.get_object()
        
        # Check permissions - only admin, or the note's practitioner can archive
        if not (request.user.is_admin or note.practitioner.user == request.user):
            return Response(
                {'detail': 'You do not have permission to archive this note'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        note.is_deleted = True
        note.save(update_fields=['is_deleted'])
        
        # Log archiving
        ClinicalNoteAuditLog.objects.create(
            clinical_note=note,
            user=request.user,
            action='DELETED',
            ip_address=self._get_client_ip(),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({'detail': 'Clinical note archived successfully'})
    
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """
        Restore an archived (soft-deleted) clinical note.
        
        POST /api/clinical-notes/{id}/restore/
        """
        # Get the archived note directly (not through get_object which filters is_deleted=False)
        try:
            note = ClinicalNote.objects.get(pk=pk, is_deleted=True)
        except ClinicalNote.DoesNotExist:
            return Response(
                {'detail': 'Archived note not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check permissions
        if not (request.user.is_admin or request.user.is_superuser):
            return Response(
                {'detail': 'You do not have permission to restore this note'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check for duplicate: if there's already an active note for the same appointment
        existing_note = ClinicalNote.objects.filter(
            patient=note.patient,
            appointment=note.appointment,
            is_deleted=False
        ).exclude(pk=note.pk).first()
        
        if existing_note:
            return Response(
                {'detail': 'Cannot restore: A clinical note already exists for this session'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        note.is_deleted = False
        note.save(update_fields=['is_deleted'])
        
        # Log restoration
        ClinicalNoteAuditLog.objects.create(
            clinical_note=note,
            user=request.user,
            action='RESTORED',
            ip_address=self._get_client_ip(),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response({'detail': 'Clinical note restored successfully'})
    
    @action(detail=False, methods=['get'])
    def archived(self, request):
        """
        Get archived (soft-deleted) clinical notes for a patient.
        
        GET /api/clinical-notes/archived/?patient={patient_id}
        """
        from apps.clinical_templates.models import ClinicalNote
        
        patient_id = request.query_params.get('patient')
        if not patient_id:
            return Response(
                {'detail': 'patient parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Query directly from ClinicalNote to include archived (deleted) notes
        notes = ClinicalNote.objects.filter(
            is_deleted=True,
            patient_id=patient_id
        ).select_related(
            'patient', 'practitioner__user', 'appointment', 'template', 'clinic'
        )
        
        serializer = self.get_serializer(notes, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def autosave(self, request, pk=None):
        """
        Auto-save draft note without validation.
        
        POST /api/clinical-notes/{id}/autosave/
        Body: { "content": {...} }
        """
        note = self.get_object()
        

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
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Get version history for a clinical note.
        
        GET /api/clinical-notes/{id}/history/
        """
        note = self.get_object()
        versions = note.versions.all().order_by('-version_number')
        serializer = ClinicalNoteVersionSerializer(versions, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], url_path=r'history/(?P<version_id>\d+)')
    def history_detail(self, request, pk=None, version_id=None):
        """
        Get a specific version of a clinical note.
        
        GET /api/clinical-notes/{id}/history/{version_id}/
        """
        note = self.get_object()
        try:
            from .models import ClinicalNoteVersion
            version = note.versions.get(id=version_id)
        except ClinicalNoteVersion.DoesNotExist:
            return Response(
                {'detail': 'Version not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ClinicalNoteVersionSerializer(version, context={'request': request})
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
        Send clinical note via email with optional PDF attachment.

        POST /api/clinical-notes/{id}/email_note/
        Accepts multipart/form-data OR JSON.
        Fields: to (comma-sep emails), subject, body, attachment (PDF file).
        """
        note = self.get_object()
        patient = note.patient
        clinic = note.clinic

        # Parse fields from multipart or JSON
        is_multipart = request.content_type and 'multipart/form-data' in request.content_type
        if is_multipart:
            to_raw = request.POST.get('to', '')
            subject = request.POST.get('subject', '')
            body = request.POST.get('body', '')
        else:
            to_raw = request.data.get('to', '')
            subject = request.data.get('subject', '')
            body = request.data.get('body', '')

        # Parse recipient list — fallback to patient email
        if to_raw:
            recipients = [e.strip() for e in to_raw.replace(';', ',').split(',') if e.strip()]
        else:
            recipients = [patient.email] if patient.email else []

        if not recipients:
            return Response(
                {'detail': 'No recipient email address provided and patient has no email on file.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Default subject/body if blank
        note_date_str = note.date.strftime('%B %d, %Y') if note.date else ''
        if not subject:
            subject = f"Clinical Note – {note_date_str} – {clinic.name}"
        if not body:
            body = (
                f"Dear {patient.get_full_name()},\n\n"
                f"Please find attached your clinical note from your recent appointment on {note_date_str}.\n\n"
                f"Best regards,\n{clinic.name}"
            )

        # Read attachment bytes now (before the thread, so the file handle stays valid)
        attachment_bytes = None
        patient_slug = patient.get_full_name().replace(' ', '-').lower()
        if is_multipart and 'attachment' in request.FILES:
            attachment_bytes = request.FILES['attachment'].read()

        # Audit log immediately (before background thread)
        ClinicalNoteAuditLog.objects.create(
            clinical_note=note,
            user=request.user,
            action='EMAILED',
            ip_address=self._get_client_ip(),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )

        # Send email in a background thread so the HTTP response returns immediately
        import threading
        from django.core.mail import EmailMessage

        def _send():
            try:
                email_msg = EmailMessage(
                    subject=subject,
                    body=body,
                    from_email=getattr(clinic, 'email', None) or settings.DEFAULT_FROM_EMAIL,
                    to=recipients,
                )
                if attachment_bytes:
                    email_msg.attach(
                        f"clinical-note-{patient_slug}.pdf",
                        attachment_bytes,
                        'application/pdf',
                    )
                email_msg.send(fail_silently=True)
            except Exception:
                pass

        threading.Thread(target=_send, daemon=True).start()

        return Response({'detail': f"Clinical note sent to {', '.join(recipients)}"})
    
    @action(detail=True, methods=['get'])
    def print_note(self, request, pk=None):
        """
        Get printable version of clinical note.
        
        GET /api/clinical-notes/{id}/print_note/
        """
        note = self.get_object()
        patient = note.patient
        clinic = note.clinic
        
        # Feedback #2: Resolve actual Clinical Note creator
        creator_user = note.created_by
        creator_avatar = None
        creator_initials = ''
        if creator_user:
            if hasattr(creator_user, 'avatar') and creator_user.avatar:
                raw_url = creator_user.avatar.url if hasattr(creator_user.avatar, 'url') else str(creator_user.avatar)
                creator_avatar = request.build_absolute_uri(raw_url)
            first = getattr(creator_user, 'first_name', '') or ''
            last = getattr(creator_user, 'last_name', '') or ''
            creator_initials = f"{first[0] if first else ''}{last[0] if last else ''}".upper()
            
        # Get assigned practitioner for reference
        practitioner_user = None
        practitioner_avatar = None
        practitioner_initials = ''
        if note.practitioner and note.practitioner.user:
            practitioner_user = note.practitioner.user
            # Get avatar URL from user model
            if hasattr(practitioner_user, 'avatar') and practitioner_user.avatar:
                raw_url = practitioner_user.avatar.url if hasattr(practitioner_user.avatar, 'url') else str(practitioner_user.avatar)
                practitioner_avatar = request.build_absolute_uri(raw_url)
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
                    field_type = field.get('type', '')
                    field_value = content.get(field_id, '')
                    
                    if field_value:
                        # Chart fields: value is a base64 PNG string — render as image in print
                        if field_type == 'chart' and isinstance(field_value, str) and field_value.startswith('data:image/'):
                            fields.append({
                                'label': field_label,
                                'value': '',
                                'image': field_value,
                            })
                        else:
                            if isinstance(field_value, list):
                                field_value = ', '.join(str(v) for v in field_value)
                            elif isinstance(field_value, dict):
                                # Fallback: stringify dicts that weren't handled above
                                field_value = str(field_value)
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
            def get_ordinal(n):
                if 11 <= (n % 100) <= 13:
                    return 'th'
                return ['th', 'st', 'nd', 'rd', 'th'][min(n % 10, 4)]
                
            # Day name (Monday, Tuesday, etc.)
            day_name = note_date.strftime('%A')
            # Month name
            month = note_date.strftime('%B')
            # Day number with ordinal
            day_num = note_date.day
            day = f"{day_num}{get_ordinal(day_num)}"
            # Year
            year = str(note_date.year)
        
        # Use created_at for time or default to current time
        note_time = note.created_at if note.created_at else now
        time_str = note_time.strftime('%I:%M %p')
        
        response_data = {
            'patient_name': patient.get_full_name(),
            'patient_number': patient.patient_number,
            'patient_email': getattr(patient, 'email', '') or '',
            'clinic_name': clinic.name,
            'clinic_logo': getattr(clinic, 'logo', None) and clinic.logo.url or '',
            'clinic_address': getattr(clinic, 'address', ''),
            'clinic_phone': getattr(clinic, 'phone', ''),
            'clinic_email': getattr(clinic, 'email', ''),
            'created_by_name': creator_user.get_full_name() if creator_user else (practitioner_user.get_full_name() if practitioner_user else 'Practitioner'),
            'created_by_title': getattr(creator_user, 'title', '') if creator_user else (getattr(practitioner_user, 'title', '') if practitioner_user else ''),
            'created_by_avatar': creator_avatar or practitioner_avatar,
            'created_by_initials': creator_initials or practitioner_initials,
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
            'status': note.status,
            'signed_at': note.signed_at.isoformat() if note.signed_at else None,
            'created_at': note.created_at.isoformat() if note.created_at else None,
            'sections': sections,
        }
        
        return Response(response_data)
    
    @action(
        detail=True, 
        methods=['get'],
        authentication_classes=[QueryParamJWTAuthentication],
    )
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
from rest_framework.pagination import PageNumberPagination

class AuditLogPagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = 'page_size'
    max_page_size = 100

class GlobalClinicalNoteAuditViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Global access to all Clinical Note Audit Logs in the clinic.
    
    Permissions:
    - Owners/Managers/Staff: See all audit logs in the clinic.
    - Practitioners: See only audit logs for notes they authored/own.
    """
    queryset = ClinicalNoteAuditLog.objects.all().select_related(
        'user', 'clinical_note', 'clinical_note__patient', 'clinical_note__practitioner__user'
    )
    permission_classes = [IsAuthenticated]
    pagination_class = AuditLogPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'user', 'clinical_note__patient', 'clinical_note']
    search_fields = ['clinical_note__patient__first_name', 'clinical_note__patient__last_name', 'user__first_name', 'user__last_name']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        from .serializers import GlobalClinicalNoteAuditLogSerializer
        return GlobalClinicalNoteAuditLogSerializer

    def get_queryset(self):
        user = self.request.user
        
        # 1. Base filter: restrict to allowed branches based on RBAC
        from apps.accounts.utils.rbac import validate_branch_access
        allowed_branches, is_branch_restricted = validate_branch_access(user)
        
        if is_branch_restricted:
            if allowed_branches:
                qs = self.queryset.filter(clinical_note__clinic_id__in=allowed_branches)
            else:
                return self.queryset.none()
        else:
            # If not restricted (ADMIN), show all branches in their clinic network
            if user.clinic:
                main_clinic = user.clinic.parent_clinic if user.clinic.parent_clinic else user.clinic
                from django.db.models import Q
                qs = self.queryset.filter(
                    Q(clinical_note__clinic=main_clinic) | Q(clinical_note__clinic__parent_clinic=main_clinic)
                )
            else:
                return self.queryset.none()
            
        # 3. Optional date range filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(created_at__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__lte=f"{end_date} 23:59:59")
            
        return qs
