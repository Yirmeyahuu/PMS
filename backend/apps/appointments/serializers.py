from rest_framework import serializers
from .models import Appointment, PractitionerSchedule, AppointmentReminder


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    # ✅ FIX: Handle nullable practitioner
    practitioner_name = serializers.SerializerMethodField(read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)

    # Add tracking fields
    created_by_name = serializers.SerializerMethodField(read_only=True)
    updated_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'created_by', 'updated_by',
            'reminder_sent_at', 'cancelled_at',
        ]

    def get_practitioner_name(self, obj):
        if obj.practitioner and obj.practitioner.user:
            return obj.practitioner.user.get_full_name()
        return 'Unassigned'

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None

    def get_updated_by_name(self, obj):
        return obj.updated_by.get_full_name() if obj.updated_by else None

    def validate(self, data):
        if data.get('end_time') and data.get('start_time'):
            if data['end_time'] <= data['start_time']:
                raise serializers.ValidationError("End time must be after start time")
        return data


# ── NEW: Restricted edit serializer ──────────────────────────────────────────
class AppointmentEditSerializer(serializers.ModelSerializer):
    """
    Allows editing only the 4 permitted fields.
    updated_by is set in the view, not from the request body.
    """
    practitioner_name = serializers.SerializerMethodField(read_only=True)
    updated_by_name   = serializers.SerializerMethodField(read_only=True)
    updated_at        = serializers.DateTimeField(read_only=True)

    class Meta:
        model  = Appointment
        fields = [
            'id',
            'practitioner',
            'practitioner_name',
            'chief_complaint',
            'notes',
            'patient_notes',
            'updated_by',
            'updated_by_name',
            'updated_at',
        ]
        read_only_fields = ['id', 'updated_by', 'updated_by_name', 'updated_at']

    def get_practitioner_name(self, obj):
        if obj.practitioner and obj.practitioner.user:
            return obj.practitioner.user.get_full_name()
        return 'Unassigned'

    def get_updated_by_name(self, obj):
        return obj.updated_by.get_full_name() if obj.updated_by else None


# ── NEW: Cancel appointment serializer ───────────────────────────────────────
class AppointmentCancelSerializer(serializers.Serializer):
    """
    Validates the cancellation payload.
    cancellation_reason is required and must be non-empty.
    """
    cancellation_reason = serializers.CharField(
        required=True,
        allow_blank=False,
        min_length=5,
        max_length=1000,
        error_messages={
            'required':  'A cancellation reason is required.',
            'blank':     'A cancellation reason is required.',
            'min_length': 'Please provide a more detailed reason (at least 5 characters).',
        }
    )


class PractitionerScheduleSerializer(serializers.ModelSerializer):
    practitioner_name = serializers.CharField(
        source='practitioner.user.get_full_name', read_only=True
    )
    location_name = serializers.CharField(source='location.name', read_only=True)
    weekday_display = serializers.CharField(source='get_weekday_display', read_only=True)

    class Meta:
        model  = PractitionerSchedule
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class AppointmentReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AppointmentReminder
        fields = '__all__'
        read_only_fields = ['id', 'sent_at']


class AppointmentPrintSerializer(serializers.ModelSerializer):
    """
    Flat, print-friendly serializer for the Print Appointments feature.
    """
    patient_full_name        = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_number           = serializers.CharField(source='patient.patient_number', read_only=True)
    patient_phone            = serializers.CharField(source='patient.phone',          read_only=True)
    patient_email            = serializers.CharField(source='patient.email',          read_only=True)
    practitioner_name        = serializers.SerializerMethodField()
    clinic_name              = serializers.CharField(source='clinic.name',            read_only=True)
    clinic_branch_code       = serializers.CharField(source='clinic.branch_code',     read_only=True)
    location_name            = serializers.SerializerMethodField()
    appointment_type_display = serializers.CharField(
        source='get_appointment_type_display', read_only=True
    )
    status_display           = serializers.CharField(source='get_status_display',     read_only=True)
    duration_label           = serializers.SerializerMethodField()

    class Meta:
        model  = Appointment
        fields = [
            'id',
            'date',
            'start_time',
            'end_time',
            'duration_minutes',
            'duration_label',
            'status',
            'status_display',
            'appointment_type',
            'appointment_type_display',
            'patient_full_name',
            'patient_number',
            'patient_phone',
            'patient_email',
            'practitioner_name',
            'clinic_name',
            'clinic_branch_code',
            'location_name',
            'chief_complaint',
            'notes',
            'reminder_sent',
        ]

    def get_practitioner_name(self, obj) -> str:
        if obj.practitioner and obj.practitioner.user:
            return obj.practitioner.user.get_full_name()
        return 'Unassigned'

    def get_location_name(self, obj) -> str:
        if obj.location:
            return obj.location.name
        return obj.clinic.name if obj.clinic else ''

    def get_duration_label(self, obj) -> str:
        mins = obj.duration_minutes or 0
        if mins < 60:
            return f"{mins}min"
        hours, remainder = divmod(mins, 60)
        return f"{hours}h {remainder}min" if remainder else f"{hours}h"