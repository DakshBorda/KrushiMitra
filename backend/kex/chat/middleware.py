"""
Custom JWT authentication middleware for Django Channels WebSocket connections.

The React frontend uses JWT tokens (not Django sessions), so the default
AuthMiddlewareStack cannot authenticate WebSocket connections.

This middleware reads the JWT token from the WebSocket query string:
    ws://host/ws/chat/1/?token=<access-token>
"""
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from kex.users.models import User
from urllib.parse import parse_qs


@database_sync_to_async
def get_user_from_token(token_str):
    """Validate JWT access token and return the corresponding user."""
    try:
        token = AccessToken(token_str)
        user_id = token["user_id"]
        return User.objects.get(id=user_id)
    except (TokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Extract JWT token from WebSocket query string and set scope["user"].
    Usage: ws://host/ws/chat/1/?token=<jwt-access-token>
    """

    async def __call__(self, scope, receive, send):
        # Parse query string for token
        query_string = scope.get("query_string", b"").decode("utf-8")
        query_params = parse_qs(query_string)
        token_list = query_params.get("token", [])

        if token_list:
            scope["user"] = await get_user_from_token(token_list[0])
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
