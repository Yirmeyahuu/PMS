from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
import logging

from apps.billing.models import Invoice
from apps.patients.models import PatientCase, SessionConsumptionLog

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Invoice)
def consume_session_on_invoice_creation(sender, instance, created, **kwargs):
    """
    When an Invoice is created for an appointment linked to a PatientCase,
    consume a session from its PatientCase.
    """
    if not instance.appointment or instance.is_deleted or instance.status == 'CANCELLED':
        return
        
    appointment = instance.appointment
    
    patient_case = appointment.patient_case
    if not patient_case:
        first_note = appointment.clinical_notes_v2.first() if hasattr(appointment, 'clinical_notes_v2') else None
        if first_note and first_note.patient_case:
            patient_case = first_note.patient_case
            
    if not patient_case:
        return
        
    if SessionConsumptionLog.objects.filter(invoice=instance).exists():
        return
        
    with transaction.atomic():
        patient_case = PatientCase.objects.select_for_update().get(id=patient_case.id)
        
        patient_case.completed_sessions += 1
        patient_case.save(update_fields=['completed_sessions'])
        
        SessionConsumptionLog.objects.create(
            patient_case=patient_case,
            appointment=appointment,
            invoice=instance,
            practitioner=appointment.practitioner,
            created_by=instance.created_by,
            action='USED',
            reason=f'Session automatically consumed by invoice {instance.invoice_number}'
        )
        logger.info(f"Consumed session for case {patient_case.id} via invoice {instance.invoice_number}")

@receiver(post_delete, sender=Invoice)
def restore_session_on_invoice_deletion(sender, instance, **kwargs):
    """
    If an invoice is deleted, we should restore the consumed session.
    """
    logs = SessionConsumptionLog.objects.filter(invoice=instance, action='USED')
    if not logs.exists():
        return
        
    with transaction.atomic():
        for log in logs:
            patient_case = PatientCase.objects.select_for_update().get(id=log.patient_case_id)
            if patient_case.completed_sessions > 0:
                patient_case.completed_sessions -= 1
                patient_case.save(update_fields=['completed_sessions'])
                
            SessionConsumptionLog.objects.create(
                patient_case=patient_case,
                appointment=instance.appointment,
                created_by=instance.created_by,
                action='REMOVED',
                reason=f'Session usage reversed due to invoice {instance.invoice_number} deletion'
            )


@receiver(post_save, sender=Invoice)
def restore_session_on_invoice_cancel_or_soft_delete(sender, instance, created, **kwargs):
    """
    If an invoice is soft-deleted or its status changes to CANCELLED,
    restore the consumed session (if not already restored).
    """
    if created:
        return
        
    if instance.is_deleted or instance.status == 'CANCELLED':
        used_logs = SessionConsumptionLog.objects.filter(invoice=instance, action='USED')
        removed_logs = SessionConsumptionLog.objects.filter(invoice=instance, action='REMOVED')
        
        if used_logs.exists() and not removed_logs.exists():
            with transaction.atomic():
                for log in used_logs:
                    patient_case = PatientCase.objects.select_for_update().get(id=log.patient_case_id)
                    if patient_case.completed_sessions > 0:
                        patient_case.completed_sessions -= 1
                        patient_case.save(update_fields=['completed_sessions'])
                        
                    SessionConsumptionLog.objects.create(
                        patient_case=patient_case,
                        appointment=instance.appointment,
                        invoice=instance,
                        created_by=instance.updated_by if hasattr(instance, 'updated_by') else instance.created_by,
                        action='REMOVED',
                        reason=f'Session usage reversed due to invoice {instance.invoice_number} being cancelled or deleted'
                    )
                    logger.info(f"Restored session for case via invoice {instance.invoice_number} cancellation")

