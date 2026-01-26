from django.db import models
from apps.common.models import TimeStampedModel


class Notification(TimeStampedModel):
    """System notifications for users"""
    
    NOTIFICATION_TYPE_CHOICES = [
        ('APPOINTMENT', 'Appointment'),
        ('INVOICE', 'Invoice'),
        ('PAYMENT', 'Payment'),
        ('SYSTEM', 'System'),
        ('REMINDER', 'Reminder'),
    ]
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Links
    link_url = models.CharField(max_length=500, blank=True)
    
    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.user.get_full_name()}"


class EmailLog(TimeStampedModel):
    """Log of emails sent"""
    
    recipient_email = models.EmailField()
    subject = models.CharField(max_length=500)
    body = models.TextField()
    
    # Status
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Reference
    related_model = models.CharField(max_length=100, blank=True)
    related_id = models.IntegerField(null=True, blank=True)
    
    class Meta:
        db_table = 'email_logs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Email to {self.recipient_email} - {self.subject}"


class SMSLog(TimeStampedModel):
    """Log of SMS sent"""
    
    recipient_phone = models.CharField(max_length=15)
    message = models.TextField()
    
    # Status
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Provider details
    provider = models.CharField(max_length=50, blank=True)
    provider_message_id = models.CharField(max_length=100, blank=True)
    
    # Reference
    related_model = models.CharField(max_length=100, blank=True)
    related_id = models.IntegerField(null=True, blank=True)
    
    class Meta:
        db_table = 'sms_logs'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"SMS to {self.recipient_phone}"