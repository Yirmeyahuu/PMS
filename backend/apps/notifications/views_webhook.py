"""
SMS Reply Webhook — handles inbound Twilio SMS messages.

Twilio sends a POST to this endpoint when a patient replies to an SMS.
This view processes Y/N replies to appointment reminders.
"""
import hashlib
import hmac
import logging
from urllib.parse import urljoin

from django.conf import settings
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt

from apps.appointments.models import Appointment
from apps.notifications.services.communication_service import handle_patient_reply
from apps.patients.models import Patient

logger = logging.getLogger(__name__)


def _validate_twilio_signature(request) -> bool:
    """
    Validate that the request genuinely comes from Twilio
    using the X-Twilio-Signature header.
    """
    auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', '')
    if not auth_token:
        logger.warning("TWILIO_AUTH_TOKEN not set — skipping signature validation")
        return True  # Allow in dev

    signature = request.META.get('HTTP_X_TWILIO_SIGNATURE', '')
    if not signature:
        return False

    try:
        from twilio.request_validator import RequestValidator
        validator = RequestValidator(auth_token)

        # Build the full URL that Twilio used
        url = request.build_absolute_uri()
        post_vars = request.POST.dict()

        return validator.validate(url, post_vars, signature)
    except ImportError:
        logger.error("twilio package not installed — cannot validate signature")
        return False
    except Exception as e:
        logger.error("Twilio signature validation error: %s", e)
        return False


def _normalize_phone_for_lookup(phone: str) -> str:
    """Strip to digits for matching against stored phone numbers."""
    digits = ''.join(c for c in phone if c.isdigit())
    # Remove country code prefix for PH numbers
    if digits.startswith('63') and len(digits) > 10:
        digits = '0' + digits[2:]
    elif digits.startswith('1') and len(digits) == 11:
        digits = digits[1:]
    return digits


@method_decorator(csrf_exempt, name='dispatch')
class SMSReplyWebhookView(View):
    """
    POST /api/sms/reply-webhook/

    Twilio sends:
      - From: the patient's phone number
      - Body: the reply text (Y or N)
      - To:   the Twilio number

    We look up the patient by phone, find their most recent
    appointment with a pending reminder, and handle the reply.
    """

    def post(self, request, *args, **kwargs):
        # Validate Twilio signature
        if not _validate_twilio_signature(request):
            logger.warning("Invalid Twilio signature on SMS webhook")
            return HttpResponse(status=403)

        from_number = request.POST.get('From', '').strip()
        body = request.POST.get('Body', '').strip().upper()
        to_number = request.POST.get('To', '').strip()

        logger.info("SMS webhook received: From=%s Body=%s", from_number, body)

        if not from_number or not body:
            return HttpResponse(
                '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
                content_type='text/xml',
            )

        # Only process Y or N
        if body not in ('Y', 'N', 'YES', 'NO'):
            response_body = (
                "Thank you for your message. "
                "Please reply Y to confirm or N to decline your appointment."
            )
            return HttpResponse(
                f'<?xml version="1.0" encoding="UTF-8"?>'
                f'<Response><Message>{response_body}</Message></Response>',
                content_type='text/xml',
            )

        # Normalize reply
        reply = 'Y' if body in ('Y', 'YES') else 'N'

        # Find patient by phone number
        normalized = _normalize_phone_for_lookup(from_number)
        patient = self._find_patient(normalized, from_number)

        if not patient:
            logger.warning("No patient found for phone: %s", from_number)
            return HttpResponse(
                '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
                content_type='text/xml',
            )

        # Find the most recent pending appointment
        appointment = self._find_pending_appointment(patient)

        if not appointment:
            logger.warning("No pending appointment for patient %s", patient.id)
            return HttpResponse(
                '<?xml version="1.0" encoding="UTF-8"?>'
                '<Response><Message>We could not find a pending appointment. '
                'Please contact the clinic directly.</Message></Response>',
                content_type='text/xml',
            )

        # Handle the reply
        result = handle_patient_reply(appointment, reply)
        logger.info("Reply processed: patient=%s appt=%s result=%s", patient.id, appointment.id, result)

        # Send TwiML response
        if reply == 'Y':
            msg = (
                f"Thank you, {patient.first_name}! "
                f"Your appointment has been confirmed. See you soon!"
            )
        else:
            msg = (
                f"Thank you, {patient.first_name}. "
                f"We'll send you a link to reschedule at your convenience."
            )

        return HttpResponse(
            f'<?xml version="1.0" encoding="UTF-8"?>'
            f'<Response><Message>{msg}</Message></Response>',
            content_type='text/xml',
        )

    def _find_patient(self, normalized_phone: str, raw_phone: str):
        """Find patient by phone number (try multiple formats)."""
        from django.db.models import Q

        lookups = Q(phone__endswith=normalized_phone[-10:]) if len(normalized_phone) >= 10 else Q(phone=normalized_phone)
        lookups |= Q(phone=raw_phone)

        return Patient.objects.filter(lookups, is_archived=False).first()

    def _find_pending_appointment(self, patient):
        """Find the most recent appointment that has a reminder sent but no reply."""
        from django.utils import timezone

        return (
            Appointment.objects
            .filter(
                patient=patient,
                reminder_sent=True,
                patient_reply='',
                confirmation_status='PENDING',
                is_deleted=False,
                date__gte=timezone.now().date(),
            )
            .order_by('date', 'start_time')
            .first()
        )
