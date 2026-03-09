from django.core.management import call_command
import logging

logger = logging.getLogger(__name__)


def send_reminders_cron():
    """
    Called daily at 8:00 AM by django-crontab.
    Sends both email and SMS reminders for tomorrow's appointments.
    """
    logger.info("Cron: send_reminders_cron started")
    try:
        call_command('send_appointment_reminders')
        logger.info("Cron: send_reminders_cron completed successfully")
    except Exception as e:
        logger.error("Cron: send_reminders_cron failed — %s", str(e))
        raise