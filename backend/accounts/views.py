import logging
import random
import uuid
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User, EmailVerifyToken
from accounts.serializers import SignupSerializer
from accounts.utils import send_verification_email

logger = logging.getLogger(__name__)

AVATAR_COLORS = [
    '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
    '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#06b6d4',
]


def get_initials(name):
    parts = name.strip().split()
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    return parts[0][0].upper() if parts else '?'


def pick_avatar_color(name):
    initials = get_initials(name)
    used_colors = set(
        User.objects.filter(name__in=User.objects.values_list('name', flat=True))
        .values_list('avatar_color', flat=True)
    )
    # Filter to users with same initials
    same_initial_users = User.objects.all()
    used_colors = set()
    for user in same_initial_users:
        if get_initials(user.name) == initials:
            used_colors.add(user.avatar_color)
    available = [c for c in AVATAR_COLORS if c not in used_colors]
    if available:
        return random.choice(available)
    return random.choice(AVATAR_COLORS)


class SignupView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        avatar_color = pick_avatar_color(data['name'])

        user = User.objects.create_user(
            email=data['email'],
            name=data['name'],
            password=data['password'],
            avatar_color=avatar_color,
        )

        token = str(RefreshToken.for_user(user).access_token)

        verify_token = EmailVerifyToken.objects.create(
            user=user,
            token=uuid.uuid4().hex,
            expires_at=timezone.now() + timedelta(hours=24),
        )

        try:
            send_verification_email(user, verify_token.token)
        except Exception:
            logger.exception("Failed to send verification email")

        return Response({
            'token': token,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'email_verified': user.email_verified,
                'avatar_color': user.avatar_color,
            },
        }, status=status.HTTP_201_CREATED)
