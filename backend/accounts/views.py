import logging
import random
import uuid
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User, EmailVerifyToken, PasswordResetToken
from accounts.serializers import ForgotPasswordSerializer, LoginSerializer, ResetPasswordSerializer, SignupSerializer
from accounts.utils import send_password_reset_email, send_verification_email

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


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        try:
            user = User.objects.get(email=data['email'])
        except User.DoesNotExist:
            return Response(
                {'detail': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(data['password']):
            return Response(
                {'detail': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token = str(RefreshToken.for_user(user).access_token)

        return Response({
            'token': token,
            'user': {
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'email_verified': user.email_verified,
                'avatar_color': user.avatar_color,
            },
        }, status=status.HTTP_200_OK)


class VerifyEmailView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        token_str = request.query_params.get('token')
        if not token_str:
            return Response(
                {'detail': 'Token is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = EmailVerifyToken.objects.get(token=token_str)
        except EmailVerifyToken.DoesNotExist:
            return Response(
                {'detail': 'Invalid token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if token.expires_at < timezone.now():
            return Response(
                {'detail': 'Token has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = token.user
        user.email_verified = True
        user.save()
        token.delete()

        return Response(
            {'message': 'Email verified successfully.'},
            status=status.HTTP_200_OK,
        )


RESET_MESSAGE = 'A password reset link has been sent to your inbox.'
VERIFY_MESSAGE = "We've sent a verification email to your inbox. Please verify your email, then request a password reset again."


class ForgotPasswordView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'message': RESET_MESSAGE},
                status=status.HTTP_200_OK,
            )

        if user.email_verified:
            token = PasswordResetToken.objects.create(
                user=user,
                token=uuid.uuid4().hex,
                expires_at=timezone.now() + timedelta(hours=1),
            )
            try:
                send_password_reset_email(user, token.token)
            except Exception:
                logger.exception("Failed to send password reset email")
            return Response(
                {'message': RESET_MESSAGE},
                status=status.HTTP_200_OK,
            )
        else:
            token = EmailVerifyToken.objects.create(
                user=user,
                token=uuid.uuid4().hex,
                expires_at=timezone.now() + timedelta(hours=24),
            )
            try:
                send_verification_email(user, token.token)
            except Exception:
                logger.exception("Failed to send verification email")
            return Response(
                {'message': VERIFY_MESSAGE},
                status=status.HTTP_200_OK,
            )


class ResetPasswordView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        try:
            token = PasswordResetToken.objects.get(token=data['token'])
        except PasswordResetToken.DoesNotExist:
            return Response(
                {'detail': 'Invalid token.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if token.expires_at < timezone.now():
            return Response(
                {'detail': 'Token has expired.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if token.used:
            return Response(
                {'detail': 'Token has already been used.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = token.user
        user.set_password(data['password'])
        user.save()

        token.used = True
        token.save()

        return Response(
            {'message': 'Password reset successfully.'},
            status=status.HTTP_200_OK,
        )
