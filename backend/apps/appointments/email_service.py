from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


def send_appointment_reminder_email(appointment) -> tuple[bool, str]:
    """
    Send a reminder email to the patient for their upcoming appointment.

    Returns:
        (success: bool, error_message: str)
    """
    patient = appointment.patient
    clinic  = appointment.clinic

    # ── Guard: patient must have an email ────────────────────────────────────
    recipient_email = getattr(patient, 'email', None)
    if not recipient_email:
        msg = f"Patient {patient.id} has no email address — skipping reminder."
        logger.warning(msg)
        return False, msg

    # ── Guard: appointment must not already have a reminder sent ─────────────
    if appointment.reminder_sent:
        msg = f"Reminder already sent for appointment {appointment.id} — skipping."
        logger.info(msg)
        return False, msg

    # ── Build context ─────────────────────────────────────────────────────────
    practitioner_name = (
        appointment.practitioner.user.get_full_name()
        if appointment.practitioner and appointment.practitioner.user
        else 'Your practitioner'
    )

    location_name = (
        appointment.location.name
        if appointment.location
        else clinic.name
    )

    context = {
        'patient_first_name':  patient.first_name,
        'patient_full_name':   patient.get_full_name(),
        'appointment_date':    appointment.date.strftime('%A, %d %B %Y'),
        'appointment_time':    appointment.start_time.strftime('%I:%M %p'),
        'appointment_type':    appointment.get_appointment_type_display(),
        'practitioner_name':   practitioner_name,
        'location_name':       location_name,
        'clinic_name':         clinic.name,
        'clinic_phone':        getattr(clinic, 'phone', ''),
        'clinic_address':      getattr(clinic, 'address', ''),
        'clinic_email':        getattr(clinic, 'email', settings.DEFAULT_FROM_EMAIL),
        'chief_complaint':     appointment.chief_complaint or '',
        'notes_for_patient':   appointment.patient_notes or '',
        'appointment_id':      appointment.id,
    }

    # ── Render templates ──────────────────────────────────────────────────────
    try:
        subject      = (
            f"Appointment Reminder – {context['appointment_date']} "
            f"at {context['appointment_time']} | {clinic.name}"
        )
        text_content = render_to_string('appointments/email/reminder.txt',  context)
        html_content = render_to_string('appointments/email/reminder.html', context)
    except Exception as e:
        msg = f"Template render error for appointment {appointment.id}: {e}"
        logger.error(msg)
        return False, msg

    # ── Send ──────────────────────────────────────────────────────────────────
    try:
        msg_obj = EmailMultiAlternatives(
            subject    = subject,
            body       = text_content,
            from_email = settings.DEFAULT_FROM_EMAIL,
            to         = [recipient_email],
            reply_to   = [context['clinic_email']],
        )
        msg_obj.attach_alternative(html_content, 'text/html')
        msg_obj.send(fail_silently=False)

        # ── Mark reminder as sent ─────────────────────────────────────────────
        appointment.reminder_sent    = True
        appointment.reminder_sent_at = timezone.now()
        appointment.save(update_fields=['reminder_sent', 'reminder_sent_at'])

        # ── Log to AppointmentReminder ────────────────────────────────────────
        from apps.appointments.models import AppointmentReminder
        AppointmentReminder.objects.create(
            appointment    = appointment,
            reminder_type  = 'EMAIL',
            is_successful  = True,
            error_message  = '',
        )

        logger.info(
            "Reminder sent → appointment_id=%s patient=%s email=%s",
            appointment.id, patient.id, recipient_email,
        )
        return True, ''

    except Exception as e:
        error_msg = f"SMTP error for appointment {appointment.id}: {e}"
        logger.error(error_msg)

        # ── Log failed attempt ────────────────────────────────────────────────
        try:
            from apps.appointments.models import AppointmentReminder
            AppointmentReminder.objects.create(
                appointment    = appointment,
                reminder_type  = 'EMAIL',
                is_successful  = False,
                error_message  = str(e),
            )
        except Exception:
            pass

        return False, error_msg


def send_bulk_reminders(appointments_qs) -> dict:
    """
    Send reminders for a queryset of appointments.

    Returns a summary dict: { sent, skipped, failed, errors }
    """
    summary = {'sent': 0, 'skipped': 0, 'failed': 0, 'errors': []}

    for appointment in appointments_qs:
        success, message = send_appointment_reminder_email(appointment)
        if success:
            summary['sent'] += 1
        elif 'already sent' in message or 'no email' in message.lower():
            summary['skipped'] += 1
        else:
            summary['failed'] += 1
            summary['errors'].append({'appointment_id': appointment.id, 'error': message})

    return summary