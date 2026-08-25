import logging
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from apps.patients.models import (
    Patient, 
    PatientCase, 
    IntakeForm, 
    PatientConsent, 
    PatientConsentDocument, 
    ClientFormRequest,
    PatientMergeLog
)
from apps.appointments.models import Appointment, RebookingLink
from apps.records.models import ClinicalNote as RecordsClinicalNote, OutcomeMeasure, Attachment, CaseDocument
from apps.billing.models import Invoice, AgeingDebtEntry
from apps.notifications.models import Notification, CommunicationLog
from apps.integrations.models import PhilHealthClaim, HMOClaim
from apps.clinical_templates.models import ClinicalNote as TemplatesClinicalNote
from apps.letters.models import Letter

logger = logging.getLogger(__name__)

class PatientMergeService:
    """
    Handles the enterprise-grade merging of duplicate patient records.
    Transfers all relevant clinical, financial, and administrative records
    from the duplicate patient to the primary patient.
    """

    @classmethod
    def preview_merge(cls, primary_id: int, duplicate_id: int):
        """
        Returns a summary of the records that will be transferred from the
        duplicate patient to the primary patient.
        """
        duplicate = Patient.objects.filter(id=duplicate_id).first()
        if not duplicate:
            raise ValidationError("Duplicate patient not found.")
            
        return {
            "cases": PatientCase.objects.filter(patient=duplicate).count(),
            "appointments": Appointment.objects.filter(patient=duplicate).count(),
            "clinical_notes": RecordsClinicalNote.objects.filter(patient=duplicate).count() + TemplatesClinicalNote.objects.filter(patient=duplicate).count(),
            "invoices": Invoice.objects.filter(patient=duplicate).count(),
            "attachments": Attachment.objects.filter(patient=duplicate).count() + CaseDocument.objects.filter(patient=duplicate).count(),
            "letters": Letter.objects.filter(patient=duplicate).count(),
            "communications": CommunicationLog.objects.filter(patient=duplicate).count(),
        }

    @classmethod
    @transaction.atomic
    def execute_merge(cls, primary_id: int, duplicate_id: int, user, reason: str = "") -> PatientMergeLog:
        """
        Executes the patient merge within a strict transaction.
        """
        if primary_id == duplicate_id:
            raise ValidationError("Cannot merge a patient into themselves.")

        # Lock rows
        patients = Patient.objects.select_for_update().filter(id__in=[primary_id, duplicate_id])
        patient_map = {p.id: p for p in patients}

        if primary_id not in patient_map or duplicate_id not in patient_map:
            raise ValidationError("One or both patients could not be found.")

        primary = patient_map[primary_id]
        duplicate = patient_map[duplicate_id]

        cls._validate_merge(primary, duplicate)

        # Track transferred relationships for the audit log
        transferred = {}

        # 1. Patients App
        transferred['patient_cases'] = cls._transfer(PatientCase, duplicate, primary)
        transferred['intake_forms'] = cls._transfer(IntakeForm, duplicate, primary)
        transferred['patient_consents'] = cls._transfer(PatientConsent, duplicate, primary)
        transferred['patient_consent_documents'] = cls._transfer(PatientConsentDocument, duplicate, primary)
        transferred['client_form_requests'] = cls._transfer(ClientFormRequest, duplicate, primary)

        # 2. Appointments App
        transferred['appointments'] = cls._transfer(Appointment, duplicate, primary)
        transferred['rebooking_links'] = cls._transfer(RebookingLink, duplicate, primary)

        # 3. Records App
        transferred['records_clinical_notes'] = cls._transfer(RecordsClinicalNote, duplicate, primary)
        transferred['outcome_measures'] = cls._transfer(OutcomeMeasure, duplicate, primary)
        transferred['attachments'] = cls._transfer(Attachment, duplicate, primary)
        transferred['case_documents'] = cls._transfer(CaseDocument, duplicate, primary)

        # 4. Billing App
        transferred['invoices'] = cls._transfer(Invoice, duplicate, primary)
        transferred['ageing_debt_entries'] = cls._transfer(AgeingDebtEntry, duplicate, primary)

        # 5. Notifications App
        transferred['notifications'] = cls._transfer(Notification, duplicate, primary)
        transferred['communication_logs'] = cls._transfer(CommunicationLog, duplicate, primary)

        # 6. Integrations App
        transferred['philhealth_claims'] = cls._transfer(PhilHealthClaim, duplicate, primary)
        transferred['hmo_claims'] = cls._transfer(HMOClaim, duplicate, primary)

        # 7. Clinical Templates App
        transferred['templates_clinical_notes'] = cls._transfer(TemplatesClinicalNote, duplicate, primary)

        # 8. Letters App
        transferred['letters'] = cls._transfer(Letter, duplicate, primary)

        # Archive the duplicate patient
        duplicate.is_archived = True
        duplicate.archived_at = timezone.now()
        duplicate.archived_by = user
        
        duplicate.is_merged = True
        duplicate.merged_into = primary
        duplicate.merged_at = timezone.now()
        duplicate.merged_by = user
        
        duplicate.save(update_fields=[
            'is_archived', 'archived_at', 'archived_by',
            'is_merged', 'merged_into', 'merged_at', 'merged_by'
        ])

        # Create the immutable audit log
        audit_log = PatientMergeLog.objects.create(
            primary_patient=primary,
            duplicate_patient=duplicate,
            merged_by=user,
            reason=reason,
            relationships_transferred=transferred
        )

        logger.info(f"Merged patient {duplicate.id} into {primary.id} (Log: {audit_log.merge_id})")

        return audit_log

    @classmethod
    def _validate_merge(cls, primary: Patient, duplicate: Patient):
        """Enforces all safety rules for merging."""
        if primary.clinic.main_clinic != duplicate.clinic.main_clinic:
            raise ValidationError("Cannot merge patients across different clinics.")

        if duplicate.is_archived or duplicate.is_merged:
            raise ValidationError("The duplicate patient is already archived or merged.")

        if primary.is_archived or primary.is_merged:
            raise ValidationError("Cannot merge into an archived or merged patient.")

    @classmethod
    def _transfer(cls, model_class, from_patient: Patient, to_patient: Patient) -> list:
        """
        Transfers the ForeignKey relationship and returns a list of updated primary keys.
        """
        qs = model_class.objects.filter(patient=from_patient)
        ids = list(qs.values_list('pk', flat=True))
        if ids:
            qs.update(patient=to_patient)
        return ids
