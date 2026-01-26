from django.db import models
from apps.common.models import TimeStampedModel, SoftDeleteModel


class Patient(TimeStampedModel, SoftDeleteModel):
    """Patient demographic and contact information"""
    
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    ]
    
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='patients'
    )
    
    # Personal Information
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    
    # Contact Information
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=15)
    address = models.TextField()
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10, blank=True)
    
    # Emergency Contact
    emergency_contact_name = models.CharField(max_length=200)
    emergency_contact_phone = models.CharField(max_length=15)
    emergency_contact_relationship = models.CharField(max_length=100)
    
    # Insurance & Billing
    philhealth_number = models.CharField(max_length=50, blank=True)
    hmo_provider = models.CharField(max_length=200, blank=True)
    hmo_number = models.CharField(max_length=100, blank=True)
    
    # Medical History Summary
    medical_conditions = models.TextField(blank=True, help_text='Current medical conditions')
    allergies = models.TextField(blank=True)
    medications = models.TextField(blank=True, help_text='Current medications')
    
    # System fields
    patient_number = models.CharField(max_length=50, unique=True, editable=False)
    avatar = models.ImageField(upload_to='patient_avatars/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'patients'
        ordering = ['last_name', 'first_name']
        indexes = [
            models.Index(fields=['clinic', 'last_name', 'first_name']),
            models.Index(fields=['patient_number']),
        ]
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.patient_number})"
    
    def get_full_name(self):
        middle = f" {self.middle_name} " if self.middle_name else " "
        return f"{self.first_name}{middle}{self.last_name}"
    
    def save(self, *args, **kwargs):
        if not self.patient_number:
            # Generate patient number: YYYYMMDD-XXXX
            from django.utils import timezone
            date_str = timezone.now().strftime('%Y%m%d')
            last_patient = Patient.objects.filter(
                patient_number__startswith=date_str
            ).order_by('patient_number').last()
            
            if last_patient:
                last_num = int(last_patient.patient_number.split('-')[1])
                new_num = last_num + 1
            else:
                new_num = 1
            
            self.patient_number = f"{date_str}-{new_num:04d}"
        
        super().save(*args, **kwargs)


class IntakeForm(TimeStampedModel):
    """Patient intake form responses"""
    
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='intake_forms'
    )
    
    completed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='completed_intake_forms'
    )
    
    # Chief Complaint
    chief_complaint = models.TextField()
    complaint_onset = models.CharField(max_length=200)
    
    # Medical History
    past_medical_history = models.TextField(blank=True)
    surgical_history = models.TextField(blank=True)
    family_history = models.TextField(blank=True)
    social_history = models.TextField(blank=True)
    
    # System Review
    system_review = models.JSONField(default=dict, blank=True)
    
    # Consent
    consent_given = models.BooleanField(default=False)
    consent_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'patient_intake_forms'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Intake Form - {self.patient.get_full_name()} - {self.created_at.date()}"