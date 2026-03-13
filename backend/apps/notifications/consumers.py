import json
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time notification push.

    Each authenticated user joins their own private group:
        notifications_<user_id>

    The notification service pushes to ALL users in a clinic
    by iterating their individual groups.
    """

    async def connect(self):
        self.user = self.scope.get('user', AnonymousUser())

        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        self.group_name = f'notifications_{self.user.id}'

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name,
        )
        await self.accept()

        logger.debug(
            '[WS:notifications] user %s connected to group %s',
            self.user.id, self.group_name,
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name,
            )
        logger.debug(
            '[WS:notifications] user %s disconnected (code=%s)',
            getattr(self.user, 'id', '?'), close_code,
        )

    async def receive_json(self, content, **kwargs):
        """Handle incoming messages — currently just keepalive pings."""
        msg_type = content.get('type', '')

        if msg_type == 'ping':
            await self.send_json({'type': 'pong'})

    # ── Handler for notification.new events ───────────────────────────────────
    async def notification_new(self, event):
        """Called by channel layer group_send when a new notification is created."""
        await self.send_json({
            'type': 'notification.new',
            'notification': event['notification'],
        })