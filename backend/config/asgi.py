import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import re_path, path

print(">>> ASGI: loading websocket routes...")  # ← debug

from apps.notifications.middleware import JWTAuthMiddlewareStack as NotificationsJWTMiddleware
from apps.notifications.consumers import NotificationConsumer

from apps.messages.middleware import JWTAuthMiddlewareStack as MessagesJWTMiddleware
from apps.messages.consumers import ChatConsumer, PresenceConsumer

all_websocket_patterns = [
    path('ws/notifications/', NotificationConsumer.as_asgi()),
    re_path(r'^ws/messages/(?P<conversation_id>\d+)/$', ChatConsumer.as_asgi()),
    re_path(r'^ws/presence/$', PresenceConsumer.as_asgi()),
]

print(f">>> ASGI: registered {len(all_websocket_patterns)} websocket routes")  # ← debug

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': NotificationsJWTMiddleware(
        MessagesJWTMiddleware(
            URLRouter(all_websocket_patterns)
        )
    ),
})

print(">>> ASGI: application ready")  # ← debug