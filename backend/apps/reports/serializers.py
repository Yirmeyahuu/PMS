from rest_framework import serializers
from .models import Report


class ReportSerializer(serializers.ModelSerializer):
    generated_by_name = serializers.CharField(
        source='generated_by.get_full_name', read_only=True
    )

    class Meta:
        model  = Report
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


# ─── Uninvoiced Bookings ──────────────────────────────────────────────────────

class UninvoicedBookingItemSerializer(serializers.Serializer):
    appointment_id       = serializers.IntegerField()
    date                 = serializers.CharField()     # pre-serialized string
    start_time           = serializers.CharField()
    end_time             = serializers.CharField()
    appointment_type     = serializers.CharField()
    appointment_status   = serializers.CharField()
    patient_id           = serializers.IntegerField()
    patient_name         = serializers.CharField()
    patient_number       = serializers.CharField()
    practitioner_name    = serializers.CharField(allow_blank=True)
    branch_name          = serializers.CharField(allow_null=True)
    days_since_completed = serializers.IntegerField(allow_null=True)
    invoice_status       = serializers.CharField(allow_null=True)   # None | 'DRAFT'
    invoice_number       = serializers.CharField(allow_null=True)


class UninvoicedBookingsSummarySerializer(serializers.Serializer):
    overdue_count    = serializers.IntegerField()
    this_week_count  = serializers.IntegerField()
    no_invoice_count = serializers.IntegerField()
    draft_only_count = serializers.IntegerField()
    practitioners    = serializers.ListField(child=serializers.CharField())
    branches         = serializers.ListField(child=serializers.CharField())


# ─── Cancellations ────────────────────────────────────────────────────────────

class CancellationItemSerializer(serializers.Serializer):
    appointment_id    = serializers.IntegerField()
    date              = serializers.CharField()
    start_time        = serializers.CharField()
    end_time          = serializers.CharField()
    appointment_type  = serializers.CharField()
    status            = serializers.CharField()
    patient_id        = serializers.IntegerField()
    patient_name      = serializers.CharField()
    patient_number    = serializers.CharField()
    practitioner_name = serializers.CharField(allow_blank=True)
    branch_name       = serializers.CharField(allow_null=True)
    cancelled_at      = serializers.CharField(allow_null=True)
    cancelled_by      = serializers.CharField(allow_null=True)
    reason            = serializers.CharField(allow_null=True)


class CancellationsSummarySerializer(serializers.Serializer):
    with_reason_count    = serializers.IntegerField()
    without_reason_count = serializers.IntegerField()
    practitioners        = serializers.ListField(child=serializers.CharField())
    branches             = serializers.ListField(child=serializers.CharField())


# ─── Clients & Cases ──────────────────────────────────────────────────────────

class UpcomingBookingSerializer(serializers.Serializer):
    appointment_id    = serializers.IntegerField()
    date              = serializers.CharField()
    start_time        = serializers.CharField()
    appointment_type  = serializers.CharField()
    status            = serializers.CharField()
    practitioner_name = serializers.CharField()
    service_name      = serializers.CharField()


class ClientCaseItemSerializer(serializers.Serializer):
    patient_id         = serializers.IntegerField()
    patient_name       = serializers.CharField()
    patient_number     = serializers.CharField()
    gender             = serializers.CharField()
    date_of_birth      = serializers.CharField(allow_null=True)
    phone              = serializers.CharField(allow_null=True)
    email              = serializers.CharField(allow_null=True)
    registered_on      = serializers.CharField()
    is_new_this_period = serializers.BooleanField()
    total_bookings     = serializers.IntegerField()
    range_bookings     = serializers.IntegerField()
    upcoming_bookings  = UpcomingBookingSerializer(many=True)


# ─── Clinical Notes ───────────────────────────────────────────────────────────

class ClinicalNotesMissingItemSerializer(serializers.Serializer):
    appointment_id    = serializers.IntegerField()
    date              = serializers.CharField()
    start_time        = serializers.CharField()
    appointment_type  = serializers.CharField()
    patient_id        = serializers.IntegerField()
    patient_name      = serializers.CharField()
    patient_number    = serializers.CharField()
    practitioner_name = serializers.CharField()
    service_name      = serializers.CharField()
    branch_name       = serializers.CharField(allow_null=True)
    days_since        = serializers.IntegerField()
    note_status       = serializers.CharField()
    note_id           = serializers.IntegerField(required=False, allow_null=True)