from django.db import models
from apps.common.models import TimeStampedModel

class UserFeedback(TimeStampedModel):
    """Core model for Bug Reports, Feature Requests, and General Feedback."""
    
    TYPE_CHOICES = [
        ('BUG', 'Bug Report'),
        ('FEATURE_REQUEST', 'Feature Request'),
        ('GENERAL_FEEDBACK', 'General Feedback'),
        ('SUPPORT', 'Support Request'),
        ('PRIVACY', 'Privacy Concern'),
        ('SECURITY', 'Security Concern'),
        ('OTHER', 'Other'),
    ]

    MODULE_CHOICES = [
        ('DASHBOARD', 'Dashboard'),
        ('DIARY', 'Diary'),
        ('PATIENTS', 'Patients'),
        ('APPOINTMENTS', 'Appointments'),
        ('CASES', 'Cases'),
        ('CLINICAL_DOCUMENTATION', 'Clinical Documentation'),
        ('CLINICAL_NOTES', 'Clinical Notes'),
        ('SESSION_TRACKING', 'Session Tracking'),
        ('INVOICES', 'Invoices'),
        ('BILLING', 'Billing'),
        ('ONLINE_BOOKING', 'Online Booking'),
        ('NOTIFICATIONS', 'Notifications'),
        ('SMS', 'SMS'),
        ('SETUP', 'Setup'),
        ('SERVICES', 'Services'),
        ('SESSION_PACKAGES', 'Session Packages'),
        ('AUTHENTICATION', 'Authentication'),
        ('REPORTS', 'Reports'),
        ('OTHER', 'Other'),
    ]

    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]

    STATUS_CHOICES = [
        ('NEW', 'New'),
        ('TRIAGED', 'Triaged'),
        ('INVESTIGATING', 'Investigating'),
        ('IN_PROGRESS', 'In Progress'),
        ('WAITING_FOR_USER', 'Waiting for User'),
        ('RESOLVED', 'Resolved'),
        ('CLOSED', 'Closed'),
        ('DUPLICATE', 'Duplicate'),
        ('REJECTED', 'Rejected'),
    ]

    submitted_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='submitted_feedback'
    )
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feedback_reports'
    )
    user_role = models.CharField(max_length=50, blank=True)
    
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='BUG')
    module = models.CharField(max_length=50, choices=MODULE_CHOICES, default='OTHER')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NEW')
    
    title = models.CharField(max_length=255)
    description = models.TextField()
    
    assigned_developer = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_feedback'
    )
    
    duplicate_of = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='duplicates'
    )

    # Technical Context
    page_url = models.URLField(blank=True, max_length=500)
    browser = models.CharField(max_length=100, blank=True)
    os = models.CharField(max_length=100, blank=True)
    user_agent = models.TextField(blank=True)
    app_version = models.CharField(max_length=50, blank=True)

    resolved_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'user_feedback'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'priority', 'created_at']),
        ]

    def __str__(self):
        return f"#{self.id} [{self.get_type_display()}] {self.title}"


class UserFeedbackAttachment(TimeStampedModel):
    """Private attachments (screenshots/photos) for feedback."""
    feedback = models.ForeignKey(
        UserFeedback,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    file = models.FileField(upload_to='support/attachments/')
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100)
    file_size = models.IntegerField(help_text='File size in bytes')
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='support_attachments'
    )

    class Meta:
        db_table = 'user_feedback_attachments'
        ordering = ['created_at']

    def __str__(self):
        return f"Attachment {self.original_filename} for Feedback #{self.feedback_id}"


class UserFeedbackComment(TimeStampedModel):
    """Internal developer comments and user-facing responses."""
    feedback = models.ForeignKey(
        UserFeedback,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='feedback_comments'
    )
    comment = models.TextField()
    is_internal = models.BooleanField(
        default=True, 
        help_text="If True, only developers/admins can see this. Normal users cannot."
    )

    class Meta:
        db_table = 'user_feedback_comments'
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author.get_full_name()} on Feedback #{self.feedback_id}"


class UserFeedbackStatusHistory(TimeStampedModel):
    """Audit trail for feedback status changes."""
    feedback = models.ForeignKey(
        UserFeedback,
        on_delete=models.CASCADE,
        related_name='status_history'
    )
    changed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='feedback_status_changes'
    )
    previous_status = models.CharField(max_length=20, choices=UserFeedback.STATUS_CHOICES)
    new_status = models.CharField(max_length=20, choices=UserFeedback.STATUS_CHOICES)
    comment = models.TextField(blank=True, help_text="Optional reason for the change")

    class Meta:
        db_table = 'user_feedback_status_history'
        ordering = ['created_at']

    def __str__(self):
        return f"#{self.feedback_id} {self.previous_status} -> {self.new_status}"
