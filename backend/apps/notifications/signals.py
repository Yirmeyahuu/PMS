"""
Django signals that auto-trigger notifications.
Connected in apps.py → ready().
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


def connect_signals():
    """
    Called from NotificationsConfig.ready().
    Deferred import prevents AppRegistryNotReady errors.
    """
    from apps.appointments.models import Appointment
    from apps.patients.models import PortalBooking
    from apps.notifications.services.appointment_notifications import (
        notify_new_booking,
        notify_new_portal_booking,
    )

    # ── 1. Diary Appointment created / confirmed ──────────────────────────────
    @receiver(post_save, sender=Appointment, weak=False)
    def on_appointment_saved(sender, instance, created, **kwargs):
        """
        Trigger NEW_BOOKING notification when a diary appointment is:
          - freshly created  (created=True)
          - OR status transitions to CONFIRMED
        """
        if created:
            notify_new_booking(instance)
            return

        if instance.status == 'CONFIRMED':
            from apps.notifications.models import Notification
            already_notified = Notification.objects.filter(
                appointment=instance,
                notification_type='NEW_BOOKING',
            ).exists()
            if not already_notified:
                notify_new_booking(instance)

    # ── 2. Portal Booking submitted by patient ────────────────────────────────
    @receiver(post_save, sender=PortalBooking, weak=False)
    def on_portal_booking_saved(sender, instance, created, **kwargs):
        """
        Trigger NEW_PORTAL_BOOKING notification the moment a patient
        submits a booking through the portal — before any staff confirmation.
        """
        if created:
            notify_new_portal_booking(instance)