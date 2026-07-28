import logging
from dataclasses import dataclass
from typing import Optional, List
from django.db.models import Q
from apps.patients.models import Patient
from apps.common.validators import normalize_ph_phone

logger = logging.getLogger(__name__)

MATCH_EXACT = 'EXACT_MATCH'
MATCH_POSSIBLE = 'POSSIBLE_DUPLICATE'
MATCH_NONE = 'NEW_PATIENT'

@dataclass
class MatchingResult:
    status: str
    existing_patient: Optional[Patient] = None
    matched_fields: List[str] = None


class PatientMatchingService:
    """
    Enterprise Patient Identity Management (PIM) Matching Engine.
    Evaluates new patient demographics against existing records to intelligently
    reuse profiles or flag possible duplicates without blocking workflows.
    """

    @classmethod
    def match_patient(
        cls, 
        first_name: str, 
        last_name: str, 
        dob, 
        phone: str, 
        clinic,
        email: str = None
    ) -> MatchingResult:
        
        # 1. Normalize Inputs
        first_name = (first_name or '').strip().lower()
        last_name = (last_name or '').strip().lower()
        
        # Phone normalization
        norm_phone = normalize_ph_phone(phone) if phone else ''
        
        # Email normalization
        norm_email = (email or '').strip().lower()
        
        # DOB could be a string or date object; convert to string YYYY-MM-DD for comparison if needed
        dob_str = str(dob) if dob else ''

        if not first_name or not last_name or not dob_str:
            # Insufficient info for intelligent matching
            return MatchingResult(status=MATCH_NONE, matched_fields=[])

        # 2. Scope to the clinic network
        try:
            main_clinic = clinic.main_clinic
            branch_ids = list(main_clinic.get_all_branches().values_list('id', flat=True))
        except AttributeError:
            branch_ids = [clinic.id] if clinic else []

        if not branch_ids:
            return MatchingResult(status=MATCH_NONE, matched_fields=[])

        # 3. Fetch candidates (Any record matching at least one of the major criteria to reduce memory overhead)
        # We search for anyone with the same Name OR same Phone
        candidates = Patient.objects.filter(
            clinic_id__in=branch_ids,
            is_deleted=False
        ).filter(
            Q(first_name__iexact=first_name, last_name__iexact=last_name) |
            Q(phone=norm_phone)
        )

        best_match = None
        best_match_count = 0
        best_matched_fields = []

        for candidate in candidates:
            match_count = 0
            matched_fields = []

            # Check Name
            if (candidate.first_name.strip().lower() == first_name and 
                candidate.last_name.strip().lower() == last_name):
                match_count += 1
                matched_fields.append('name')
            
            # Check DOB
            cand_dob = str(candidate.date_of_birth) if candidate.date_of_birth else ''
            if cand_dob and dob_str and cand_dob == dob_str:
                match_count += 1
                matched_fields.append('dob')

            # Check Phone
            cand_phone = candidate.phone or ''
            if cand_phone and norm_phone and cand_phone == norm_phone:
                match_count += 1
                matched_fields.append('phone')

            # Check Email
            cand_email = (candidate.email or '').strip().lower()
            if cand_email and norm_email and cand_email == norm_email:
                match_count += 1
                matched_fields.append('email')

            if match_count > best_match_count:
                best_match_count = match_count
                best_match = candidate
                best_matched_fields = matched_fields

        # 4. Evaluate Rules
        required_exact = 4 if norm_email else 3
        
        if best_match_count == required_exact:
            # Rule 1: EXACT MATCH (Name, DOB, Phone, and optionally Email all match)
            logger.info(f"[PIM] Exact Match found for {first_name} {last_name}: Reusing Patient {best_match.id}")
            return MatchingResult(
                status=MATCH_EXACT, 
                existing_patient=best_match, 
                matched_fields=best_matched_fields
            )
        
        elif best_match_count >= required_exact - 1:
            # Rule 2: POSSIBLE DUPLICATE (misses 1 of the fields)
            logger.info(f"[PIM] Possible Duplicate detected for {first_name} {last_name}. Existing: {best_match.id}")
            return MatchingResult(
                status=MATCH_POSSIBLE, 
                existing_patient=best_match, 
                matched_fields=best_matched_fields
            )
        
        else:
            # Rule 3: NEW PATIENT (< 2 match)
            return MatchingResult(status=MATCH_NONE, matched_fields=[])
