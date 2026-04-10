"""
Unified reminder orchestrator.
Coordinates both email and SMS reminders for a single appointment.
"""
from apps.appointments.email_service import send_appointment_reminder_email
from apps.appointments.sms_service import send_appointment_reminder_sms
import logging

logger = logging.getLogger(__name__)


def send_all_reminders(appointment) -> dict:
    """
    Send both email and SMS reminders for a single appointment.

    Returns:
        {
            'email': {'success': bool, 'message': str},
            'sms':   {'success': bool, 'message': str},
        }
    """
    result = {
        'email': {'success': False, 'message': ''},
        'sms':   {'success': False, 'message': ''},
    }

    patient = appointment.patient

    # ── Email ─────────────────────────────────────────────────────────────────
    if getattr(patient, 'send_email_notifications', True):
        email_success, email_msg = send_appointment_reminder_email(appointment)
        result['email'] = {'success': email_success, 'message': email_msg}
    else:
        result['email'] = {
            'success': False,
            'message': f'Patient {patient.id} has email notifications disabled — skipping.',
        }

    # ── SMS ───────────────────────────────────────────────────────────────────
    if getattr(patient, 'sms_notifications_enabled', False):
        sms_success, sms_msg = send_appointment_reminder_sms(appointment)
        result['sms'] = {'success': sms_success, 'message': sms_msg}
    else:
        result['sms'] = {
            'success': False,
            'message': f'Patient {patient.id} has SMS notifications disabled — skipping.',
        }

    logger.info(
        "send_all_reminders → appointment_id=%s email=%s sms=%s",
        appointment.id,
        '✅' if email_success else '❌',
        '✅' if sms_success   else '❌',
    )

    return result


def send_bulk_all_reminders(appointments_qs) -> dict:
    """
    Send both email and SMS reminders for a queryset of appointments.

    Returns a combined summary.
    """
    summary = {
        'email': {'sent': 0, 'skipped': 0, 'failed': 0, 'errors': []},
        'sms':   {'sent': 0, 'skipped': 0, 'failed': 0, 'errors': []},
    }

    for appointment in appointments_qs:
        result = send_all_reminders(appointment)

        # ── Email tally ───────────────────────────────────────────────────────
        if result['email']['success']:
            summary['email']['sent'] += 1
        elif _is_skip(result['email']['message']):
            summary['email']['skipped'] += 1
        else:
            summary['email']['failed'] += 1
            summary['email']['errors'].append({
                'appointment_id': appointment.id,
                'error': result['email']['message'],
            })

        # ── SMS tally ─────────────────────────────────────────────────────────
        if result['sms']['success']:
            summary['sms']['sent'] += 1
        elif _is_skip(result['sms']['message']):
            summary['sms']['skipped'] += 1
        else:
            summary['sms']['failed'] += 1
            summary['sms']['errors'].append({
                'appointment_id': appointment.id,
                'error': result['sms']['message'],
            })

    return summary


def _is_skip(message: str) -> bool:
    skip_phrases = [
        'already sent', 'no email', 'no phone',
        'disabled', 'not configured', 'could not be normalized',
    ]
    return any(phrase in message.lower() for phrase in skip_phrases)