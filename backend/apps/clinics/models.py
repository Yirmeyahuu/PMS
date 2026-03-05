from django.db import models
from django.db.models import Q
from apps.common.models import TimeStampedModel, SoftDeleteModel
import re


def generate_branch_code(clinic_name: str, sequence: int) -> str:
    """Generate a unique branch code from clinic name and sequence number.
    Strips spaces only — preserves original casing.
    e.g. 'Clinic Test' -> 'ClinicTest-0001'
    """
    slug = re.sub(r"\s+", "", clinic_name)   # remove whitespace only
    slug = re.sub(r"[^A-Za-z0-9]", "", slug) # strip special chars
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
    
    name = models.CharField(max_length=200)
    branch_code = models.CharField(
        max_length=100, unique=True,
        help_text='Auto-generated unique branch identifier',
        blank=True, null=True
    )
    email = models.EmailField(blank=True)           # ✅ blank=True
    phone = models.CharField(max_length=15, blank=True)  # ✅ blank=True
    address = models.TextField(blank=True)          # ✅ blank=True
    city = models.CharField(max_length=100, blank=True)  # ✅ blank=True
    province = models.CharField(max_length=100, blank=True)  # ✅ blank=True
    postal_code = models.CharField(max_length=10, blank=True)  # ✅ blank=True
    
    tin = models.CharField(max_length=50, blank=True, verbose_name='TIN')
    philhealth_accreditation = models.CharField(max_length=100, blank=True)
    
    logo = models.ImageField(upload_to='clinic_logos/', null=True, blank=True)
    website = models.URLField(blank=True)
    timezone = models.CharField(max_length=50, default='Asia/Manila')
    
    is_main_branch = models.BooleanField(default=True, help_text='Is this the main clinic?')
    is_active = models.BooleanField(default=True)
    
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
                # ── This is a branch being created ──────────────────────────
                root_clinic = self.parent_clinic
                root_name   = root_clinic.name

                existing_count = Clinic.objects.filter(
                    Q(id=root_clinic.id) | Q(parent_clinic=root_clinic)
                ).count()

                sequence = existing_count + 1
                code = generate_branch_code(root_name, sequence)
                while Clinic.objects.filter(branch_code=code).exists():
                    sequence += 1
                    code = generate_branch_code(root_name, sequence)

            else:
                # ── This is a brand-new ROOT clinic (not yet saved) ──────────
                # Cannot query by self.id — use name + total clinic count
                root_name = self.name

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
    
    # Professional details
    license_number = models.CharField(max_length=100)
    specialization = models.CharField(max_length=200)
    prc_license = models.CharField(max_length=100, blank=True, verbose_name='PRC License')
    philhealth_accreditation = models.CharField(max_length=100, blank=True)
    
    # Practice details
    consultation_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    bio = models.TextField(blank=True)
    
    # Availability
    is_accepting_patients = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'practitioners'
        ordering = ['user__last_name', 'user__first_name']
    
    def __str__(self):
        return f"Dr. {self.user.get_full_name()}"


class Location(TimeStampedModel, SoftDeleteModel):
    """Multiple clinic locations"""
    
    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.CASCADE,
        related_name='locations'
    )
    
    name = models.CharField(max_length=200)
    address = models.TextField()
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10)
    phone = models.CharField(max_length=15)
    
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'clinic_locations'
        ordering = ['-is_primary', 'name']
    
    def __str__(self):
        return f"{self.clinic.name} - {self.name}"