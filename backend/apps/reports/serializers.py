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


# ─── Lightweight read serializers used inside report payloads ─────────────────

class UninvoicedBookingItemSerializer(serializers.Serializer):
    appointment_id       = serializers.IntegerField()
    date                 = serializers.DateField()
    start_time           = serializers.TimeField()
    end_time             = serializers.TimeField()
    appointment_type     = serializers.CharField()
    status               = serializers.CharField()
    patient_id           = serializers.IntegerField()
    patient_name         = serializers.CharField()
    patient_number       = serializers.CharField()
    practitioner_name    = serializers.CharField()
    service_name         = serializers.CharField()
    branch_name          = serializers.CharField(allow_null=True)
    days_since_completed = serializers.IntegerField(allow_null=True)


class CancellationItemSerializer(serializers.Serializer):
    appointment_id    = serializers.IntegerField()
    date              = serializers.DateField()
    start_time        = serializers.TimeField()
    cancelled_at      = serializers.DateTimeField(allow_null=True)
    appointment_type  = serializers.CharField()
    patient_id        = serializers.IntegerField()
    patient_name      = serializers.CharField()
    patient_number    = serializers.CharField()
    practitioner_name = serializers.CharField()
    service_name      = serializers.CharField()
    branch_name       = serializers.CharField(allow_null=True)
    cancelled_by      = serializers.CharField(allow_null=True)
    reason            = serializers.CharField(allow_null=True)


class ClientCaseUpcomingSerializer(serializers.Serializer):
    appointment_id    = serializers.IntegerField()
    date              = serializers.DateField()
    start_time        = serializers.TimeField()
    appointment_type  = serializers.CharField()
    status            = serializers.CharField()
    practitioner_name = serializers.CharField()
    service_name      = serializers.CharField()


class ClientCaseItemSerializer(serializers.Serializer):
    patient_id        = serializers.IntegerField()
    patient_name      = serializers.CharField()
    patient_number    = serializers.CharField()
    gender            = serializers.CharField()
    date_of_birth     = serializers.DateField(allow_null=True)
    phone             = serializers.CharField(allow_null=True)
    email             = serializers.CharField(allow_null=True)
    registered_on     = serializers.DateField()
    is_new_this_period = serializers.BooleanField()
    total_bookings    = serializers.IntegerField()
    upcoming_bookings = ClientCaseUpcomingSerializer(many=True)


class ClinicalNotesMissingItemSerializer(serializers.Serializer):
    appointment_id    = serializers.IntegerField()
    date              = serializers.DateField()
    start_time        = serializers.TimeField()
    appointment_type  = serializers.CharField()
    patient_id        = serializers.IntegerField()
    patient_name      = serializers.CharField()
    patient_number    = serializers.CharField()
    practitioner_name = serializers.CharField()
    service_name      = serializers.CharField()
    branch_name       = serializers.CharField(allow_null=True)
    days_since        = serializers.IntegerField()