from apps.patients.models import PatientCase
from apps.appointments.models import Appointment
from apps.billing.models import Invoice

class SessionEngine:
    @staticmethod
    def get_session_stats(patient_case: PatientCase, service=None) -> dict:
        """
        Return session allocation stats.
        If service is provided and is a package, its session_allocation overrides the case's approved_sessions.
        """
        # Determine effective limits
        if service and getattr(service, 'is_package', False):
            # Package allocation takes priority
            effective_limit = service.session_allocation
            is_unlimited = False
            allocation_source = 'PACKAGE'
        else:
            # Fallback to case limit
            effective_limit = patient_case.approved_sessions
            is_unlimited = patient_case.is_unlimited
            allocation_source = patient_case.session_source

        if is_unlimited or not effective_limit:
            return {
                'approved_sessions': None,
                'completed_sessions': patient_case.completed_sessions,
                'remaining_sessions': None,
                'progress_text': None,  # Hide indicator if 0 or None
                'allocation_status': 'ACTIVE',
                'is_unlimited': True,
                'allocation_source': allocation_source
            }
        
        remaining = max(0, effective_limit - patient_case.completed_sessions)
        return {
            'approved_sessions': effective_limit,
            'completed_sessions': patient_case.completed_sessions,
            'remaining_sessions': remaining,
            'progress_text': f"{patient_case.completed_sessions}/{effective_limit}",
            'allocation_status': 'ACTIVE',
            'is_unlimited': False,
            'allocation_source': allocation_source
        }
