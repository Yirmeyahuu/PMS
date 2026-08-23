import re
from django.utils import timezone
from apps.patients.models import Patient
from apps.clinics.models import Practitioner
from apps.records.models import ClinicalNote
from apps.patients.services.session_engine import SessionEngine

class LetterGeneratorService:
    """
    Handles parsing letter templates, replacing dynamic variables,
    and triggering PDF generation.
    """

    SUPPORTED_VARIABLES = {
        # Patient (Client)
        '{{patient.title}}': lambda p, pr, n, c, a, l: '',
        '{{patient.first_name}}': lambda p, pr, n, c, a, l: p.first_name if p else '',
        '{{patient.middle_initial}}': lambda p, pr, n, c, a, l: p.middle_name[0].upper() + '.' if p and p.middle_name else '',
        '{{patient.last_name}}': lambda p, pr, n, c, a, l: p.last_name if p else '',
        '{{patient.full_name}}': lambda p, pr, n, c, a, l: p.get_full_name() if p else '',
        '{{patient.sex}}': lambda p, pr, n, c, a, l: p.get_gender_display() if p and hasattr(p, 'get_gender_display') else '',
        '{{patient.gender}}': lambda p, pr, n, c, a, l: p.get_gender_display() if p and hasattr(p, 'get_gender_display') else '',
        '{{patient.dob}}': lambda p, pr, n, c, a, l: p.date_of_birth.strftime('%d/%m/%Y') if p and p.date_of_birth else '',
        '{{patient.email}}': lambda p, pr, n, c, a, l: p.email if p else '',
        '{{patient.phone}}': lambda p, pr, n, c, a, l: p.phone_number if p else (p.phone if hasattr(p, 'phone') else ''),
        '{{patient.address}}': lambda p, pr, n, c, a, l: p.address if p else '',
        
        # Patient Doctor (Case Primary Practitioner)
        '{{patient.doctor.automatic}}': lambda p, pr, n, c, a, l: c.primary_practitioner.user.get_full_name() if c and c.primary_practitioner else '',
        '{{patient.doctor.company}}': lambda p, pr, n, c, a, l: c.primary_practitioner.clinic.name if c and c.primary_practitioner and c.primary_practitioner.clinic else '',
        '{{patient.doctor.title}}': lambda p, pr, n, c, a, l: c.primary_practitioner.user.title if c and c.primary_practitioner and hasattr(c.primary_practitioner.user, 'title') and c.primary_practitioner.user.title else (c.primary_practitioner.title if c and c.primary_practitioner and hasattr(c.primary_practitioner, 'title') else ''),
        '{{patient.doctor.first_name}}': lambda p, pr, n, c, a, l: c.primary_practitioner.user.first_name if c and c.primary_practitioner else '',
        '{{patient.doctor.last_name}}': lambda p, pr, n, c, a, l: c.primary_practitioner.user.last_name if c and c.primary_practitioner else '',
        
        # Practitioner
        '{{practitioner.first_name}}': lambda p, pr, n, c, a, l: pr.user.first_name if pr else '',
        '{{practitioner.last_name}}': lambda p, pr, n, c, a, l: pr.user.last_name if pr else '',
        '{{practitioner.full_name}}': lambda p, pr, n, c, a, l: pr.user.get_full_name() if pr else '',
        '{{practitioner.title}}': lambda p, pr, n, c, a, l: pr.title if pr and hasattr(pr, 'title') else '',
        
        # Clinic
        '{{clinic.name}}': lambda p, pr, n, c, a, l: pr.clinic.name if pr and pr.clinic else (p.clinic.name if p and p.clinic else ''),
        '{{clinic.address}}': lambda p, pr, n, c, a, l: pr.clinic.address if pr and pr.clinic else (p.clinic.address if p and p.clinic else ''),
        '{{clinic.phone}}': lambda p, pr, n, c, a, l: pr.clinic.phone if pr and pr.clinic else (p.clinic.phone if p and p.clinic else ''),
        '{{clinic.email}}': lambda p, pr, n, c, a, l: pr.clinic.email if pr and pr.clinic else (p.clinic.email if p and p.clinic else ''),
        
        # Appointment
        '{{appointment.date}}': lambda p, pr, n, c, a, l: a.date.strftime('%d %B %Y') if a else '',
        '{{appointment.time}}': lambda p, pr, n, c, a, l: a.start_time.strftime('%I:%M %p') if a and a.start_time else '',
        '{{appointment.type}}': lambda p, pr, n, c, a, l: a.appointment_type if a else '',
        
        # Case
        '{{case.name}}': lambda p, pr, n, c, a, l: c.title if c else '',
        '{{case.title}}': lambda p, pr, n, c, a, l: c.title if c else '',
        '{{case.status}}': lambda p, pr, n, c, a, l: c.get_status_display() if c and hasattr(c, 'get_status_display') else '',
        '{{case.date_created}}': lambda p, pr, n, c, a, l: c.created_at.strftime('%d/%m/%Y') if c else '',
        '{{case.notes}}': lambda p, pr, n, c, a, l: c.description if c else '',
        
        # Case -> Sessions
        '{{case.sessions.approved_sessions}}': lambda p, pr, n, c, a, l: str(c.approved_sessions) if c and c.approved_sessions is not None else '',
        '{{case.sessions.package_sessions}}': lambda p, pr, n, c, a, l: str(a.service.session_allocation) if a and getattr(a, 'service', None) and getattr(a.service, 'is_package', False) and getattr(a.service, 'session_allocation', None) is not None else '',
        '{{case.sessions.sessions_used}}': lambda p, pr, n, c, a, l: str(c.completed_sessions) if c else '',
        '{{case.sessions.sessions_remaining}}': lambda p, pr, n, c, a, l: str(SessionEngine.get_session_stats(c, getattr(a, 'service', None)).get('remaining_sessions', '')) if c and SessionEngine.get_session_stats(c, getattr(a, 'service', None)).get('remaining_sessions') is not None else '',
        '{{case.sessions.session_allocation}}': lambda p, pr, n, c, a, l: str(SessionEngine.get_session_stats(c, getattr(a, 'service', None)).get('approved_sessions', '')) if c and SessionEngine.get_session_stats(c, getattr(a, 'service', None)).get('approved_sessions') is not None else '',
        
        # Case -> Referral
        '{{case.referral.doctor}}': lambda p, pr, n, c, a, l: c.referred_by if c else '',
        '{{case.referral.date}}': lambda p, pr, n, c, a, l: '',
        '{{case.referral.reference}}': lambda p, pr, n, c, a, l: c.referral_info if c else '',
        
        # Case -> Payer
        '{{case.payer.name}}': lambda p, pr, n, c, a, l: c.get_payer_display() if c and hasattr(c, 'get_payer_display') else '',
        '{{case.payer.reference}}': lambda p, pr, n, c, a, l: '',
        
        # Legacy Case compatibility
        '{{case.number}}': lambda p, pr, n, c, a, l: str(c.id) if c else '',
        '{{case.start_date}}': lambda p, pr, n, c, a, l: c.created_at.strftime('%d %B %Y') if c else '',
        
        # Global
        '{{date.today}}': lambda p, pr, n, c, a, l: timezone.now().strftime('%d %B %Y'),
        '{{time.now}}': lambda p, pr, n, c, a, l: timezone.now().strftime('%I:%M %p'),
        
        # Addressee
        '{{addressee.automatic}}': lambda p, pr, n, c, a, l: p.get_full_name() if p else '',
        '{{addressee.company}}': lambda p, pr, n, c, a, l: '',
        '{{addressee.title}}': lambda p, pr, n, c, a, l: '',
        '{{addressee.first_name}}': lambda p, pr, n, c, a, l: p.first_name if p else '',
        '{{addressee.last_name}}': lambda p, pr, n, c, a, l: p.last_name if p else '',
        '{{addressee.email}}': lambda p, pr, n, c, a, l: p.email if p else '',
        '{{addressee.work}}': lambda p, pr, n, c, a, l: '',
        '{{addressee.mobile}}': lambda p, pr, n, c, a, l: p.phone if p else '',
        '{{addressee.home}}': lambda p, pr, n, c, a, l: '',
        
        # Sender
        '{{sender.automatic}}': lambda p, pr, n, c, a, l: pr.user.get_full_name() if pr and pr.user else '',
        '{{sender.title}}': lambda p, pr, n, c, a, l: pr.user.title if pr and hasattr(pr.user, 'title') and pr.user.title else (pr.title if pr and hasattr(pr, 'title') else ''),
        '{{sender.first_name}}': lambda p, pr, n, c, a, l: pr.user.first_name if pr and pr.user else '',
        '{{sender.last_name}}': lambda p, pr, n, c, a, l: pr.user.last_name if pr and pr.user else '',
        '{{sender.discipline}}': lambda p, pr, n, c, a, l: pr.get_discipline_display() if pr and hasattr(pr, 'get_discipline_display') else '',
        '{{sender.signature}}': lambda p, pr, n, c, a, l: f'<img src="data:image/png;base64,{l.signature_data}" style="max-height: 80px;" alt="Signature" />' if l and getattr(l, 'signature_data', None) else '',
    }

    @classmethod
    def replace_variables(
        cls, 
        content: str, 
        patient: Patient = None, 
        practitioner: Practitioner = None, 
        note: ClinicalNote = None,
        patient_case = None,
        appointment = None,
        letter = None
    ) -> str:
        """
        Scans content for {{variables}} and replaces them with corresponding data.
        """
        if not content:
            return ""
            
        result = content
        
        # Replace known supported variables
        for var, func in cls.SUPPORTED_VARIABLES.items():
            if var in result:
                try:
                    val = str(func(patient, practitioner, note, patient_case, appointment, letter))
                    # 1. Replace the TipTap merge-field span completely
                    escaped_var = re.escape(var)
                    pattern = r'<span\b[^>]*data-id=["\']' + escaped_var + r'["\'][^>]*>.*?</span>'
                    result = re.sub(pattern, val, result, flags=re.IGNORECASE)
                    
                    # 2. Fallback for raw text without spans
                    result = result.replace(var, val)
                except Exception as e:
                    # If variable resolution fails, replace with empty string
                    escaped_var = re.escape(var)
                    pattern = r'<span\b[^>]*data-id=["\']' + escaped_var + r'["\'][^>]*>.*?</span>'
                    result = re.sub(pattern, "", result, flags=re.IGNORECASE)
                    result = result.replace(var, "")

        # Remove any remaining unimplemented variables (e.g., {{unknown.field}})
        result = re.sub(r'\{\{[^}]+\}\}', '', result)
        
        return result

    @classmethod
    def generate_pdf(cls, html_content: str, output_path: str = None) -> bytes:
        """
        Generates a PDF from the given HTML content.
        """
        try:
            from xhtml2pdf import pisa
            from io import BytesIO
            
            result = BytesIO()
            # Wrap in basic HTML structure if not present
            if '<html' not in html_content.lower():
                # Convert newlines to <br> to preserve plain text formatting
                html_content = html_content.replace('\n', '<br>')
                html_content = f"<html><body><div style='font-family: sans-serif; white-space: pre-wrap;'>{html_content}</div></body></html>"
                
            pisa_status = pisa.CreatePDF(
                html_content,
                dest=result
            )
            
            if pisa_status.err:
                raise Exception("PDF Generation Error")
                
            return result.getvalue()
        except ImportError:
            # Fallback if xhtml2pdf is not available
            return b"%PDF-1.4\n%Fallback Dummy PDF\n"
