from rest_framework import serializers
from .models import Conversation, ConversationParticipant, Message
from apps.accounts.models import User


class ParticipantSerializer(serializers.ModelSerializer):
    """Minimal user info shown inside conversations."""
    full_name          = serializers.SerializerMethodField()
    avatar             = serializers.SerializerMethodField()
    clinic_branch_name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'full_name', 'email', 'role', 'avatar', 'clinic_branch_name']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_avatar(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None

    def get_clinic_branch_name(self, obj):
        if obj.clinic_branch:
            return obj.clinic_branch.name
        if obj.clinic and obj.clinic.is_main_branch:
            return 'Main Branch'
        return obj.clinic.name if obj.clinic else 'Main Branch'


class MessageSerializer(serializers.ModelSerializer):
    sender_id   = serializers.IntegerField(source='sender.id',         read_only=True)
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    sender_avatar = serializers.SerializerMethodField()

    class Meta:
        model  = Message
        fields = [
            'id', 'conversation', 'sender_id', 'sender_name',
            'sender_avatar', 'body', 'is_edited', 'created_at',
        ]
        read_only_fields = ['id', 'sender_id', 'sender_name', 'sender_avatar', 'created_at']

    def get_sender_avatar(self, obj):
        request = self.context.get('request')
        if obj.sender.avatar and request:
            return request.build_absolute_uri(obj.sender.avatar.url)
        return None


class ConversationSerializer(serializers.ModelSerializer):
    """
    Full conversation with last message preview and unread count
    for the requesting user.
    """
    other_participant = serializers.SerializerMethodField()
    last_message      = serializers.SerializerMethodField()
    unread_count      = serializers.SerializerMethodField()

    class Meta:
        model  = Conversation
        fields = [
            'id', 'clinic', 'other_participant',
            'last_message', 'unread_count', 'updated_at',
        ]

    def get_other_participant(self, obj):
        request = self.context.get('request')
        other   = obj.get_other_participant(request.user)
        return ParticipantSerializer(other, context=self.context).data if other else None

    def get_last_message(self, obj):
        msg = obj.messages.filter(is_deleted=False).last()
        return MessageSerializer(msg, context=self.context).data if msg else None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        try:
            membership = obj.memberships.get(user=request.user)
            if membership.last_read_at is None:
                return obj.messages.filter(is_deleted=False).exclude(
                    sender=request.user
                ).count()
            return obj.messages.filter(
                is_deleted=False,
                created_at__gt=membership.last_read_at,
            ).exclude(sender=request.user).count()
        except ConversationParticipant.DoesNotExist:
            return 0


class StartConversationSerializer(serializers.Serializer):
    """Payload to start or retrieve a 1-to-1 conversation."""
    recipient_id = serializers.IntegerField()

    def validate_recipient_id(self, value):
        request = self.context['request']
        try:
            recipient = User.objects.get(
                pk=value,
                is_deleted=False,
                is_active=True,
                role__in=['STAFF', 'PRACTITIONER', 'ADMIN'],
            )
        except User.DoesNotExist:
            raise serializers.ValidationError('Recipient not found or not a staff member.')

        if recipient.clinic_id != request.user.clinic_id:
            raise serializers.ValidationError(
                'You can only message users within your clinic.'
            )

        if recipient.pk == request.user.pk:
            raise serializers.ValidationError('You cannot message yourself.')

        return value