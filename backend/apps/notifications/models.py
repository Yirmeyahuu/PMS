from django.db import models
from apps.common.models import TimeStampedModel


class Notification(TimeStampedModel):
    """
    In-system notifications for staff users.
    Covers:
      - NEW_BOOKING  : fired when a patient books an appointment
      - DAILY_SUMMARY: fired once per day per clinic branch listing today's appointments
    """

    NOTIFICATION_TYPE_CHOICES = [
        ('NEW_BOOKING',    'New Appointment Booking'),
        ('DAILY_SUMMARY',  'Daily Appointments Summary'),
    ]

    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='notifications',
    )

    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPE_CHOICES,
        db_index=True,
    )

    title    = models.CharField(max_length=200)
    message  = models.TextField()
    link_url = models.CharField(max_length=500, blank=True)

    # For NEW_BOOKING
    appointment = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
    )

    # ✅ Fixed: Clinic model is the branch — no separate ClinicBranch model exists
    clinic_branch = models.ForeignKey(
        'clinics.Clinic',                          # ← was 'clinics.ClinicBranch'
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='daily_summary_notifications',
    )

    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
            models.Index(fields=['notification_type', 'created_at']),
        ]

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.user.get_full_name()}"


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