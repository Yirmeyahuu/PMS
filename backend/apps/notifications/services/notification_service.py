"""
Core low-level service for creating Notification records.
After each create, pushes the notification to the user's WebSocket group.
"""
import logging
from asgiref.sync import async_to_sync
from django.utils import timezone
from apps.notifications.models import Notification

logger = logging.getLogger(__name__)


def _push_to_websocket(notification: Notification) -> None:
    """
    Send the new notification to the user's WebSocket channel group.
    Runs synchronously (called from signals/services).
    """
    try:
        from channels.layers import get_channel_layer
        from apps.notifications.serializers import NotificationSerializer

        channel_layer = get_channel_layer()
        if channel_layer is None:
            return

        payload = NotificationSerializer(notification).data

        async_to_sync(channel_layer.group_send)(
            f'notifications_{notification.user_id}',
            {
                'type':         'notification.new',   # maps to consumer.notification_new()
                'notification': payload,
            }
        )
    except Exception as exc:
        # Never let a push failure break the booking flow
        logger.exception('_push_to_websocket failed: %s', exc)


def create_notification(
    *,
    user,
    notification_type: str,
    title: str,
    message: str,
    link_url: str = '',
    appointment=None,
    clinic_branch=None,
) -> Notification:
    """
    Create a single Notification record and push it via WebSocket.
    """
    notification = Notification.objects.create(
        user=user,
        notification_type=notification_type,
        title=title,
        message=message,
        link_url=link_url,
        appointment=appointment,
        clinic_branch=clinic_branch,
    )
    _push_to_websocket(notification)
    return notification


def bulk_create_notifications(notifications: list[dict]) -> list[Notification]:
    """
    Bulk-create notifications and push each via WebSocket.
    """
    objs = [
        Notification(
            user=n['user'],
            notification_type=n['notification_type'],
            title=n['title'],
            message=n['message'],
            link_url=n.get('link_url', ''),
            appointment=n.get('appointment'),
            clinic_branch=n.get('clinic_branch'),
        )
        for n in notifications
    ]
    created = Notification.objects.bulk_create(objs)

    for notification in created:
        _push_to_websocket(notification)

    return created