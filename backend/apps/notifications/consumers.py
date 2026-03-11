"""
WebSocket consumer for real-time notifications.
Each authenticated user connects to their own private room:
  ws://host/ws/notifications/
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class NotificationConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        user = self.scope.get('user')

        # Reject unauthenticated connections
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        # Each user gets their own group: notifications_<user_id>
        self.group_name = f'notifications_{user.id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info('NotificationConsumer: user %s connected', user.id)

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            logger.info('NotificationConsumer: disconnected (group=%s)', self.group_name)

    # ── Receive message from WebSocket (client → server) ─────────────────────
    async def receive(self, text_data):
        """
        Clients can send { "type": "ping" } to keep the connection alive.
        """
        try:
            data = json.loads(text_data)
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
        except Exception:
            pass

    # ── Receive event from channel layer (server → client) ───────────────────
    async def notification_new(self, event):
        """
        Called when channel_layer.group_send(..., {'type': 'notification.new', ...})
        is invoked from notification_service.py.
        Forwards the notification payload to the WebSocket client.
        """
        await self.send(text_data=json.dumps({
            'type':         'notification.new',
            'notification': event['notification'],
        }))