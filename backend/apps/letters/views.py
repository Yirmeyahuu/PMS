from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import LetterTemplate, Letter
from .serializers import LetterTemplateSerializer, LetterSerializer
from apps.records.models import CaseDocument
from .services import LetterGeneratorService
from apps.patients.models import Patient
from django.core.files.base import ContentFile

import logging

logger = logging.getLogger(__name__)


class LetterTemplateViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for letter templates.

    Permissions:
    - All authenticated clinic users: Create, Read, Update
    - Admin only: Delete
    Security: Scoped to user's clinic
    """

    queryset = LetterTemplate.objects.filter(is_deleted=False)
    serializer_class = LetterTemplateSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at', 'version']

    def get_queryset(self):
        return self.queryset.filter(clinic=self.request.user.clinic)

    @action(detail=True, methods=['post'])
    def create_version(self, request, pk=None):
        """Create a new version of an existing letter template."""
        template = self.get_object()
        new_version = template.create_new_version(request.user)
        serializer = self.get_serializer(new_version)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active templates."""
        templates = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def merge_field_options(self, request):
        """
        Return the list of all available merge fields for the template editor.
        """
        fields = {
            'patient': [
                {'key': '{{patient.full_name}}', 'label': 'Patient Full Name'},
                {'key': '{{patient.first_name}}', 'label': 'Patient First Name'},
                {'key': '{{patient.last_name}}', 'label': 'Patient Last Name'},
                {'key': '{{patient.date_of_birth}}', 'label': 'Date of Birth'},
                {'key': '{{patient.email}}', 'label': 'Patient Email'},
                {'key': '{{patient.phone}}', 'label': 'Patient Phone'},
                {'key': '{{patient.address}}', 'label': 'Patient Address'},
                {'key': '{{patient.patient_number}}', 'label': 'Patient Number'},
            ],
            'clinic': [
                {'key': '{{clinic.name}}', 'label': 'Clinic Name'},
                {'key': '{{clinic.address}}', 'label': 'Clinic Address'},
                {'key': '{{clinic.phone}}', 'label': 'Clinic Phone'},
                {'key': '{{clinic.email}}', 'label': 'Clinic Email'},
            ],
            'practitioner': [
                {'key': '{{practitioner.full_name}}', 'label': 'Practitioner Full Name'},
                {'key': '{{practitioner.title}}', 'label': 'Practitioner Title'},
                {'key': '{{practitioner.specialization}}', 'label': 'Specialization'},
            ],
            'case': [
                {'key': '{{case.title}}', 'label': 'Case Title'},
                {'key': '{{case.status}}', 'label': 'Case Status'},
            ],
            'date': [
                {'key': '{{today.date}}', 'label': "Today's Date (long)"},
                {'key': '{{today.date_short}}', 'label': "Today's Date (short)"},
            ],
        }
        return Response(fields)


class LetterViewSet(viewsets.ModelViewSet):
    """
    CRUD operations for generated letters.

    Permissions:
    - Practitioners: Create/edit their own letters
    - Admins: Full access
    Security: Scoped to user's clinic
    """

    queryset = Letter.objects.filter(is_deleted=False).select_related(
        'patient', 'practitioner__user', 'template', 'patient_case', 'clinic'
    )
    serializer_class = LetterSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['patient', 'patient_case', 'practitioner', 'status', 'template']
    search_fields = ['subject', 'patient__first_name', 'patient__last_name']
    ordering_fields = ['created_at', 'sent_at']

    def get_queryset(self):
        user = self.request.user
        qs = self.queryset.filter(clinic=user.clinic)
        # Practitioners see only their own letters
        if user.is_practitioner and not user.is_admin:
            qs = qs.filter(practitioner__user=user)
        return qs

    def perform_update(self, serializer):
        if 'content_html' in serializer.validated_data:
            from .services import LetterGeneratorService
            letter = self.get_object()
            resolved_content = LetterGeneratorService.replace_variables(
                serializer.validated_data['content_html'],
                patient=letter.patient,
                practitioner=letter.practitioner,
                patient_case=letter.patient_case,
                appointment=letter.appointment,
                letter=letter
            )
            serializer.validated_data['content_html'] = resolved_content

        letter = serializer.save()
        # Regenerate PDF if content or layout changed
        if any(field in serializer.validated_data for field in ['content_html', 'layout_letter_head', 'layout_remove_top_space', 'layout_date', 'layout_addressee', 'subject']):
            try:
                from .services import LetterGeneratorService
                generator = LetterGeneratorService(letter)
                generator.generate_pdf()
            except Exception as e:
                logger.error(f"Failed to regenerate PDF on letter update {letter.id}: {e}")

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """
        Generates a new Letter from a template.
        Expects: template_id, patient_id, subject
        Optional: patient_case_id
        """
        template_id = request.data.get('template_id')
        patient_id = request.data.get('patient_id')
        subject = request.data.get('subject')
        patient_case_id = request.data.get('patient_case_id')
        appointment_id = request.data.get('appointment_id')

        if not all([template_id, patient_id, subject]):
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            template = LetterTemplate.objects.get(id=template_id, clinic=request.user.clinic)
            patient = Patient.objects.get(id=patient_id, clinic=request.user.clinic)
            practitioner = getattr(request.user, 'practitioner_profile', None)
            
            # Fetch Case and Appointment
            from apps.patients.models import PatientCase
            from apps.appointments.models import Appointment
            patient_case = PatientCase.objects.filter(id=patient_case_id, patient__clinic=request.user.clinic).first() if patient_case_id else None
            appointment = Appointment.objects.filter(id=appointment_id, patient__clinic=request.user.clinic).first() if appointment_id else None

            # Layout Controls Injection
            layout_letter_head = request.data.get('layout_letter_head', template.layout_letter_head)
            layout_remove_top_space = request.data.get('layout_remove_top_space', template.layout_remove_top_space)
            layout_date = request.data.get('layout_date', template.layout_date)
            layout_addressee = request.data.get('layout_addressee', template.layout_addressee)
            
            layout_html = ""
            
            if layout_letter_head:
                layout_html += f"""
                <div style="margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; font-family: sans-serif;">
                    <h2 style="margin: 0; color: #333;">{request.user.clinic.name}</h2>
                    <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">{request.user.clinic.address}</p>
                    <p style="color: #666; font-size: 12px; margin: 2px 0 0 0;">{request.user.clinic.phone} | {request.user.clinic.email}</p>
                </div>
                """

            if layout_date:
                from django.utils import timezone
                layout_html += f"""
                <div style="margin-bottom: 20px; font-family: sans-serif;">
                    <p style="margin: 0;">{timezone.now().strftime('%d %B %Y')}</p>
                </div>
                """

            if layout_addressee and patient:
                layout_html += f"""
                <div style="margin-bottom: 30px; font-family: sans-serif;">
                    <p style="font-weight: bold; margin: 0;">{patient.get_full_name()}</p>
                    <p style="margin: 2px 0 0 0;">{patient.address}</p>
                    <p style="margin: 2px 0 0 0;">{patient.city} {patient.province} {patient.postal_code}</p>
                </div>
                """

            # 1. Render content for Header, Body, Footer
            rendered_header = LetterGeneratorService.replace_variables(
                template.header_html or '',
                patient=patient,
                practitioner=practitioner,
                patient_case=patient_case,
                appointment=appointment
            )
            
            # Use provided content_html if given, otherwise render it
            custom_content = request.data.get('content_html')
            if custom_content is not None:
                rendered_content = LetterGeneratorService.replace_variables(
                    custom_content,
                    patient=patient,
                    practitioner=practitioner,
                    patient_case=patient_case,
                    appointment=appointment
                )
            else:
                rendered_content = LetterGeneratorService.replace_variables(
                    template.content_html or '',
                    patient=patient,
                    practitioner=practitioner,
                    patient_case=patient_case,
                    appointment=appointment
                )
                
            rendered_footer = LetterGeneratorService.replace_variables(
                template.footer_html or '',
                patient=patient,
                practitioner=practitioner,
                patient_case=patient_case,
                appointment=appointment
            )
            
            # Wrap content if removing top space
            top_margin = "0px" if layout_remove_top_space else "40px"
            wrapper_start = f"<div style='padding-top: {top_margin};'>"
            wrapper_end = "</div>"
            
            # Optionally wrap in header/footer
            full_html = f"{wrapper_start}{layout_html}{rendered_header}{rendered_content}{rendered_footer}{wrapper_end}"
            
            # 2. Generate PDF
            pdf_bytes = LetterGeneratorService.generate_pdf(full_html)
            
            # 3. Create Letter record
            letter = Letter.objects.create(
                clinic=request.user.clinic,
                patient=patient,
                patient_case=patient_case,
                appointment=appointment,
                practitioner=practitioner,
                template=template,
                subject=subject,
                content_html=rendered_content,
                status='DRAFT',
                layout_letter_head=layout_letter_head,
                layout_remove_top_space=layout_remove_top_space,
                layout_date=layout_date,
                layout_addressee=layout_addressee
            )
            
            # Save PDF file
            file_name = f"Letter_{letter.id}_{patient.get_full_name().replace(' ', '_')}.pdf"
            letter.rendered_pdf.save(file_name, ContentFile(pdf_bytes), save=True)
            
            # 4. Sync to CaseDocument
            CaseDocument.objects.create(
                patient=patient,
                patient_case_id=patient_case_id,
                clinic=request.user.clinic,
                uploaded_by=request.user,
                title=subject,
                category='LETTER',
                source_type='LETTER',
                source_id=letter.id,
                file=letter.rendered_pdf,
                file_name=file_name,
                file_size=len(pdf_bytes),
                mime_type='application/pdf'
            )
            
            return Response(self.get_serializer(letter).data, status=status.HTTP_201_CREATED)
            
        except LetterTemplate.DoesNotExist:
            return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)
        except Patient.DoesNotExist:
            return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Letter generation error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def preview(self, request):
        """
        Returns the rendered content_html with dynamic variables replaced.
        """
        template_id = request.data.get('template_id')
        patient_id = request.data.get('patient_id')
        patient_case_id = request.data.get('patient_case_id')
        appointment_id = request.data.get('appointment_id')

        if not all([template_id, patient_id]):
            return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            template = LetterTemplate.objects.get(id=template_id, clinic=request.user.clinic)
            patient = Patient.objects.get(id=patient_id, clinic=request.user.clinic)
            practitioner = getattr(request.user, 'practitioner', None)
            
            from apps.patients.models import PatientCase
            from apps.appointments.models import Appointment
            patient_case = PatientCase.objects.filter(id=patient_case_id, patient__clinic=request.user.clinic).first() if patient_case_id else None
            appointment = Appointment.objects.filter(id=appointment_id, patient__clinic=request.user.clinic).first() if appointment_id else None

            # Layout Controls Injection
            layout_letter_head = request.data.get('layout_letter_head', template.layout_letter_head)
            layout_remove_top_space = request.data.get('layout_remove_top_space', template.layout_remove_top_space)
            layout_date = request.data.get('layout_date', template.layout_date)
            layout_addressee = request.data.get('layout_addressee', template.layout_addressee)
            
            layout_html = ""
            
            # Clinic Letter Head is typically handled by rendering the PDF template wrapper in services,
            # but we can optionally inject it into the HTML here if layout_letter_head is true.
            # Actually, standard practice here is to prepend it:
            if layout_letter_head:
                layout_html += f"""
                <div style="margin-bottom: 20px; border-bottom: 1px solid #ddd; padding-bottom: 10px; font-family: sans-serif;">
                    <h2 style="margin: 0; color: #333;">{request.user.clinic.name}</h2>
                    <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">{request.user.clinic.address}</p>
                    <p style="color: #666; font-size: 12px; margin: 2px 0 0 0;">{request.user.clinic.phone} | {request.user.clinic.email}</p>
                </div>
                """

            if layout_date:
                from django.utils import timezone
                layout_html += f"""
                <div style="margin-bottom: 20px; font-family: sans-serif;">
                    <p style="margin: 0;">{timezone.now().strftime('%d %B %Y')}</p>
                </div>
                """

            if layout_addressee and patient:
                layout_html += f"""
                <div style="margin-bottom: 30px; font-family: sans-serif;">
                    <p style="font-weight: bold; margin: 0;">{patient.get_full_name()}</p>
                    <p style="margin: 2px 0 0 0;">{patient.address}</p>
                    <p style="margin: 2px 0 0 0;">{patient.city} {patient.province} {patient.postal_code}</p>
                </div>
                """

            # Render content for Header, Body, Footer
            rendered_header = LetterGeneratorService.replace_variables(
                template.header_html or '',
                patient=patient,
                practitioner=practitioner,
                patient_case=patient_case,
                appointment=appointment
            )
            rendered_content = LetterGeneratorService.replace_variables(
                template.content_html or '',
                patient=patient,
                practitioner=practitioner,
                patient_case=patient_case,
                appointment=appointment
            )
            rendered_footer = LetterGeneratorService.replace_variables(
                template.footer_html or '',
                patient=patient,
                practitioner=practitioner,
                patient_case=patient_case,
                appointment=appointment
            )
            
            # Wrap content if removing top space
            top_margin = "0px" if layout_remove_top_space else "40px"
            wrapper_start = f"<div style='padding-top: {top_margin};'>"
            wrapper_end = "</div>"
            
            # Optionally wrap in header/footer for preview display
            full_html = f"{wrapper_start}{layout_html}{rendered_header}\n<br>\n{rendered_content}\n<br>\n{rendered_footer}{wrapper_end}"

            return Response({
                'content_html': rendered_content, 
                'full_html': full_html,
                'layout_letter_head': layout_letter_head,
                'layout_remove_top_space': layout_remove_top_space,
                'layout_date': layout_date,
                'layout_addressee': layout_addressee
            })

        except Exception as e:
            logger.error(f"Letter preview error: {e}")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def sign(self, request, pk=None):
        """Sign and finalize a letter."""
        from django.utils import timezone

        letter = self.get_object()
        signature = request.data.get('signature_data', '')

        letter.is_signed = True
        letter.signed_at = timezone.now()
        letter.status = 'FINAL'
        if signature:
            letter.signature_data = signature
        letter.save(update_fields=[
            'is_signed', 'signed_at', 'status', 'signature_data',
        ])

        serializer = self.get_serializer(letter)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send letter via email with PDF attachment."""
        from django.utils import timezone
        import threading
        from django.core.mail import EmailMessage
        from django.conf import settings

        letter = self.get_object()
        
        # Parse multipart form data
        recipients_raw = request.data.get('to', '')
        subject = request.data.get('subject', f"Clinical Letter - {letter.subject}")
        body = request.data.get('body', '')
        
        if recipients_raw:
            recipients = [e.strip() for e in recipients_raw.replace(';', ',').split(',') if e.strip()]
        else:
            recipients = [letter.patient.email] if letter.patient and letter.patient.email else []

        if not recipients:
            return Response(
                {'detail': 'No recipient email provided.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        attachment_bytes = None
        if 'attachment' in request.FILES:
            attachment_bytes = request.FILES['attachment'].read()
        elif letter.rendered_pdf:
            try:
                attachment_bytes = letter.rendered_pdf.read()
            except Exception as e:
                logger.error(f"Could not read rendered_pdf for letter {letter.id}: {e}")

        def _send():
            try:
                clinic = request.user.clinic if hasattr(request.user, 'clinic') else None
                from_email = getattr(clinic, 'email', None) or settings.DEFAULT_FROM_EMAIL
                email_msg = EmailMessage(
                    subject=subject,
                    body=body,
                    from_email=from_email,
                    to=recipients,
                )
                if attachment_bytes:
                    patient_slug = letter.patient.get_full_name().replace(' ', '-').lower() if letter.patient else 'patient'
                    email_msg.attach(
                        f"clinical-letter-{patient_slug}.pdf",
                        attachment_bytes,
                        'application/pdf',
                    )
                email_msg.send(fail_silently=True)
            except Exception as e:
                logger.error(f"Failed to send email for letter {letter.id}: {e}")

        threading.Thread(target=_send, daemon=True).start()

        # Mark as sent
        letter.status = 'SENT'
        letter.sent_to = recipients
        letter.sent_at = timezone.now()
        letter.save(update_fields=['status', 'sent_to', 'sent_at'])

        logger.info(f"Letter {letter.id} sent to {recipients}")
        return Response({'detail': f"Letter sent to {', '.join(recipients)}"})

    @action(detail=True, methods=['post'])
    def replicate(self, request, pk=None):
        """Replicate a clinical letter."""
        letter = self.get_object()
        
        # Deep copy
        new_letter = Letter.objects.get(pk=letter.pk)
        new_letter.pk = None
        new_letter.status = 'DRAFT'
        new_letter.is_signed = False
        new_letter.signature_data = None
        new_letter.sent_at = None
        new_letter.sent_to = []
        new_letter.created_by = request.user
        
        # Append ' (Copy)' to subject
        new_letter.subject = f"{new_letter.subject} (Copy)"
        
        # We don't copy the rendered_pdf as it needs to be generated afresh,
        # but wait, if it's identical initially, it should just be regenerated on next save.
        new_letter.rendered_pdf = None
        new_letter.save()

        # Regenerate PDF for the new letter using its content
        try:
            generator = LetterGeneratorService(new_letter)
            generator.generate_pdf()
        except Exception as e:
            logger.error(f"Failed to generate PDF for replicated letter {new_letter.id}: {e}")

        serializer = self.get_serializer(new_letter)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
