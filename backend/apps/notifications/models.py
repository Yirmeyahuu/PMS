from django.db import models
from apps.common.models import TimeStampedModel


class Notification(TimeStampedModel):
    """
    Clinic-wide notification.

    ONE record per notification per clinic.  Every active user in that clinic
    sees the same notification.  Per-user read status is tracked via the
    NotificationRead join table.

    Covers:
      - NEW_BOOKING   : fired when a patient books an appointment
      - DAILY_SUMMARY : fired once per day per clinic branch
    """

    NOTIFICATION_TYPE_CHOICES = [
        ('NEW_BOOKING',   'New Appointment Booking'),
        ('DAILY_SUMMARY', 'Daily Appointments Summary'),
    ]

    # ── Scoping — clinic-wide, NOT per-user ───────────────────────────────────
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='notifications',
        help_text='The root/main clinic this notification belongs to.',
    )

    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPE_CHOICES,
        db_index=True,
    )

    title    = models.CharField(max_length=200)
    message  = models.TextField()
    link_url = models.CharField(max_length=500, blank=True)

    # Optional FK — for NEW_BOOKING
    appointment = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
    )

    # The specific branch this notification concerns (display purposes)
    clinic_branch = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='branch_notifications',
    )

    class Meta:
        db_table   = 'notifications'
        ordering   = ['-created_at']
        indexes    = [
            models.Index(fields=['clinic', 'created_at']),
            models.Index(fields=['notification_type', 'created_at']),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} — clinic {self.clinic_id}"


class NotificationRead(models.Model):
    """
    Per-user read receipt for a clinic-wide notification.
    A row means the user HAS read that notification.
    No row → unread.
    """

    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name='reads',
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='notification_reads',
    )
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table         = 'notification_reads'
        unique_together  = [('notification', 'user')]
        indexes          = [
            models.Index(fields=['user', 'notification']),
        ]

    def __str__(self):
        return f"User {self.user_id} read notification {self.notification_id}"


class EmailLog(TimeStampedModel):
    """Log of emails sent"""

    recipient_email = models.EmailField()
    subject         = models.CharField(max_length=500)
    body            = models.TextField()

    is_sent       = models.BooleanField(default=False)
    sent_at       = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    related_model = models.CharField(max_length=100, blank=True)
    related_id    = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'email_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"Email to {self.recipient_email} - {self.subject}"


class SMSLog(TimeStampedModel):
    """Log of SMS sent"""

    recipient_phone = models.CharField(max_length=15)
    message         = models.TextField()

    is_sent       = models.BooleanField(default=False)
    sent_at       = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    provider            = models.CharField(max_length=50,  blank=True)
    provider_message_id = models.CharField(max_length=100, blank=True)

    related_model = models.CharField(max_length=100, blank=True)
    related_id    = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'sms_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"SMS to {self.recipient_phone}"