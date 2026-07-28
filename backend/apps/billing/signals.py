from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
import logging

from apps.billing.models import Invoice
from apps.patients.models import SessionAllocation, SessionConsumptionLog

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Invoice)
def consume_session_on_invoice_creation(sender, instance, created, **kwargs):
    """
    When an Invoice is created for an appointment linked to a PatientCase,
    consume a session from its SessionAllocation.
    """
    if not created or not instance.appointment:
        return
        
    appointment = instance.appointment
    
    patient_case = appointment.patient_case
    if not patient_case:
        first_note = appointment.clinical_notes_v2.first() if hasattr(appointment, 'clinical_notes_v2') else None
        if first_note and first_note.patient_case:
            patient_case = first_note.patient_case
            
    if not patient_case:
        return

    try:
        allocation = patient_case.session_allocation
    except SessionAllocation.DoesNotExist:
        allocation = SessionAllocation.objects.create(
            patient_case=patient_case,
            approved_sessions=patient_case.approved_sessions,
            is_unlimited=(patient_case.approved_sessions is None),
            allocation_source='MANUAL',
            status='ACTIVE'
        )
        
    if SessionConsumptionLog.objects.filter(invoice=instance).exists():
        return
        
    with transaction.atomic():
        allocation = SessionAllocation.objects.select_for_update().get(id=allocation.id)
        
        allocation.used_sessions += 1
        
        if not allocation.is_unlimited and allocation.approved_sessions is not None:
            if allocation.used_sessions >= allocation.approved_sessions:
                allocation.status = 'EXHAUSTED'
                
        allocation.save(update_fields=['used_sessions', 'status'])
        
        SessionConsumptionLog.objects.create(
            allocation=allocation,
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
            allocation = SessionAllocation.objects.select_for_update().get(id=log.allocation_id)
            if allocation.used_sessions > 0:
                allocation.used_sessions -= 1
                if not allocation.is_unlimited and allocation.approved_sessions is not None:
                    if allocation.used_sessions < allocation.approved_sessions:
                        allocation.status = 'ACTIVE'
                allocation.save(update_fields=['used_sessions', 'status'])
                
            SessionConsumptionLog.objects.create(
                allocation=allocation,
                appointment=instance.appointment,
                created_by=instance.created_by,
                action='REMOVED',
                reason=f'Session usage reversed due to invoice {instance.invoice_number} deletion'
            )
