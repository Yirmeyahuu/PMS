from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from .models import Notification, EmailLog, SMSLog
from .serializers import NotificationSerializer, EmailLogSerializer, SMSLogSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Notifications for the authenticated user.

    GET  /notifications/                    — list (paginated)
    GET  /notifications/{id}/               — detail
    POST /notifications/{id}/mark_read/     — mark one as read
    POST /notifications/mark_all_read/      — mark all as read
    GET  /notifications/unread_count/       — { unread_count: N }
    """

    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['notification_type', 'is_read']
    ordering_fields    = ['created_at']
    ordering           = ['-created_at']

    def get_queryset(self):
        return (
            Notification.objects
            .filter(user=self.request.user)
            .select_related('appointment', 'clinic_branch')
        )

    # ── Mark one read ─────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='mark_read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at'])
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    # ── Mark all read ─────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'], url_path='mark_all_read')
    def mark_all_read(self, request):
        updated = (
            self.get_queryset()
            .filter(is_read=False)
            .update(is_read=True, read_at=timezone.now())
        )
        return Response({'marked_read': updated})

    # ── Unread count ──────────────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='unread_count')
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})


# ── Admin-only log views ───────────────────────────────────────────────────────

class EmailLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = EmailLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['is_sent', 'recipient_email']
    ordering_fields    = ['created_at', 'sent_at']

    def get_queryset(self):
        if self.request.user.role == 'ADMIN':
            return EmailLog.objects.all()
        return EmailLog.objects.none()


class SMSLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = SMSLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['is_sent', 'provider']
    ordering_fields    = ['created_at', 'sent_at']

    def get_queryset(self):
        if self.request.user.role == 'ADMIN':
            return SMSLog.objects.all()
        return SMSLog.objects.none()