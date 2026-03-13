from rest_framework import serializers
from apps.appointments.models import Appointment
from apps.clinics.models import Clinic
from apps.patients.models import Patient
from .models import Invoice, InvoiceItem, Payment, Service, InvoiceBatch


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model            = InvoiceItem
        fields           = '__all__'
        read_only_fields = ['id', 'total', 'created_at', 'updated_at']


class InvoiceItemWriteSerializer(serializers.ModelSerializer):
    """Used when creating/updating line items inline with an invoice."""
    id = serializers.IntegerField(required=False)  # allow update of existing items

    class Meta:
        model  = InvoiceItem
        fields = ['id', 'description', 'quantity', 'unit_price', 'discount_percent', 'tax_percent', 'service_code']


class InvoiceSerializer(serializers.ModelSerializer):
    patient_name     = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_number   = serializers.CharField(source='patient.patient_number', read_only=True)
    clinic_name      = serializers.CharField(source='clinic.name',            read_only=True)
    created_by_name  = serializers.SerializerMethodField()
    status_display   = serializers.CharField(source='get_status_display',     read_only=True)
    items            = InvoiceItemSerializer(many=True, read_only=True)

    appointment_date       = serializers.DateField(source='appointment.date',       read_only=True, allow_null=True)
    appointment_start_time = serializers.TimeField(source='appointment.start_time', read_only=True, allow_null=True)

    # Not required in the request body — set by perform_create or passed explicitly
    clinic  = serializers.PrimaryKeyRelatedField(queryset=Clinic.objects.all(),      required=False)
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(),     required=False)
    appointment = serializers.PrimaryKeyRelatedField(
        queryset=Appointment.objects.all(), required=False, allow_null=True,
    )

    # Optional inline items for creation
    inline_items = InvoiceItemWriteSerializer(many=True, required=False, write_only=True)

    class Meta:
        model            = Invoice
        fields           = '__all__'
        read_only_fields = [
            'id', 'invoice_number', 'subtotal', 'total_amount',
            'amount_paid', 'balance_due', 'created_at', 'updated_at',
        ]
        extra_kwargs = {
            'inline_items': {'write_only': True},
        }

    def get_created_by_name(self, obj) -> str | None:
        return obj.created_by.get_full_name() if obj.created_by else None


class InvoiceCreateSerializer(serializers.Serializer):
    """
    Simplified serializer for creating an individual invoice from an appointment.
    Used by the AppointmentView → "Generate Invoice" button.
    """
    appointment  = serializers.PrimaryKeyRelatedField(queryset=Appointment.objects.all())
    patient      = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all(), required=False)
    clinic       = serializers.PrimaryKeyRelatedField(queryset=Clinic.objects.all(), required=False)
    invoice_date = serializers.DateField()
    due_date     = serializers.DateField(required=False, allow_null=True)
    notes        = serializers.CharField(required=False, allow_blank=True, default='')

    # Optional line items to add immediately
    items = InvoiceItemWriteSerializer(many=True, required=False, default=list)

    def validate_appointment(self, value):
        """Check appointment doesn't already have a non-deleted invoice."""
        existing = Invoice.objects.filter(
            appointment=value,
            is_deleted=False,
        ).first()
        if existing:
            raise serializers.ValidationError(
                f"Appointment already has invoice {existing.invoice_number}. "
                f"Delete it first or edit the existing one."
            )
        return value


class PaymentSerializer(serializers.ModelSerializer):
    invoice_number   = serializers.CharField(source='invoice.invoice_number', read_only=True)
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model            = Payment
        fields           = '__all__'
        read_only_fields = ['id', 'receipt_number', 'created_at', 'updated_at']

    def get_received_by_name(self, obj) -> str | None:
        return obj.received_by.get_full_name() if obj.received_by else None


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model            = Service
        fields           = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class InvoiceBatchSerializer(serializers.ModelSerializer):
    clinic_name     = serializers.CharField(source='clinic.name',        read_only=True)
    created_by_name = serializers.SerializerMethodField()
    status_display  = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model            = InvoiceBatch
        fields           = '__all__'
        read_only_fields = ['id', 'batch_number', 'created_at']

    def get_created_by_name(self, obj) -> str | None:
        return obj.created_by.get_full_name() if obj.created_by else None


class BulkInvoiceRequestSerializer(serializers.Serializer):
    date_from        = serializers.DateField()
    date_to          = serializers.DateField()
    clinic_ids       = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    status_filter    = serializers.ListField(child=serializers.CharField(),    required=False, default=lambda: ['COMPLETED'])
    invoice_date     = serializers.DateField(required=False, allow_null=True)
    due_date         = serializers.DateField(required=False, allow_null=True)
    discount_percent = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)
    tax_percent      = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=0)
    skip_existing    = serializers.BooleanField(default=True)
    dry_run          = serializers.BooleanField(default=False)

    def validate(self, attrs):
        if attrs['date_from'] > attrs['date_to']:
            raise serializers.ValidationError({'date_to': 'date_to must be on or after date_from.'})

        allowed = ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED']
        for s in attrs.get('status_filter', []):
            if s not in allowed:
                raise serializers.ValidationError(
                    {'status_filter': f"'{s}' is not a valid appointment status."}
                )
        return attrs


# ── Print Appointments ────────────────────────────────────────────────────────

class AppointmentPrintSerializer(serializers.ModelSerializer):
    """Flat, print-ready serializer for the Print Appointments feature."""

    patient_name     = serializers.CharField(source='patient.get_full_name',  read_only=True)
    patient_number   = serializers.CharField(source='patient.patient_number', read_only=True)
    practitioner_name = serializers.SerializerMethodField()
    clinic_name      = serializers.CharField(source='clinic.name',            read_only=True)
    location_name    = serializers.SerializerMethodField()
    status_display   = serializers.CharField(source='get_status_display',     read_only=True)
    appointment_type_display = serializers.CharField(
        source='get_appointment_type_display', read_only=True,
    )
    has_invoice      = serializers.SerializerMethodField()

    class Meta:
        model  = Appointment
        fields = [
            'id',
            'date', 'start_time', 'end_time', 'duration_minutes',
            'status', 'status_display',
            'appointment_type', 'appointment_type_display',
            'patient_id', 'patient_name', 'patient_number',
            'practitioner_id', 'practitioner_name',
            'clinic_id', 'clinic_name',
            'location_name',
            'chief_complaint',
            'has_invoice',
        ]

    def get_practitioner_name(self, obj) -> str:
        if obj.practitioner and obj.practitioner.user:
            return obj.practitioner.user.get_full_name()
        return 'Unassigned'

    def get_location_name(self, obj) -> str:
        return obj.location.name if obj.location else ''

    def get_has_invoice(self, obj) -> bool:
        return obj.billing_invoices.filter(is_deleted=False).exists()