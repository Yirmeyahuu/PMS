from apps.patients.models import PatientCase
from apps.appointments.models import Appointment
from apps.billing.models import Invoice

class SessionEngine:
    @staticmethod
    def get_session_stats(patient_case: PatientCase) -> dict:
        """
        Calculate the approved, completed, remaining sessions, and progress.
        Sessions are consumed only when an Appointment linked to this case is successfully invoiced.
        """
        # Count distinct appointments directly linked to this case that have an active invoice
        completed = Invoice.objects.filter(
            appointment__patient_case=patient_case,
            is_deleted=False
        ).exclude(
            status='CANCELLED'
        ).values('appointment_id').distinct().count()
        
        # Include legacy appointments linked via ClinicalNote that have an active invoice
        legacy_completed = Invoice.objects.filter(
            appointment__clinical_notes_v2__patient_case=patient_case,
            is_deleted=False
        ).exclude(
            appointment__patient_case=patient_case
        ).exclude(
            status='CANCELLED'
        ).values('appointment_id').distinct().count()
        
        total_completed = completed + legacy_completed
        approved = patient_case.approved_sessions
        
        if approved is None:
            return {
                'approved_sessions': None,
                'completed_sessions': total_completed,
                'remaining_sessions': None,
                'progress_text': f"{total_completed} Sessions (Unlimited)"
            }
        
        remaining = max(0, approved - total_completed)
        
        return {
            'approved_sessions': approved,
            'completed_sessions': total_completed,
            'remaining_sessions': remaining,
            'progress_text': f"{total_completed} of {approved} Sessions Used"
        }
