from http.cookies import SimpleCookie

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from accounts.models import User


@database_sync_to_async
def get_user_from_token(token_str):
    try:
        token = AccessToken(token_str)
        return User.objects.get(id=token['user_id'])
    except Exception:
        return AnonymousUser()


def _get_cookie_from_scope(scope, cookie_name):
    for header_name, header_value in scope.get('headers', []):
        if header_name == b'cookie':
            cookie = SimpleCookie(header_value.decode())
            if cookie_name in cookie:
                return cookie[cookie_name].value
    return None


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        token = _get_cookie_from_scope(scope, 'access_token')

        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)
