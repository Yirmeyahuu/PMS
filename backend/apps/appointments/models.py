from django.db import models
from django.core.exceptions import ValidationError
from apps.common.models import TimeStampedModel, SoftDeleteModel


class Appointment(TimeStampedModel, SoftDeleteModel):
    """Patient appointments with practitioners"""
    
    STATUS_CHOICES = [
        ('SCHEDULED', 'Scheduled'),
        ('CONFIRMED', 'Confirmed'),
        ('CHECKED_IN', 'Checked In'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
        ('NO_SHOW', 'No Show'),
    ]
    
    APPOINTMENT_TYPE_CHOICES = [
        ('INITIAL', 'Initial Consultation'),
        ('FOLLOW_UP', 'Follow-up'),
        ('THERAPY', 'Therapy Session'),
        ('ASSESSMENT', 'Assessment'),
    ]
    
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='appointments'
    )
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='appointments'
    )
    practitioner = models.ForeignKey(
        'clinics.Practitioner',
        on_delete=models.CASCADE,
        related_name='appointments'
    )
    location = models.ForeignKey(
        'clinics.Location',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='appointments'
    )
    
    # Appointment details
    appointment_type = models.CharField(max_length=20, choices=APPOINTMENT_TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    
    # Date and time
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    duration_minutes = models.IntegerField(default=60)
    
    # Additional information
    chief_complaint = models.TextField(blank=True)
    notes = models.TextField(blank=True, help_text='Internal notes')
    patient_notes = models.TextField(blank=True, help_text='Notes from patient')
    
    # Reminder tracking
    reminder_sent = models.BooleanField(default=False)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    
    # Cancellation
    cancelled_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancelled_appointments'
    )
    cancellation_reason = models.TextField(blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'appointments'
        ordering = ['-date', '-start_time']
        indexes = [
            models.Index(fields=['clinic', 'date', 'status']),
            models.Index(fields=['practitioner', 'date']),
            models.Index(fields=['patient', 'date']),
        ]
    
    def __str__(self):
        return f"{self.patient.get_full_name()} - {self.date} {self.start_time}"
    
    def clean(self):
        # Validate that end_time is after start_time
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValidationError('End time must be after start time')
        
        # Check for overlapping appointments
        if self.practitioner and self.date and self.start_time and self.end_time:
            overlapping = Appointment.objects.filter(
                practitioner=self.practitioner,
                date=self.date,
                status__in=['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS']
            ).exclude(pk=self.pk)
            
            for apt in overlapping:
                if (self.start_time < apt.end_time and self.end_time > apt.start_time):
                    raise ValidationError('This appointment overlaps with an existing appointment')


class PractitionerSchedule(TimeStampedModel):
    """Practitioner working hours and availability"""
    
    WEEKDAY_CHOICES = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]
    
    practitioner = models.ForeignKey(
        'clinics.Practitioner',
        on_delete=models.CASCADE,
        related_name='schedules'
    )
    location = models.ForeignKey(
        'clinics.Location',
        on_delete=models.CASCADE,
        related_name='practitioner_schedules'
    )
    
    weekday = models.IntegerField(choices=WEEKDAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'practitioner_schedules'
        ordering = ['weekday', 'start_time']
        unique_together = ['practitioner', 'location', 'weekday', 'start_time']
    
    def __str__(self):
        return f"{self.practitioner} - {self.get_weekday_display()} {self.start_time}-{self.end_time}"


class AppointmentReminder(TimeStampedModel):
    """Track appointment reminders sent"""
    
    REMINDER_TYPE_CHOICES = [
        ('EMAIL', 'Email'),
        ('SMS', 'SMS'),
        ('BOTH', 'Email & SMS'),
    ]
    
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name='reminders'
    )
    
    reminder_type = models.CharField(max_length=10, choices=REMINDER_TYPE_CHOICES)
    sent_at = models.DateTimeField(auto_now_add=True)
    is_successful = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        db_table = 'appointment_reminders'
        ordering = ['-sent_at']
    
    def __str__(self):
        return f"Reminder for {self.appointment} - {self.get_reminder_type_display()}"