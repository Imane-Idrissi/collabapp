import html
import logging

import resend
from django.conf import settings

logger = logging.getLogger(__name__)


def _send_email(to, subject, html):
    resend.api_key = settings.RESEND_API_KEY
    resend.Emails.send({
        'from': f'CollabApp <{settings.RESEND_FROM_EMAIL}>',
        'to': [to],
        'subject': subject,
        'html': html,
    })


def send_verification_email(user, token):
    verify_url = f'{settings.FRONTEND_URL}/verify-email?token={token}'
    safe_name = html.escape(user.name)
    body = (
        f'<p>Hi {safe_name},</p>'
        f'<p>Click the link below to verify your email:</p>'
        f'<p><a href="{verify_url}">Verify my email</a></p>'
        f'<p>This link expires in 24 hours.</p>'
    )
    _send_email(user.email, 'Verify your email — CollabApp', body)
    logger.info(f"Verification email sent to {user.email}")


def send_password_reset_email(user, token):
    reset_url = f'{settings.FRONTEND_URL}/reset-password?token={token}'
    safe_name = html.escape(user.name)
    body = (
        f'<p>Hi {safe_name},</p>'
        f'<p>Click the link below to reset your password:</p>'
        f'<p><a href="{reset_url}">Reset my password</a></p>'
        f'<p>This link expires in 1 hour.</p>'
    )
    _send_email(user.email, 'Reset your password — CollabApp', body)
    logger.info(f"Password reset email sent to {user.email}")
