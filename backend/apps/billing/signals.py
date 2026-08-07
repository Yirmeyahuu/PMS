from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
import logging

from apps.billing.models import Invoice

logger = logging.getLogger(__name__)

# Session Tracking has been migrated away from Invoices.
# Invoices now serve exclusively as financial records.

from django.db.models import Sum

@receiver(post_save, sender=Invoice)
def sync_invoice_payments_to_package_case(sender, instance, **kwargs):
    """
    Sync amount_paid from all invoices belonging to a package Case's appointments.
    """
    # If the invoice is tied to an appointment, and that appointment is part of a case
    if instance.appointment and instance.appointment.patient_case_id:
        case = instance.appointment.patient_case
        if case.session_source == 'PACKAGE':
            # Aggregate amount_paid from all invoices of all appointments in this case
            total = case.case_appointments.filter(
                billing_invoices__is_deleted=False
            ).aggregate(total_paid=Sum('billing_invoices__amount_paid'))['total_paid']
            
            new_amount = total or 0
            if case.amount_paid != new_amount:
                case.amount_paid = new_amount
                case.save(update_fields=['amount_paid'])
