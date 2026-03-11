from rest_framework import serializers
from .models import Notification, EmailLog, SMSLog


class NotificationSerializer(serializers.ModelSerializer):

    # Human-readable label for the type
    notification_type_display = serializers.CharField(
        source='get_notification_type_display',
        read_only=True,
    )

    # Minimal appointment snapshot (avoid heavy nesting)
    appointment_id   = serializers.IntegerField(source='appointment.id',   read_only=True, allow_null=True)
    clinic_branch_id = serializers.IntegerField(source='clinic_branch.id', read_only=True, allow_null=True)
    clinic_branch_name = serializers.CharField(
        source='clinic_branch.name', read_only=True, allow_null=True,
    )

    class Meta:
        model  = Notification
        fields = [
            'id',
            'notification_type',
            'notification_type_display',
            'title',
            'message',
            'link_url',
            'appointment_id',
            'clinic_branch_id',
            'clinic_branch_name',
            'is_read',
            'read_at',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'read_at']


class EmailLogSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EmailLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'sent_at']


class SMSLogSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SMSLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'sent_at']