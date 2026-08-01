from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
import logging

from apps.clinical_templates.models import ClinicalNote
from apps.patients.models import PatientCase, SessionConsumptionLog

logger = logging.getLogger(__name__)

@receiver(post_save, sender=ClinicalNote)
def consume_session_on_note_save(sender, instance, created, **kwargs):
    """
    When a Clinical Note is saved (or finalized), consume a session
    from the linked PatientCase if not already consumed for this appointment.
    """
    # Only process non-deleted notes linked to an appointment
    if getattr(instance, 'is_deleted', False) or not instance.appointment:
        return
        
    appointment = instance.appointment
    
    # Automatically mark the appointment as COMPLETED if it's currently in an active/pending state.
    # This reflects the business reality that writing a clinical note means the treatment occurred.
    if appointment.status in ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'ARRIVED']:
        appointment.status = 'COMPLETED'
        appointment.save(update_fields=['status'])
    
    # Identify the patient case (prefer explicit case link, fallback to appointment's case)
    patient_case = instance.patient_case
    if not patient_case:
        patient_case = appointment.patient_case
        
    if not patient_case:
        return
        
    # Deduplication check: Has this appointment already consumed a session?
    # This prevents duplicate consumption if multiple notes are added to the same appointment.
    if SessionConsumptionLog.objects.filter(
        appointment=appointment,
        patient_case=patient_case,
        action='USED'
    ).exists():
        return
        
    with transaction.atomic():
        patient_case = PatientCase.objects.select_for_update().get(id=patient_case.id)
        
        patient_case.completed_sessions += 1
        patient_case.save(update_fields=['completed_sessions'])
        
        # Track who created the consumption. Prefer note's practitioner user.
        created_by = None
        if instance.practitioner and instance.practitioner.user:
            created_by = instance.practitioner.user
            
        SessionConsumptionLog.objects.create(
            patient_case=patient_case,
            appointment=appointment,
            practitioner=instance.practitioner,
            created_by=created_by,
            action='USED',
            reason=f'Session automatically consumed by clinical note for appointment on {appointment.date}'
        )
        logger.info(f"Consumed session for case {patient_case.id} via clinical note from appointment {appointment.id}")
