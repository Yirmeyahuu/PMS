from django.db import models
from django.utils.crypto import get_random_string
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
    
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=15)
    address = models.TextField()
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10, blank=True)
    
    emergency_contact_name = models.CharField(max_length=200)
    emergency_contact_phone = models.CharField(max_length=15)
    emergency_contact_relationship = models.CharField(max_length=100)
    
    philhealth_number = models.CharField(max_length=50, blank=True)
    hmo_provider = models.CharField(max_length=200, blank=True)
    hmo_number = models.CharField(max_length=100, blank=True)
    
    medical_conditions = models.TextField(blank=True)
    allergies = models.TextField(blank=True)
    medications = models.TextField(blank=True)
    
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
    
    chief_complaint = models.TextField()
    complaint_onset = models.CharField(max_length=200)
    past_medical_history = models.TextField(blank=True)
    surgical_history = models.TextField(blank=True)
    family_history = models.TextField(blank=True)
    social_history = models.TextField(blank=True)
    system_review = models.JSONField(default=dict, blank=True)
    consent_given = models.BooleanField(default=False)
    consent_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'patient_intake_forms'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Intake Form - {self.patient.get_full_name()} - {self.created_at.date()}"


# ─── Patient Portal Models ────────────────────────────────────────────────────

def generate_portal_token():
    return get_random_string(32)


class ServiceCategory(TimeStampedModel, SoftDeleteModel):
    """Groups portal services (e.g. 'Remedial Massage')."""

    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='portal_service_categories',   # ✅ unique related_name
    )
    name        = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    sort_order  = models.PositiveIntegerField(default=0)
    is_active   = models.BooleanField(default=True)

    class Meta:
        db_table = 'portal_service_categories'      # ✅ unique table name
        ordering = ['sort_order', 'name']

    def __str__(self):
        return f"{self.clinic.name} — {self.name}"


class PortalService(TimeStampedModel, SoftDeleteModel):
    """
    A bookable service shown on the patient portal.
    Renamed from 'Service' → 'PortalService' to avoid collision with
    billing.Service which already owns db_table='services'.
    """

    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='portal_services',             # ✅ unique related_name
    )
    category = models.ForeignKey(
        ServiceCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='portal_services',             # ✅ unique related_name
    )

    name             = models.CharField(max_length=200)
    description      = models.TextField(blank=True)
    duration_minutes = models.PositiveIntegerField(default=60)
    price            = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    image            = models.ImageField(upload_to='portal_service_images/', null=True, blank=True)
    is_active        = models.BooleanField(default=True)
    sort_order       = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'portal_services'                # ✅ unique table name
        ordering = ['sort_order', 'name']

    def __str__(self):
        return f"{self.clinic.name} — {self.name}"


class PortalLink(TimeStampedModel):
    """Unique shareable booking portal link for a clinic.
    Always tied to the MAIN clinic — branches share the same link.
    """

    clinic = models.OneToOneField(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='portal_link',
    )
    token = models.CharField(
        max_length=64,
        unique=True,
        default=generate_portal_token,
    )
    heading     = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    is_active   = models.BooleanField(default=True)

    class Meta:
        db_table = 'portal_links'

    def __str__(self):
        return f"Portal — {self.clinic.name} ({self.token})"

    def regenerate_token(self):
        self.token = generate_portal_token()
        self.save(update_fields=['token'])

    @classmethod
    def get_or_create_for_clinic(cls, clinic):
        """
        Always operates on the ROOT/main clinic.
        Safe to call from any branch — returns the shared portal link.
        """
        main_clinic = clinic.main_clinic
        obj, created = cls.objects.get_or_create(clinic=main_clinic)
        return obj, created


class PortalBooking(TimeStampedModel):
    """Booking submitted through the patient portal."""

    STATUS_CHOICES = [
        ('PENDING',   'Pending Review'),
        ('CONFIRMED', 'Confirmed'),
        ('CANCELLED', 'Cancelled'),
        ('COMPLETED', 'Completed'),
    ]

    portal_link = models.ForeignKey(
        PortalLink,
        on_delete=models.CASCADE,
        related_name='bookings',
    )
    service = models.ForeignKey(
        PortalService,                              # ✅ points to renamed model
        on_delete=models.SET_NULL,
        null=True,
        related_name='bookings',
    )
    practitioner = models.ForeignKey(
        'clinics.Practitioner',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='portal_bookings',
    )

    patient_first_name = models.CharField(max_length=100)
    patient_last_name  = models.CharField(max_length=100)
    patient_email      = models.EmailField()
    patient_phone      = models.CharField(max_length=20)
    notes              = models.TextField(blank=True)

    appointment_date = models.DateField()
    appointment_time = models.TimeField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        db_index=True,
    )

    reference_number = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        editable=False,
    )

    class Meta:
        db_table = 'portal_bookings'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['portal_link', 'status']),
            models.Index(fields=['appointment_date', 'appointment_time']),
        ]

    def __str__(self):
        return (
            f"{self.patient_first_name} {self.patient_last_name} — "
            f"{self.service} @ {self.appointment_date} {self.appointment_time}"
        )

    def save(self, *args, **kwargs):
        if not self.reference_number:
            from django.utils import timezone
            prefix = timezone.now().strftime('%Y%m%d')
            suffix = get_random_string(6).upper()
            self.reference_number = f"BK-{prefix}-{suffix}"
        super().save(*args, **kwargs)