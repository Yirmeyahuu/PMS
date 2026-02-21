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
            'reminder_sent_at', 'cancelled_at'
        ]
    
    # ✅ FIX: Handle nullable practitioner
    def get_practitioner_name(self, obj):
        if obj.practitioner and obj.practitioner.user:
            return obj.practitioner.user.get_full_name()
        return 'Unassigned'
    
    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None
    
    def get_updated_by_name(self, obj):
        return obj.updated_by.get_full_name() if obj.updated_by else None
    
    def validate(self, data):
        # Custom validation
        if data.get('end_time') and data.get('start_time'):
            if data['end_time'] <= data['start_time']:
                raise serializers.ValidationError("End time must be after start time")
        return data


class PractitionerScheduleSerializer(serializers.ModelSerializer):
    practitioner_name = serializers.CharField(source='practitioner.user.get_full_name', read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    weekday_display = serializers.CharField(source='get_weekday_display', read_only=True)
    
    class Meta:
        model = PractitionerSchedule
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class AppointmentReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppointmentReminder
        fields = '__all__'
        read_only_fields = ['id', 'sent_at']