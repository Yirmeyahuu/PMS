import django_filters
from django.db.models import Q
from apps.appointments.models import Appointment
from .models import Invoice, InvoiceBatch


class AppointmentPrintFilter(django_filters.FilterSet):
    """Filters for the Print Appointments feature."""

    date_from    = django_filters.DateFilter(field_name='date', lookup_expr='gte')
    date_to      = django_filters.DateFilter(field_name='date', lookup_expr='lte')
    date         = django_filters.DateFilter(field_name='date')
    clinic       = django_filters.NumberFilter(field_name='clinic__id')
    practitioner = django_filters.NumberFilter(field_name='practitioner__id')
    status       = django_filters.MultipleChoiceFilter(
        choices=Appointment.STATUS_CHOICES,
    )
    patient_name = django_filters.CharFilter(method='filter_patient_name')

    def filter_patient_name(self, queryset, name, value):
        return queryset.filter(
            Q(patient__first_name__icontains=value) |
            Q(patient__last_name__icontains=value)
        )

    class Meta:
        model  = Appointment
        fields = [
            'date', 'date_from', 'date_to',
            'clinic', 'practitioner', 'status',
            'patient_name',
        ]


class InvoiceFilter(django_filters.FilterSet):
    """Filters for the Invoice list."""

    date_from      = django_filters.DateFilter(field_name='invoice_date', lookup_expr='gte')
    date_to        = django_filters.DateFilter(field_name='invoice_date', lookup_expr='lte')
    clinic         = django_filters.NumberFilter(field_name='clinic__id')
    patient_name   = django_filters.CharFilter(method='filter_patient_name')
    status         = django_filters.MultipleChoiceFilter(choices=Invoice.STATUS_CHOICES)
    appointment    = django_filters.NumberFilter(field_name='appointment__id')

    def filter_patient_name(self, queryset, name, value):
        return queryset.filter(
            Q(patient__first_name__icontains=value) |
            Q(patient__last_name__icontains=value)
        )

    class Meta:
        model  = Invoice
        fields = ['date_from', 'date_to', 'clinic', 'status', 'patient_name', 'bulk_batch', 'appointment']


class InvoiceBatchFilter(django_filters.FilterSet):
    """Filters for the InvoiceBatch list."""

    date_from = django_filters.DateFilter(field_name='date_from', lookup_expr='gte')
    date_to   = django_filters.DateFilter(field_name='date_to',   lookup_expr='lte')
    status    = django_filters.MultipleChoiceFilter(choices=InvoiceBatch.STATUS_CHOICES)

    class Meta:
        model  = InvoiceBatch
        fields = ['status', 'date_from', 'date_to']