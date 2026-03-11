from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
import logging

from .models import Conversation, ConversationParticipant, Message
from .serializers import (
    ConversationSerializer,
    MessageSerializer,
    StartConversationSerializer,
)
from apps.accounts.models import User

logger = logging.getLogger(__name__)

ALLOWED_ROLES = ('ADMIN', 'STAFF', 'PRACTITIONER')


class ConversationViewSet(viewsets.GenericViewSet):
    """
    Endpoints
    ---------
    POST   /api/conversations/start/          → start or retrieve a 1-to-1 conversation
    GET    /api/conversations/                 → list my conversations
    GET    /api/conversations/{id}/messages/   → paginated message history
    POST   /api/conversations/{id}/mark_read/  → mark conversation as read
    GET    /api/conversations/contacts/        → list messageable colleagues
    GET    /api/conversations/unread_count/    → total unread badge count
    """

    permission_classes = [IsAuthenticated]
    serializer_class   = ConversationSerializer

    def _base_qs(self):
        """Conversations where the requesting user is a participant."""
        return (
            Conversation.objects
            .filter(
                memberships__user=self.request.user,
                is_deleted=False,
            )
            .select_related('clinic')
            .prefetch_related('participants', 'memberships')
            .distinct()
            .order_by('-updated_at')
        )

    # ── List conversations ────────────────────────────────────────────────

    def list(self, request):
        qs = self._base_qs()
        serializer = ConversationSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    # ── Start / retrieve a conversation ───────────────────────────────────

    @action(detail=False, methods=['post'])
    def start(self, request):
        # Only staff / practitioners / admin may message
        if request.user.role not in ALLOWED_ROLES:
            return Response(
                {'detail': 'You do not have permission to send messages.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        ser = StartConversationSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)

        recipient_id = ser.validated_data['recipient_id']
        recipient    = User.objects.get(pk=recipient_id)

        # Find existing 1-to-1 conversation in this clinic
        existing = (
            Conversation.objects
            .filter(
                clinic=request.user.clinic,
                memberships__user=request.user,
                is_deleted=False,
            )
            .filter(memberships__user=recipient)
            .distinct()
            .first()
        )

        if existing:
            return Response(
                ConversationSerializer(existing, context={'request': request}).data,
                status=status.HTTP_200_OK,
            )

        # Create new conversation
        conversation = Conversation.objects.create(clinic=request.user.clinic)
        ConversationParticipant.objects.bulk_create([
            ConversationParticipant(conversation=conversation, user=request.user),
            ConversationParticipant(conversation=conversation, user=recipient),
        ])

        logger.info(
            f'Conversation created: #{conversation.pk} '
            f'between {request.user.email} and {recipient.email}'
        )
        return Response(
            ConversationSerializer(conversation, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )

    # ── Message history ───────────────────────────────────────────────────

    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        conversation = self._get_conversation_or_403(pk)
        if isinstance(conversation, Response):
            return conversation

        qs  = conversation.messages.filter(is_deleted=False).order_by('created_at')
        ser = MessageSerializer(qs, many=True, context={'request': request})
        return Response(ser.data)

    # ── Mark as read ──────────────────────────────────────────────────────

    @action(detail=True, methods=['post'], url_path='mark_read')
    def mark_read(self, request, pk=None):
        conversation = self._get_conversation_or_403(pk)
        if isinstance(conversation, Response):
            return conversation

        ConversationParticipant.objects.filter(
            conversation=conversation,
            user=request.user,
        ).update(last_read_at=timezone.now())

        return Response({'detail': 'Marked as read.'})

    # ── Contacts (messageable colleagues) ────────────────────────────────

    @action(detail=False, methods=['get'])
    def contacts(self, request):
        """
        Return all ACTIVE Staff / Practitioners / Admins in the same clinic,
        excluding the requesting user.
        """
        if not request.user.clinic:
            return Response([])

        users = (
            User.objects
            .filter(
                clinic=request.user.clinic,
                is_active=True,
                is_deleted=False,
                role__in=ALLOWED_ROLES,
            )
            .exclude(pk=request.user.pk)
            .order_by('first_name', 'last_name')
        )

        from .serializers import ParticipantSerializer
        return Response(
            ParticipantSerializer(users, many=True, context={'request': request}).data
        )

    # ── Total unread badge count ──────────────────────────────────────────

    @action(detail=False, methods=['get'], url_path='unread_count')
    def unread_count(self, request):
        total = 0
        for conv in self._base_qs():
            try:
                membership = conv.memberships.get(user=request.user)
                if membership.last_read_at is None:
                    total += conv.messages.filter(is_deleted=False).exclude(
                        sender=request.user
                    ).count()
                else:
                    total += conv.messages.filter(
                        is_deleted=False,
                        created_at__gt=membership.last_read_at,
                    ).exclude(sender=request.user).count()
            except ConversationParticipant.DoesNotExist:
                pass
        return Response({'unread_count': total})

    # ── Helper ────────────────────────────────────────────────────────────

    def _get_conversation_or_403(self, pk):
        try:
            conversation = (
                Conversation.objects
                .filter(memberships__user=self.request.user, is_deleted=False)
                .distinct()
                .get(pk=pk)
            )
            return conversation
        except Conversation.DoesNotExist:
            return Response(
                {'detail': 'Conversation not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )