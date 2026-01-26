from django.db import models
from apps.common.models import TimeStampedModel


class PhilHealthClaim(TimeStampedModel):
    """PhilHealth claims tracking"""
    
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('PROCESSING', 'Processing'),
        ('APPROVED', 'Approved'),
        ('DENIED', 'Denied'),
        ('PAID', 'Paid'),
    ]
    
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='philhealth_claims'
    )
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='philhealth_claims'
    )
    invoice = models.ForeignKey(
        'billing.Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='philhealth_claims'
    )
    
    claim_number = models.CharField(max_length=100, unique=True)
    claim_date = models.DateField()
    service_date = models.DateField()
    
    # PhilHealth details
    philhealth_number = models.CharField(max_length=50)
    case_type = models.CharField(max_length=100)
    
    # Amounts
    claim_amount = models.DecimalField(max_digits=10, decimal_places=2)
    approved_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    
    # Documents
    documents = models.JSONField(default=list, blank=True)
    
    # Processing
    submission_date = models.DateField(null=True, blank=True)
    processing_notes = models.TextField(blank=True)
    denial_reason = models.TextField(blank=True)
    
    class Meta:
        db_table = 'philhealth_claims'
        ordering = ['-claim_date']
    
    def __str__(self):
        return f"PhilHealth Claim {self.claim_number} - {self.patient.get_full_name()}"


class HMOClaim(TimeStampedModel):
    """HMO claims tracking"""
    
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('PROCESSING', 'Processing'),
        ('APPROVED', 'Approved'),
        ('DENIED', 'Denied'),
        ('PAID', 'Paid'),
    ]
    
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='hmo_claims'
    )
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='hmo_claims'
    )
    invoice = models.ForeignKey(
        'billing.Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='hmo_claims'
    )
    
    claim_number = models.CharField(max_length=100, unique=True)
    claim_date = models.DateField()
    service_date = models.DateField()
    
    # HMO details
    hmo_provider = models.CharField(max_length=200)
    hmo_number = models.CharField(max_length=100)
    authorization_code = models.CharField(max_length=100, blank=True)
    
    # Amounts
    claim_amount = models.DecimalField(max_digits=10, decimal_places=2)
    approved_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    
    # Documents
    documents = models.JSONField(default=list, blank=True)
    
    # Processing
    submission_date = models.DateField(null=True, blank=True)
    processing_notes = models.TextField(blank=True)
    denial_reason = models.TextField(blank=True)
    
    class Meta:
        db_table = 'hmo_claims'
        ordering = ['-claim_date']
    
    def __str__(self):
        return f"HMO Claim {self.claim_number} - {self.patient.get_full_name()}"