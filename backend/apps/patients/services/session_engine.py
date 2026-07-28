from apps.patients.models import PatientCase
from apps.appointments.models import Appointment
from apps.billing.models import Invoice

class SessionEngine:
    @staticmethod
    def get_session_stats(patient_case: PatientCase) -> dict:
        """
        Return session allocation stats from the SessionAllocation model.
        """
        # Fallback for old data or cases without allocation yet
        if not hasattr(patient_case, 'session_allocation'):
            approved = patient_case.approved_sessions
            return {
                'approved_sessions': approved,
                'completed_sessions': 0,
                'remaining_sessions': None if approved is None else approved,
                'progress_text': f"0 Sessions (Unlimited)" if approved is None else f"0 of {approved} Sessions Used",
                'allocation_status': 'ACTIVE',
                'is_unlimited': approved is None,
                'allocation_source': 'MANUAL'
            }

        allocation = patient_case.session_allocation
        
        if allocation.is_unlimited or allocation.approved_sessions is None:
            return {
                'approved_sessions': None,
                'completed_sessions': allocation.used_sessions,
                'remaining_sessions': None,
                'progress_text': f"{allocation.used_sessions} Sessions (Unlimited)",
                'allocation_status': allocation.status,
                'is_unlimited': True,
                'allocation_source': allocation.allocation_source
            }
        
        return {
            'approved_sessions': allocation.approved_sessions,
            'completed_sessions': allocation.used_sessions,
            'remaining_sessions': allocation.remaining_sessions,
            'progress_text': f"{allocation.used_sessions} of {allocation.approved_sessions} Sessions Used",
            'allocation_status': allocation.status,
            'is_unlimited': False,
            'allocation_source': allocation.allocation_source
        }
