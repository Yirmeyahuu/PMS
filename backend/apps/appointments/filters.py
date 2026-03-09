import django_filters
from django.db.models import Q
from .models import Appointment


class AppointmentFilter(django_filters.FilterSet):
    # Date range
    date        = django_filters.DateFilter(field_name='date')
    date_from   = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to     = django_filters.DateFilter(field_name='date', lookup_expr='lte')

    # Clinic / branch
    clinic      = django_filters.NumberFilter(field_name='clinic__id')

    # Practitioner
    practitioner = django_filters.NumberFilter(field_name='practitioner__id')

    # Status
    status      = django_filters.MultipleChoiceFilter(
        choices=[
            ('SCHEDULED',   'Scheduled'),
            ('CONFIRMED',   'Confirmed'),
            ('CHECKED_IN',  'Checked In'),
            ('IN_PROGRESS', 'In Progress'),
            ('COMPLETED',   'Completed'),
            ('CANCELLED',   'Cancelled'),
            ('NO_SHOW',     'No Show'),
        ]
    )

    # Search patient name
    patient_name = django_filters.CharFilter(method='filter_patient_name')

    def filter_patient_name(self, queryset, name, value):
        return queryset.filter(
            Q(patient__first_name__icontains=value) |
            Q(patient__last_name__icontains=value)
        )

    class Meta:
        model   = Appointment
        fields  = [
            'date', 'date_from', 'date_to',
            'clinic', 'practitioner', 'status',
            'patient_name',
        ]