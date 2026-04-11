from django.db import models
from django.db.models import Q
from apps.common.models import TimeStampedModel, SoftDeleteModel
import re


def generate_branch_code(clinic_name: str, sequence: int) -> str:
    slug = re.sub(r"\s+", "", clinic_name)
    slug = re.sub(r"[^A-Za-z0-9]", "", slug)
    return f"{slug}-{sequence:04d}"


class Clinic(TimeStampedModel, SoftDeleteModel):
    """Main clinic/practice with support for multiple branches"""

    parent_clinic = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='branches',
        help_text='Parent clinic if this is a branch'
    )

    name         = models.CharField(max_length=200)
    branch_code  = models.CharField(
        max_length=100, unique=True,
        help_text='Auto-generated unique branch identifier',
        blank=True, null=True
    )
    email        = models.EmailField(blank=True)
    phone        = models.CharField(max_length=15, blank=True)
    address      = models.TextField(blank=True)
    city         = models.CharField(max_length=200, blank=True)
    province     = models.CharField(max_length=200, blank=True)
    postal_code  = models.CharField(max_length=10, blank=True)

    tin                      = models.CharField(max_length=50, blank=True, verbose_name='TIN')
    philhealth_accreditation = models.CharField(max_length=100, blank=True)

    custom_location = models.CharField(
        max_length=500, blank=True,
        help_text='Manual free-text location when standard search fails'
    )
    latitude  = models.DecimalField(max_digits=9,  decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)

    logo    = models.ImageField(upload_to='clinic_logos/', null=True, blank=True)
    website = models.URLField(blank=True)
    timezone = models.CharField(max_length=50, default='Asia/Manila')

    is_main_branch = models.BooleanField(default=True, help_text='Is this the main clinic?')
    is_active      = models.BooleanField(default=True)

    # ── NEW: tracks whether admin has completed the clinic profile setup ──────
    setup_complete = models.BooleanField(
        default=False,
        help_text='True once the admin has completed the initial clinic profile setup.'
    )

    # ── Notification preferences ──────────────────────────────────────────────
    email_notifications_enabled = models.BooleanField(
        default=True,
        help_text='Master switch: when False, NO automated or manual emails are sent.'
    )
    sms_notifications_enabled = models.BooleanField(
        default=False,
        help_text='Master switch for SMS notifications (placeholder — not yet active).'
    )

    subscription_plan = models.CharField(
        max_length=20,
        choices=[
            ('TRIAL', 'Trial'),
            ('BASIC', 'Basic'),
            ('PROFESSIONAL', 'Professional'),
            ('ENTERPRISE', 'Enterprise'),
        ],
        default='TRIAL'
    )
    subscription_expires = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'clinics'
        ordering = ['name']
        indexes = [
            models.Index(fields=['parent_clinic', 'is_active']),
            models.Index(fields=['branch_code']),
        ]

    def __str__(self):
        if self.parent_clinic:
            return f"{self.parent_clinic.name} - {self.name}"
        return self.name

    def save(self, *args, **kwargs):
        if not self.branch_code:
            if self.parent_clinic:
                root_clinic    = self.parent_clinic
                root_name      = root_clinic.name
                existing_count = Clinic.objects.filter(
                    Q(id=root_clinic.id) | Q(parent_clinic=root_clinic)
                ).count()
                sequence = existing_count + 1
                code = generate_branch_code(root_name, sequence)
                while Clinic.objects.filter(branch_code=code).exists():
                    sequence += 1
                    code = generate_branch_code(root_name, sequence)
            else:
                root_name      = self.name
                existing_count = Clinic.objects.filter(
                    branch_code__startswith=re.sub(r"\s+", "", re.sub(r"[^A-Za-z0-9\s]", "", root_name))
                ).count()
                sequence = existing_count + 1
                code = generate_branch_code(root_name, sequence)
                while Clinic.objects.filter(branch_code=code).exists():
                    sequence += 1
                    code = generate_branch_code(root_name, sequence)

            self.branch_code = code

        super().save(*args, **kwargs)

    @property
    def is_branch(self):
        return self.parent_clinic is not None

    @property
    def main_clinic(self):
        if self.parent_clinic:
            return self.parent_clinic.main_clinic if self.parent_clinic.parent_clinic else self.parent_clinic
        return self

    def get_all_branches(self):
        if self.is_branch:
            return self.parent_clinic.get_all_branches()
        return Clinic.objects.filter(
            Q(id=self.id) | Q(parent_clinic=self)
        ).filter(is_deleted=False, is_active=True)


class Practitioner(TimeStampedModel, SoftDeleteModel):
    """Healthcare practitioners associated with clinics"""

    user = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='practitioner_profile'
    )
    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.CASCADE,
        related_name='practitioners'
    )

    license_number           = models.CharField(max_length=100)
    specialization           = models.CharField(max_length=200)
    discipline                = models.CharField(max_length=50, choices=[
        ('OCCUPATIONAL_THERAPY', 'Occupational Therapy'),
        ('SPEECH_LANGUAGE_PATHOLOGIST', 'Speech Language Pathologist'),
        ('PHYSICAL_THERAPY', 'Physical Therapy'),
        ('OSTEOPATHY', 'Osteopathy'),
        ('DENTISTRY', 'Dentistry'),
        ('MD_GENERAL_PRACTITIONER', 'MD: General Practitioner'),
    ], default='OCCUPATIONAL_THERAPY')
    prc_license              = models.CharField(max_length=100, blank=True, verbose_name='PRC License')
    philhealth_accreditation = models.CharField(max_length=100, blank=True)

    consultation_fee     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    bio                  = models.TextField(blank=True)
    is_accepting_patients = models.BooleanField(default=True)

    # ── Practitioner Availability ──────────────────────────────────────────────
    DUTY_DAY_CHOICES = [
        ('Mon', 'Monday'),
        ('Tue', 'Tuesday'),
        ('Wed', 'Wednesday'),
        ('Thu', 'Thursday'),
        ('Fri', 'Friday'),
        ('Sat', 'Saturday'),
        ('Sun', 'Sunday'),
    ]

    duty_days = models.JSONField(
        default=list,
        help_text='List of duty days, e.g. ["Mon", "Tue", "Wed"]'
    )
    duty_start_time = models.TimeField(
        default='08:00',
        help_text='Duty start time (legacy – superseded by duty_schedule)'
    )
    duty_end_time = models.TimeField(
        default='17:00',
        help_text='Duty end time (legacy – superseded by duty_schedule)'
    )
    lunch_start_time = models.TimeField(
        default='12:00',
        help_text='Lunch break start time'
    )
    lunch_end_time = models.TimeField(
        default='13:00',
        help_text='Lunch break end time'
    )
    # Split-shift schedule: {"Mon": [{"start":"08:00","end":"11:00"}, ...], ...}
    # When set, overrides duty_start_time / duty_end_time.
    duty_schedule = models.JSONField(
        null=True,
        blank=True,
        default=None,
        help_text='Per-day list of {start, end} blocks for split-shift support'
    )

    class Meta:
        db_table = 'practitioners'
        ordering = ['user__last_name', 'user__first_name']

    def __str__(self):
        return f"Dr. {self.user.get_full_name()}"

    @property
    def availability(self):
        """Return availability as a dict for API responses."""
        return {
            'duty_days': self.duty_days or ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            'duty_start_time': self.duty_start_time.strftime('%H:%M') if self.duty_start_time else '08:00',
            'duty_end_time': self.duty_end_time.strftime('%H:%M') if self.duty_end_time else '17:00',
            'lunch_start_time': self.lunch_start_time.strftime('%H:%M') if self.lunch_start_time else '12:00',
            'lunch_end_time': self.lunch_end_time.strftime('%H:%M') if self.lunch_end_time else '13:00',
            'duty_schedule': self.duty_schedule,  # None when not using split shifts
        }


class Location(TimeStampedModel, SoftDeleteModel):
    """Multiple clinic locations"""

    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.CASCADE,
        related_name='locations'
    )

    name        = models.CharField(max_length=200)
    address     = models.TextField()
    city        = models.CharField(max_length=100)
    province    = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10)
    phone       = models.CharField(max_length=15)

    is_primary = models.BooleanField(default=False)
    is_active  = models.BooleanField(default=True)

    class Meta:
        db_table = 'clinic_locations'
        ordering = ['-is_primary', 'name']

    def __str__(self):
        return f"{self.clinic.name} - {self.name}"