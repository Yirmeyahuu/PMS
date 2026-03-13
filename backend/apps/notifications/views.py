from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from .models import Notification, NotificationRead, EmailLog, SMSLog
from .serializers import NotificationSerializer, EmailLogSerializer, SMSLogSerializer


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Clinic-wide notifications for the authenticated user.

    All users in the same clinic see the SAME notifications.
    Read/unread status is tracked per-user via NotificationRead.

    GET  /notifications/                    — list (paginated, newest first)
    GET  /notifications/{id}/               — detail
    POST /notifications/{id}/mark_read/     — mark one as read
    POST /notifications/mark_all_read/      — mark all as read
    GET  /notifications/unread_count/       — { unread_count: N }
    """

    serializer_class   = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields   = ['notification_type']
    ordering_fields    = ['created_at']
    ordering           = ['-created_at']

    def get_queryset(self):
        """
        Return all notifications for the user's main clinic.
        New users automatically see every historical notification.
        """
        user = self.request.user
        if not user.clinic:
            return Notification.objects.none()

        # Resolve to main clinic
        main_clinic = user.clinic.main_clinic

        qs = (
            Notification.objects
            .filter(clinic=main_clinic)
            .select_related('appointment', 'clinic_branch')
        )

        # Optional filter: ?is_read=true / ?is_read=false
        is_read_param = self.request.query_params.get('is_read')
        if is_read_param is not None:
            read_ids = NotificationRead.objects.filter(
                user=user
            ).values_list('notification_id', flat=True)

            if is_read_param.lower() in ('true', '1'):
                qs = qs.filter(id__in=read_ids)
            else:
                qs = qs.exclude(id__in=read_ids)

        return qs

    # ── Mark one read ─────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'], url_path='mark_read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        NotificationRead.objects.get_or_create(
            notification=notification,
            user=request.user,
        )
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    # ── Mark all read ─────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'], url_path='mark_all_read')
    def mark_all_read(self, request):
        user = request.user
        if not user.clinic:
            return Response({'marked_read': 0})

        main_clinic = user.clinic.main_clinic

        # Get all notification IDs for this clinic that the user hasn't read yet
        all_notif_ids = set(
            Notification.objects.filter(clinic=main_clinic)
            .values_list('id', flat=True)
        )
        already_read_ids = set(
            NotificationRead.objects.filter(
                user=user,
                notification_id__in=all_notif_ids,
            ).values_list('notification_id', flat=True)
        )

        unread_ids = all_notif_ids - already_read_ids

        if unread_ids:
            reads = [
                NotificationRead(notification_id=nid, user=user)
                for nid in unread_ids
            ]
            NotificationRead.objects.bulk_create(reads, ignore_conflicts=True)

        return Response({'marked_read': len(unread_ids)})

    # ── Unread count ──────────────────────────────────────────────────────────
    @action(detail=False, methods=['get'], url_path='unread_count')
    def unread_count(self, request):
        user = request.user
        if not user.clinic:
            return Response({'unread_count': 0})

        main_clinic = user.clinic.main_clinic

        total = Notification.objects.filter(clinic=main_clinic).count()
        read  = NotificationRead.objects.filter(
            user=user,
            notification__clinic=main_clinic,
        ).count()

        return Response({'unread_count': max(0, total - read)})


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