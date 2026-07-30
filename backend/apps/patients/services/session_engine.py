from apps.patients.models import PatientCase
from apps.appointments.models import Appointment
from apps.billing.models import Invoice

class SessionEngine:
    @staticmethod
    def get_session_stats(patient_case: PatientCase) -> dict:
        """
        Return session allocation stats from the PatientCase model directly.
        """
        if patient_case.is_unlimited or patient_case.approved_sessions is None:
            return {
                'approved_sessions': None,
                'completed_sessions': patient_case.completed_sessions,
                'remaining_sessions': None,
                'progress_text': f"{patient_case.completed_sessions} Sessions (Unlimited)",
                'allocation_status': 'ACTIVE',
                'is_unlimited': True,
                'allocation_source': patient_case.session_source
            }
        
        return {
            'approved_sessions': patient_case.approved_sessions,
            'completed_sessions': patient_case.completed_sessions,
            'remaining_sessions': patient_case.remaining_sessions,
            'progress_text': f"{patient_case.completed_sessions} of {patient_case.approved_sessions} Sessions Used",
            'allocation_status': 'ACTIVE',
            'is_unlimited': False,
            'allocation_source': patient_case.session_source
        }
