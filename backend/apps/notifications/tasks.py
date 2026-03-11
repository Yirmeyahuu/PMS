"""
Scheduled tasks for notifications.

Option A — Celery Beat (recommended for production):
    Add to settings.py CELERY_BEAT_SCHEDULE:

    'daily-appointment-summary': {
        'task': 'apps.notifications.tasks.daily_appointment_summary',
        'schedule': crontab(hour=7, minute=0),   # 7:00 AM every day
    },

Option B — django-crontab (simpler, no Redis needed):
    CRONJOBS = [
        ('0 7 * * *', 'apps.notifications.tasks.daily_appointment_summary_cron')
    ]
"""
import logging
from apps.notifications.services.appointment_notifications import send_daily_summary

logger = logging.getLogger(__name__)


# ── Celery task (if using Celery) ─────────────────────────────────────────────
try:
    from celery import shared_task

    @shared_task(name='apps.notifications.tasks.daily_appointment_summary')
    def daily_appointment_summary():
        logger.info("Celery: running daily_appointment_summary task")
        send_daily_summary()

except ImportError:
    # Celery not installed — that's fine, use the cron function below
    pass


# ── Plain function (django-crontab / management command) ─────────────────────
def daily_appointment_summary_cron():
    """Entry point for django-crontab or a management command."""
    logger.info("Cron: running daily_appointment_summary_cron")
    send_daily_summary()