from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
import logging

from apps.billing.models import Invoice

logger = logging.getLogger(__name__)

# Session Tracking has been migrated away from Invoices.
# Invoices now serve exclusively as financial records.

@receiver(post_save, sender=Invoice)
def sync_invoice_payments_to_package_case(sender, instance, **kwargs):
    """
    Sync amount_paid from the designated package Invoice to its PatientCase.
    """
    for case in instance.package_cases.all():
        if case.amount_paid != instance.amount_paid:
            case.amount_paid = instance.amount_paid
            case.save(update_fields=['amount_paid'])
