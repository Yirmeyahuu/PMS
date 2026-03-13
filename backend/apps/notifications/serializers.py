from rest_framework import serializers
from .models import Notification, NotificationRead, EmailLog, SMSLog


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializes a clinic-wide Notification.
    `is_read` and `read_at` are computed per-request-user from the NotificationRead table.
    """

    notification_type_display = serializers.CharField(
        source='get_notification_type_display',
        read_only=True,
    )

    appointment_id     = serializers.IntegerField(source='appointment.id',   read_only=True, allow_null=True)
    clinic_branch_id   = serializers.IntegerField(source='clinic_branch.id', read_only=True, allow_null=True)
    clinic_branch_name = serializers.CharField(
        source='clinic_branch.name', read_only=True, allow_null=True,
    )

    # Computed per-user fields
    is_read = serializers.SerializerMethodField()
    read_at = serializers.SerializerMethodField()

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
        read_only_fields = ['id', 'created_at']

    def _get_read_map(self):
        """
        Returns a dict {notification_id: read_at} for the current user.
        Cached on the serializer context to avoid N+1 queries on list endpoints.
        """
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return {}

        # Cache on the request object for the duration of this response
        cache_key = '_notification_read_map'
        if not hasattr(request, cache_key):
            reads = NotificationRead.objects.filter(
                user=request.user
            ).values_list('notification_id', 'read_at')
            setattr(request, cache_key, dict(reads))

        return getattr(request, cache_key)

    def get_is_read(self, obj) -> bool:
        return obj.id in self._get_read_map()

    def get_read_at(self, obj):
        read_at = self._get_read_map().get(obj.id)
        if read_at:
            return read_at.isoformat()
        return None


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