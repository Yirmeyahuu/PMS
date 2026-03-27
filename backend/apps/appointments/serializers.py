from apps.clinics import models
from rest_framework import serializers
from .models import Appointment, PractitionerSchedule, AppointmentReminder, BlockAppointment
from apps.clinics.services.models import Service


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name      = serializers.CharField(source='patient.get_full_name', read_only=True)
    practitioner_name = serializers.CharField(source='practitioner.user.get_full_name', read_only=True, allow_null=True)
    practitioner_avatar = serializers.SerializerMethodField()
    location_name     = serializers.CharField(source='location.name', read_only=True, allow_null=True)
    created_by_name   = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    updated_by_name   = serializers.CharField(source='updated_by.get_full_name', read_only=True, allow_null=True)

    service_name     = serializers.CharField(source='service.name',             read_only=True, allow_null=True)
    service_color    = serializers.CharField(source='service.color_hex',        read_only=True, allow_null=True)
    service_duration = serializers.IntegerField(source='service.duration_minutes', read_only=True, allow_null=True)

    # ── Expose the branch_id consistently ────────────────────────────────────
    branch_id = serializers.SerializerMethodField()

    # Include arrival_status and arrival_time in the response
    arrival_status = serializers.CharField(read_only=True)
    arrival_time = serializers.DateTimeField(read_only=True)

    class Meta:
        model  = Appointment
        fields = [
            'id', 'clinic', 'branch_id', 'patient', 'patient_name',
            'practitioner', 'practitioner_name', 'practitioner_avatar',
            'location', 'location_name',
            'service', 'service_name', 'service_color', 'service_duration',
            'appointment_type',
            'status', 'arrival_status', 'arrival_time',
            'date', 'start_time', 'end_time', 'duration_minutes',
            'chief_complaint', 'notes', 'patient_notes',
            'reminder_sent', 'reminder_sent_at',
            'created_by', 'created_by_name',
            'updated_by', 'updated_by_name',
            'cancelled_by', 'cancellation_reason', 'cancelled_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'branch_id', 'patient_name', 'practitioner_name', 'practitioner_avatar', 'location_name',
            'service_name', 'service_color', 'service_duration',
            'created_by_name', 'updated_by_name',
            'created_at', 'updated_at',
        ]

    def get_practitioner_avatar(self, obj) -> str | None:
        """Get practitioner avatar URL from user model with full absolute URL."""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"[AppointmentSerializer] get_practitioner_avatar called for appointment {obj.id}")
        logger.info(f"[AppointmentSerializer] practitioner: {obj.practitioner}")
        
        if obj.practitioner and obj.practitioner.user:
            user = obj.practitioner.user
            logger.info(f"[AppointmentSerializer] user: {user.email}, avatar field: {user.avatar}")
            
            # Check for avatar field
            avatar = getattr(user, 'avatar', None)
            if avatar:
                logger.info(f"[AppointmentSerializer] avatar found: {avatar}")
                request = self.context.get('request')
                if request:
                    # Build absolute URL like UserSerializer does
                    if hasattr(avatar, 'url'):
                        avatar_url = request.build_absolute_uri(avatar.url)
                        logger.info(f"[AppointmentSerializer] built URL: {avatar_url}")
                        return avatar_url
                    # If it's already a string (URL)
                    return str(avatar)
            else:
                logger.info(f"[AppointmentSerializer] No avatar field on user")
        else:
            logger.info(f"[AppointmentSerializer] No practitioner or practitioner.user")
        return None

    def get_branch_id(self, obj) -> int | None:
        """
        Canonical branch_id for this appointment.
        Priority: practitioner's clinic_branch_id → appointment's clinic_id
        """
        if obj.practitioner:
            branch_id = getattr(obj.practitioner.user, 'clinic_branch_id', None)
            if branch_id:
                return branch_id
        return obj.clinic_id

    def validate(self, data):
        practitioner = data.get('practitioner') or (self.instance.practitioner if self.instance else None)
        service      = data.get('service')      or (self.instance.service      if self.instance else None)

        # ── Auto-set clinic from practitioner's branch ────────────────────────
        if practitioner:
            branch_id = getattr(practitioner.user, 'clinic_branch_id', None)
            if branch_id:
                from apps.clinics.models import Clinic
                try:
                    data['clinic'] = Clinic.objects.get(pk=branch_id)
                except Clinic.DoesNotExist:
                    pass

        # Auto-fill duration from service
        if service and 'duration_minutes' not in data:
            data['duration_minutes'] = service.duration_minutes

        # Validate service belongs to the same clinic group
        request = self.context.get('request')
        if service and request:
            clinic = data.get('clinic') or (self.instance.clinic if self.instance else None)
            if clinic:
                from apps.clinics.models import Clinic as ClinicModel
                main = clinic.main_clinic
                all_branch_ids = list(
                    ClinicModel.objects.filter(
                        models.Q(id=main.id) | models.Q(parent_clinic=main)
                    ).values_list('id', flat=True)
                )
                if service.clinic_id not in all_branch_ids:
                    raise serializers.ValidationError(
                        {'service': 'This service does not belong to your clinic.'}
                    )
        return data


# ── NEW: Restricted edit serializer ──────────────────────────────────────────
class AppointmentEditSerializer(serializers.ModelSerializer):
    """
    Allows editing only the 5 permitted fields.
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
            'arrival_status',
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


# ── Block Appointment Serializer ─────────────────────────────────────────────────

class BlockAppointmentSerializer(serializers.ModelSerializer):
    """Serializer for Block Appointments (events that block time slots)"""
    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True,
        allow_null=True
    )
    clinic_name = serializers.CharField(source='clinic.name', read_only=True, allow_null=True)
    clinic_branch_id = serializers.IntegerField(source='clinic.id', read_only=True, allow_null=True)
    clinic_branch_name = serializers.CharField(source='clinic.name', read_only=True, allow_null=True)

    class Meta:
        model = BlockAppointment
        fields = [
            'id',
            'clinic',
            'clinic_name',
            'clinic_branch_id',
            'clinic_branch_name',
            'event_name',
            'event_type',
            'date',
            'start_time',
            'end_time',
            'notes',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'event_type', 'created_by_name', 'created_at', 'updated_at']

    def validate(self, data):
        start_time = data.get('start_time')
        end_time = data.get('end_time')

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time'
            })

        return data


class BlockAppointmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Block Appointments - used in POST/PUT requests"""

    class Meta:
        model = BlockAppointment
        fields = [
            'clinic',
            'event_name',
            'date',
            'start_time',
            'end_time',
            'notes',
        ]

    def validate(self, data):
        start_time = data.get('start_time')
        end_time = data.get('end_time')

        if start_time and end_time and end_time <= start_time:
            raise serializers.ValidationError({
                'end_time': 'End time must be after start time'
            })

        return data