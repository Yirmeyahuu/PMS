from django.conf import settings
from django.utils import timezone
import logging
import re

logger = logging.getLogger(__name__)


def _normalize_phone(phone: str) -> str | None:
    """
    Normalize a Philippine mobile number to E.164 format (+63XXXXXXXXXX).
    Accepts:
        09XXXXXXXXX   → +639XXXXXXXXX
        639XXXXXXXXX  → +639XXXXXXXXX
        +639XXXXXXXXX → +639XXXXXXXXX
    Returns None if the number cannot be normalized.
    """
    if not phone:
        return None

    # Strip all non-digit characters except leading +
    cleaned = re.sub(r'[^\d+]', '', phone.strip())

    # Already in E.164
    if cleaned.startswith('+63') and len(cleaned) == 13:
        return cleaned

    # International without +
    if cleaned.startswith('63') and len(cleaned) == 12:
        return f'+{cleaned}'

    # Local format 09XXXXXXXXX
    if cleaned.startswith('09') and len(cleaned) == 11:
        return f'+63{cleaned[1:]}'

    # 10-digit without prefix
    if cleaned.startswith('9') and len(cleaned) == 10:
        return f'+63{cleaned}'

    logger.warning("Could not normalize phone number: %s", phone)
    return None


def _build_sms_body(appointment) -> str:
    """Build the SMS reminder message body."""
    patient   = appointment.patient
    clinic    = appointment.clinic

    practitioner_name = (
        appointment.practitioner.user.get_full_name()
        if appointment.practitioner and appointment.practitioner.user
        else 'your practitioner'
    )

    location_name = (
        appointment.location.name
        if appointment.location
        else clinic.name
    )

    date_str = appointment.date.strftime('%a, %b %d %Y')
    time_str = appointment.start_time.strftime('%I:%M %p')

    lines = [
        f"Hi {patient.first_name}!",
        f"",
        f"📅 Appointment Reminder",
        f"Date : {date_str}",
        f"Time : {time_str}",
        f"With : {practitioner_name}",
        f"At   : {location_name}",
        f"",
    ]

    if getattr(clinic, 'phone', ''):
        lines.append(f"To reschedule/cancel call: {clinic.phone}")

    lines.append(f"– {clinic.name}")

    return '\n'.join(lines)


def send_appointment_reminder_sms(appointment) -> tuple[bool, str]:
    """
    Send a reminder SMS to the patient for their upcoming appointment.

    Returns:
        (success: bool, error_message: str)
    """
    # ── Guard: SMS must be enabled ────────────────────────────────────────────
    if not settings.SMS_REMINDERS_ENABLED:
        msg = "SMS reminders are disabled (SMS_REMINDERS_ENABLED=False)."
        logger.info(msg)
        return False, msg

    # ── Guard: Twilio credentials must exist ─────────────────────────────────
    if not all([settings.TWILIO_ACCOUNT_SID,
                settings.TWILIO_AUTH_TOKEN,
                settings.TWILIO_FROM_NUMBER]):
        msg = "Twilio credentials not configured."
        logger.error(msg)
        return False, msg

    patient = appointment.patient
    clinic  = appointment.clinic

    # ── Guard: patient must have a phone number ───────────────────────────────
    raw_phone = getattr(patient, 'phone', None) or getattr(patient, 'contact_number', None)
    if not raw_phone:
        msg = f"Patient {patient.id} has no phone number — skipping SMS reminder."
        logger.warning(msg)
        return False, msg

    # ── Normalize phone number ────────────────────────────────────────────────
    to_number = _normalize_phone(raw_phone)
    if not to_number:
        msg = f"Patient {patient.id} phone '{raw_phone}' could not be normalized to E.164."
        logger.warning(msg)
        return False, msg

    # ── Build message body ────────────────────────────────────────────────────
    body = _build_sms_body(appointment)

    # ── Send via Twilio ───────────────────────────────────────────────────────
    try:
        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException

        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)

        message = client.messages.create(
            body = body,
            from_= settings.TWILIO_FROM_NUMBER,
            to   = to_number,
        )

        # ── Log to AppointmentReminder ────────────────────────────────────────
        from apps.appointments.models import AppointmentReminder
        AppointmentReminder.objects.create(
            appointment   = appointment,
            reminder_type = 'SMS',
            is_successful = True,
            error_message = '',
        )

        logger.info(
            "SMS reminder sent → appointment_id=%s patient=%s phone=%s sid=%s",
            appointment.id, patient.id, to_number, message.sid,
        )
        return True, ''

    except Exception as e:
        error_msg = f"Twilio error for appointment {appointment.id}: {e}"
        logger.error(error_msg)

        # ── Log failed attempt ────────────────────────────────────────────────
        try:
            from apps.appointments.models import AppointmentReminder
            AppointmentReminder.objects.create(
                appointment   = appointment,
                reminder_type = 'SMS',
                is_successful = False,
                error_message = str(e),
            )
        except Exception:
            pass

        return False, error_msg


def send_bulk_sms_reminders(appointments_qs) -> dict:
    """
    Send SMS reminders for a queryset of appointments.

    Returns a summary dict: { sent, skipped, failed, errors }
    """
    summary = {'sent': 0, 'skipped': 0, 'failed': 0, 'errors': []}

    for appointment in appointments_qs:
        success, message = send_appointment_reminder_sms(appointment)
        if success:
            summary['sent'] += 1
        elif any(
            phrase in message.lower()
            for phrase in ['no phone', 'disabled', 'not configured', 'could not be normalized']
        ):
            summary['skipped'] += 1
        else:
            summary['failed'] += 1
            summary['errors'].append({
                'appointment_id': appointment.id,
                'error': message,
            })

    return summary