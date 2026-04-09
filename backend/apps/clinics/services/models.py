from django.db import models
from apps.common.models import TimeStampedModel, SoftDeleteModel
from apps.clinics.models import Clinic


class Service(TimeStampedModel, SoftDeleteModel):
    """
    A service offered by a clinic (e.g. General Consultation, Dental Cleaning).
    Displayed in the Patient Portal for booking.
    """

    clinic = models.ForeignKey(
        Clinic,
        on_delete=models.CASCADE,
        related_name='clinic_services',
    )

    name            = models.CharField(max_length=255)
    description     = models.TextField(blank=True)
    duration_minutes = models.PositiveIntegerField(
        default=30,
        help_text='Estimated duration of the service in minutes',
    )
    price           = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    image           = models.ImageField(upload_to='service_images/', null=True, blank=True)
    color_hex       = models.CharField(
        max_length=7,
        default='#0D9488',
        help_text='Hex color for calendar display e.g. #0D9488',
    )

    # Ordering / visibility
    sort_order  = models.PositiveIntegerField(default=0)
    is_active   = models.BooleanField(default=True)

    # Show this service on the Patient Portal
    show_in_portal = models.BooleanField(
        default=True,
        help_text='If true, patients can book this service online',
    )

    # Practitioners who offer this service (optional — empty means any practitioner)
    assigned_practitioners = models.ManyToManyField(
        'clinics.Practitioner',
        blank=True,
        related_name='services',
        help_text='Practitioners who offer this service. Empty = any practitioner.',
    )

    class Meta:
        db_table = 'clinic_services'
        ordering  = ['sort_order', 'name']
        unique_together = [('clinic', 'name')]

    def __str__(self):
        return f"{self.clinic.name} — {self.name}"