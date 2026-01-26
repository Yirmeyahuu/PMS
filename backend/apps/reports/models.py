from django.db import models
from apps.common.models import TimeStampedModel


class Report(TimeStampedModel):
    """Generated reports for analytics"""
    
    REPORT_TYPE_CHOICES = [
        ('APPOINTMENTS', 'Appointments Report'),
        ('REVENUE', 'Revenue Report'),
        ('PATIENT', 'Patient Statistics'),
        ('PRACTITIONER', 'Practitioner Performance'),
        ('CLINICAL', 'Clinical Outcomes'),
    ]
    
    FORMAT_CHOICES = [
        ('PDF', 'PDF'),
        ('CSV', 'CSV'),
        ('EXCEL', 'Excel'),
    ]
    
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='reports'
    )
    generated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='generated_reports'
    )
    
    report_type = models.CharField(max_length=20, choices=REPORT_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    
    # Date range
    start_date = models.DateField()
    end_date = models.DateField()
    
    # Filters applied
    filters = models.JSONField(default=dict, blank=True)
    
    # Report data
    data = models.JSONField(default=dict)
    
    # File export
    file = models.FileField(upload_to='reports/', null=True, blank=True)
    file_format = models.CharField(max_length=10, choices=FORMAT_CHOICES, blank=True)
    
    class Meta:
        db_table = 'reports'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['clinic', 'report_type', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.created_at.date()}"