from django.db import models
from apps.common.models import TimeStampedModel, SoftDeleteModel
from apps.clinics.models import Clinic


DISCIPLINE_CHOICES = [
    ('OCCUPATIONAL_THERAPY',        'Occupational Therapy'),
    ('SPEECH_LANGUAGE_PATHOLOGIST', 'Speech Language Pathologist'),
    ('PHYSICAL_THERAPY',            'Physical Therapy'),
    ('OSTEOPATHY',                  'Osteopathy'),
    ('DENTISTRY',                   'Dentistry'),
    ('MD_GENERAL_PRACTITIONER',     'MD: General Practitioner'),
]


class Service(TimeStampedModel, SoftDeleteModel):
    """
    A service offered by a clinic (e.g. General Consultation, Dental Cleaning).
    Displayed in the Patient Portal for booking.

    Services are assigned to a practitioner **discipline** so that all
    practitioners sharing the same discipline can offer the service.
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

    # Discipline this service belongs to.
    # All practitioners with this discipline can offer the service.
    discipline = models.CharField(
        max_length=50,
        choices=DISCIPLINE_CHOICES,
        default='OCCUPATIONAL_THERAPY',
        help_text='Practitioner discipline this service is assigned to.',
    )

    # Ordering / visibility
    sort_order  = models.PositiveIntegerField(default=0)
    is_active   = models.BooleanField(default=True)

    # Show this service on the Patient Portal
    show_in_portal = models.BooleanField(
        default=True,
        help_text='If true, patients can book this service online',
    )

    # Package Support
    is_package = models.BooleanField(
        default=False,
        help_text='If true, this service functions as a treatment package'
    )
    session_allocation = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Number of sessions approved when this package is booked. Required if is_package is True.'
    )

    # Legacy: kept for backward compatibility with existing appointment records.
    # New services are assigned via the `discipline` field instead.
    assigned_practitioners = models.ManyToManyField(
        'clinics.Practitioner',
        blank=True,
        related_name='services',
        help_text='[Legacy] Practitioners who offer this service. Use discipline instead.',
    )

    class Meta:
        db_table = 'clinic_services'
        ordering  = ['sort_order', 'name']
        unique_together = [('clinic', 'name')]

    def __str__(self):
        return f"{self.clinic.name} — {self.name}"