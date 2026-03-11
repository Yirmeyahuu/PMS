from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
import logging

logger = logging.getLogger(__name__)


@database_sync_to_async
def get_user_from_token(token_key):
    """Validate JWT access token and return the user."""
    from rest_framework_simplejwt.tokens import AccessToken
    from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
    from apps.accounts.models import User

    try:
        token = AccessToken(token_key)
        user  = User.objects.get(pk=token['user_id'], is_active=True, is_deleted=False)
        return user
    except (TokenError, InvalidToken, User.DoesNotExist, KeyError) as e:
        logger.warning(f'WS JWT auth failed: {e}')
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Reads JWT from query-string: ws://host/ws/messages/1/?token=<access_token>
    Populates scope['user'] for consumers.
    """

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode()
        params       = parse_qs(query_string)
        token_list   = params.get('token', [])

        if token_list:
            scope['user'] = await get_user_from_token(token_list[0])
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)