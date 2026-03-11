"""
Appointment-specific notification logic.

  notify_new_booking(appointment)
    → diary Appointment created/confirmed → notifies branch staff

  notify_new_portal_booking(portal_booking)
    → PortalBooking submitted via patient portal → notifies branch staff

  send_daily_summary()
    → scheduled job → per-branch daily appointment list
"""
import logging
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.notifications.services.notification_service import (
    create_notification,
    bulk_create_notifications,
)

logger = logging.getLogger(__name__)
User = get_user_model()


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _staff_users_for_branch(clinic_branch):
    """
    Return all active ADMIN / STAFF users that belong to the given branch.
    Users with clinic_branch=None are treated as "all branches" — include them too.
    """
    from django.db.models import Q
    return User.objects.filter(
        is_active=True,
        role__in=['ADMIN', 'STAFF'],
        clinic=clinic_branch,           # scoped to the same root clinic family
    ).filter(
        Q(clinic_branch=clinic_branch) | Q(clinic_branch__isnull=True)
    )


def _format_time(dt):
    """Return '2:30 PM' style string from a time or datetime."""
    if dt is None:
        return '—'
    # Works for both time and datetime objects
    try:
        return dt.strftime('%-I:%M %p')
    except ValueError:
        return dt.strftime('%I:%M %p')  # Windows fallback (no %-I)


# ─── 1. Diary Appointment Notification ───────────────────────────────────────

def notify_new_booking(appointment) -> None:
    """
    Fire when a diary Appointment is created or confirmed.
    Notifies all staff in the appointment's clinic branch.
    """
    try:
        branch       = appointment.clinic
        patient      = appointment.patient
        appt_time    = _format_time(appointment.start_time)
        patient_name = (
            f"{patient.first_name} {patient.last_name}"
            if patient else "Unknown Patient"
        )

        title   = f"New Booking: {patient_name}"
        message = (
            f"{patient_name} has a diary appointment on "
            f"{appointment.date.strftime('%B %d, %Y')} at {appt_time}."
        )
        link_url = f"/diary?date={appointment.date.strftime('%Y-%m-%d')}&appointment={appointment.id}"

        staff = _staff_users_for_branch(branch)

        if not staff.exists():
            logger.warning(
                "notify_new_booking: no staff found for branch %s (appointment %s)",
                branch, appointment.id,
            )
            return

        bulk_create_notifications([
            dict(
                user=user,
                notification_type='NEW_BOOKING',
                title=title,
                message=message,
                link_url=link_url,
                appointment=appointment,
                clinic_branch=branch,
            )
            for user in staff
        ])

        logger.info(
            "notify_new_booking: created notifications for appointment %s",
            appointment.id,
        )

    except Exception as exc:
        logger.exception(
            "notify_new_booking failed for appointment %s: %s",
            getattr(appointment, 'id', '?'), exc,
        )


# ─── 2. Portal Booking Notification ──────────────────────────────────────────

def notify_new_portal_booking(portal_booking) -> None:
    """
    Fire immediately when a patient submits a booking via the patient portal.
    Uses PortalBooking fields directly — no Appointment FK yet at this stage.
    Notifies all staff in the portal link's clinic branch.
    """
    try:
        branch = portal_booking.portal_link.clinic

        patient_name = (
            f"{portal_booking.patient_first_name} {portal_booking.patient_last_name}"
        ).strip() or "Unknown Patient"

        appt_date = portal_booking.appointment_date
        appt_time = portal_booking.appointment_time

        # Format time safely
        try:
            time_str = appt_time.strftime('%-I:%M %p')
        except (ValueError, AttributeError):
            time_str = appt_time.strftime('%I:%M %p') if appt_time else '—'

        service_name = portal_booking.service.name if portal_booking.service else 'General Consultation'

        title = f"New Portal Booking: {patient_name}"
        message = (
            f"{patient_name} submitted a portal booking for "
            f"{service_name} on "
            f"{appt_date.strftime('%B %d, %Y')} at {time_str}. "
            f"Reference: #{portal_booking.reference_number}"
        )
        link_url = f"/diary?date={appt_date.strftime('%Y-%m-%d')}"

        staff = _staff_users_for_branch(branch)

        if not staff.exists():
            logger.warning(
                "notify_new_portal_booking: no staff found for branch %s "
                "(portal_booking %s)",
                branch, portal_booking.id,
            )
            return

        bulk_create_notifications([
            dict(
                user=user,
                notification_type='NEW_BOOKING',
                title=title,
                message=message,
                link_url=link_url,
                appointment=None,        # No Appointment record yet
                clinic_branch=branch,
            )
            for user in staff
        ])

        logger.info(
            "notify_new_portal_booking: notified %d staff for portal booking #%s",
            staff.count(), portal_booking.reference_number,
        )

    except Exception as exc:
        # Never crash the booking flow
        logger.exception(
            "notify_new_portal_booking failed for portal_booking %s: %s",
            getattr(portal_booking, 'id', '?'), exc,
        )


# ─── 3. Daily Summary Notification ───────────────────────────────────────────

def send_daily_summary() -> None:
    """
    Called once per day (via tasks.py / cron).
    For every active clinic, creates a DAILY_SUMMARY notification
    for each staff member listing today's appointments.
    """
    from apps.appointments.models import Appointment
    from apps.clinics.models import Clinic

    today     = timezone.localdate()
    today_str = today.strftime('%B %d, %Y')
    branches  = Clinic.objects.filter(is_active=True, is_deleted=False)
    total_sent = 0

    for branch in branches:
        appointments = (
            Appointment.objects
            .filter(
                clinic=branch,
                date=today,
                status__in=['CONFIRMED', 'PENDING', 'SCHEDULED'],
                is_deleted=False,
            )
            .select_related('patient')
            .order_by('start_time')
        )

        count = appointments.count()
        staff = _staff_users_for_branch(branch)

        if not staff.exists():
            continue

        if count == 0:
            title   = f"No Appointments Today — {branch.name}"
            message = f"There are no appointments scheduled for {branch.name} on {today_str}."
        else:
            lines = [
                f"  • {_format_time(appt.start_time)} — "
                f"{appt.patient.first_name} {appt.patient.last_name}"
                for appt in appointments
            ]
            title   = f"{count} Appointment{'s' if count != 1 else ''} Today — {branch.name}"
            message = (
                f"{branch.name} has {count} appointment{'s' if count != 1 else ''} "
                f"on {today_str}:\n" + "\n".join(lines)
            )

        link_url = f"/diary?date={today.strftime('%Y-%m-%d')}"

        bulk_create_notifications([
            dict(
                user=user,
                notification_type='DAILY_SUMMARY',
                title=title,
                message=message,
                link_url=link_url,
                clinic_branch=branch,
            )
            for user in staff
        ])

        total_sent += staff.count()

        logger.info(
            "send_daily_summary: branch '%s' — %d appts, %d notifications created",
            branch.name, count, staff.count(),
        )

    logger.info("send_daily_summary: total notifications created = %d", total_sent)