import re
from django.utils import timezone
from apps.patients.models import Patient
from apps.clinics.models import Practitioner
from apps.records.models import ClinicalNote

class LetterGeneratorService:
    """
    Handles parsing letter templates, replacing dynamic variables,
    and triggering PDF generation.
    """

    SUPPORTED_VARIABLES = {
        # Patient
        '{{patient.first_name}}': lambda p, pr, n, c, a: p.first_name if p else '',
        '{{patient.last_name}}': lambda p, pr, n, c, a: p.last_name if p else '',
        '{{patient.full_name}}': lambda p, pr, n, c, a: p.get_full_name() if p else '',
        '{{patient.dob}}': lambda p, pr, n, c, a: p.date_of_birth.strftime('%d/%m/%Y') if p and p.date_of_birth else '',
        '{{patient.email}}': lambda p, pr, n, c, a: p.email if p else '',
        '{{patient.phone}}': lambda p, pr, n, c, a: p.phone_number if p else '',
        '{{patient.address}}': lambda p, pr, n, c, a: p.address if p else '',
        
        # Practitioner
        '{{practitioner.first_name}}': lambda p, pr, n, c, a: pr.user.first_name if pr else '',
        '{{practitioner.last_name}}': lambda p, pr, n, c, a: pr.user.last_name if pr else '',
        '{{practitioner.full_name}}': lambda p, pr, n, c, a: pr.user.get_full_name() if pr else '',
        '{{practitioner.title}}': lambda p, pr, n, c, a: pr.title if pr else '',
        
        # Clinic
        '{{clinic.name}}': lambda p, pr, n, c, a: pr.clinic.name if pr and pr.clinic else (p.clinic.name if p and p.clinic else ''),
        '{{clinic.address}}': lambda p, pr, n, c, a: pr.clinic.address if pr and pr.clinic else (p.clinic.address if p and p.clinic else ''),
        '{{clinic.phone}}': lambda p, pr, n, c, a: pr.clinic.phone if pr and pr.clinic else (p.clinic.phone if p and p.clinic else ''),
        '{{clinic.email}}': lambda p, pr, n, c, a: pr.clinic.email if pr and pr.clinic else (p.clinic.email if p and p.clinic else ''),
        
        # Appointment
        '{{appointment.date}}': lambda p, pr, n, c, a: a.date.strftime('%d %B %Y') if a else '',
        '{{appointment.time}}': lambda p, pr, n, c, a: a.start_time.strftime('%I:%M %p') if a and a.start_time else '',
        '{{appointment.type}}': lambda p, pr, n, c, a: a.appointment_type if a else '',
        
        # Case
        '{{case.name}}': lambda p, pr, n, c, a: c.title if c else '',
        '{{case.number}}': lambda p, pr, n, c, a: str(c.id) if c else '',
        '{{case.start_date}}': lambda p, pr, n, c, a: c.created_at.strftime('%d %B %Y') if c else '',
        
        # Global
        '{{date.today}}': lambda p, pr, n, c, a: timezone.now().strftime('%d %B %Y'),
        '{{time.now}}': lambda p, pr, n, c, a: timezone.now().strftime('%I:%M %p'),
    }

    @classmethod
    def replace_variables(
        cls, 
        content: str, 
        patient: Patient = None, 
        practitioner: Practitioner = None, 
        note: ClinicalNote = None,
        patient_case = None,
        appointment = None
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
                    val = str(func(patient, practitioner, note, patient_case, appointment))
                    result = result.replace(var, val)
                except Exception:
                    # In case of error (e.g. missing related field), leave blank
                    result = result.replace(var, '')

        # Remove any remaining unimplemented variables (e.g., {{unknown.field}})
        # Simple regex to strip anything matching {{...}} that wasn't replaced
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
