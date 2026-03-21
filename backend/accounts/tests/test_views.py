import pytest
from datetime import timedelta
from unittest.mock import patch
from django.utils import timezone
from rest_framework.test import APIClient
from accounts.models import User, EmailVerifyToken, PasswordResetToken

SIGNUP_URL = '/api/auth/signup'


@pytest.mark.django_db
class TestSignup:

    def setup_method(self):
        self.client = APIClient()
        self.url = '/api/auth/signup'
        self.valid_data = {
            'name': 'Imane',
            'email': 'imane@example.com',
            'password': 'StrongPass1',
            'confirm_password': 'StrongPass1',
        }

    # --- Step 2: Validate fields ---

    def test_signup_with_valid_data_returns_201_and_token(self):
        response = self.client.post(self.url, self.valid_data)
        assert response.status_code == 201
        assert 'token' in response.data
        assert response.data['user']['name'] == 'Imane'
        assert response.data['user']['email'] == 'imane@example.com'
        assert response.data['user']['email_verified'] is False
        assert 'avatar_color' in response.data['user']
        assert 'id' in response.data['user']

    def test_signup_with_empty_name_returns_400(self):
        data = {**self.valid_data, 'name': ''}
        response = self.client.post(self.url, data)
        assert response.status_code == 400
        assert 'name' in response.data

    def test_signup_with_missing_name_returns_400(self):
        data = {
            'email': 'imane@example.com',
            'password': 'StrongPass1',
            'confirm_password': 'StrongPass1',
        }
        response = self.client.post(self.url, data)
        assert response.status_code == 400
        assert 'name' in response.data

    def test_signup_with_missing_email_returns_400(self):
        data = {
            'name': 'Imane',
            'password': 'StrongPass1',
            'confirm_password': 'StrongPass1',
        }
        response = self.client.post(self.url, data)
        assert response.status_code == 400
        assert 'email' in response.data

    def test_signup_with_missing_password_returns_400(self):
        data = {
            'name': 'Imane',
            'email': 'imane@example.com',
            'confirm_password': 'StrongPass1',
        }
        response = self.client.post(self.url, data)
        assert response.status_code == 400
        assert 'password' in response.data

    def test_signup_with_missing_confirm_password_returns_400(self):
        data = {
            'name': 'Imane',
            'email': 'imane@example.com',
            'password': 'StrongPass1',
        }
        response = self.client.post(self.url, data)
        assert response.status_code == 400
        assert 'confirm_password' in response.data

    def test_signup_with_mismatched_passwords_returns_400(self):
        data = {**self.valid_data, 'confirm_password': 'DifferentPass1'}
        response = self.client.post(self.url, data)
        assert response.status_code == 400
        assert 'confirm_password' in response.data

    def test_signup_with_invalid_email_format_returns_400(self):
        data = {**self.valid_data, 'email': 'not-an-email'}
        response = self.client.post(self.url, data)
        assert response.status_code == 400
        assert 'email' in response.data

    def test_signup_with_duplicate_email_returns_400(self):
        self.client.post(self.url, self.valid_data)
        data = {**self.valid_data, 'name': 'Someone Else', 'email': 'imane@example.com'}
        response = self.client.post(self.url, data)
        assert response.status_code == 400
        assert 'email' in response.data

    def test_signup_with_short_password_returns_400(self):
        data = {**self.valid_data, 'password': 'Ab1'}
        response = self.client.post(self.url, data)
        assert response.status_code == 400
        assert 'password' in response.data

    def test_signup_with_password_missing_letter_returns_400(self):
        data = {**self.valid_data, 'password': '12345678'}
        response = self.client.post(self.url, data)
        assert response.status_code == 400
        assert 'password' in response.data

    def test_signup_with_password_missing_number_returns_400(self):
        data = {**self.valid_data, 'password': 'abcdefgh'}
        response = self.client.post(self.url, data)
        assert response.status_code == 400
        assert 'password' in response.data

    # --- Step 3: Create user ---

    def test_signup_creates_user_with_hashed_password(self):
        self.client.post(self.url, self.valid_data)
        user = User.objects.get(email='imane@example.com')
        assert user.name == 'Imane'
        assert user.email_verified is False
        assert user.password != 'StrongPass1'  # password is hashed
        assert user.check_password('StrongPass1')

    def test_signup_assigns_unique_avatar_color_for_same_initials(self):
        self.client.post(self.url, self.valid_data)
        data = {
            'name': 'Ibrahim Issa',
            'email': 'ibrahim@example.com',
            'password': 'StrongPass1',
            'confirm_password': 'StrongPass1',
        }
        self.client.post(self.url, data)
        user1 = User.objects.get(email='imane@example.com')
        user2 = User.objects.get(email='ibrahim@example.com')
        # Both have initials "I I" but different colors
        assert user1.avatar_color != user2.avatar_color

    # --- Step 5: Send verification email ---

    @patch('accounts.views.send_verification_email')
    def test_signup_creates_email_verify_token(self, mock_send):
        self.client.post(self.url, self.valid_data)
        user = User.objects.get(email='imane@example.com')
        token = EmailVerifyToken.objects.get(user=user)
        assert token.token is not None
        assert token.expires_at is not None

    @patch('accounts.views.send_verification_email')
    def test_signup_calls_send_verification_email(self, mock_send):
        self.client.post(self.url, self.valid_data)
        mock_send.assert_called_once()

    @patch('accounts.views.send_verification_email', side_effect=Exception('Email failed'))
    def test_signup_succeeds_even_if_email_fails(self, mock_send):
        response = self.client.post(self.url, self.valid_data)
        assert response.status_code == 201

    # --- Step 6: Return response ---

    def test_signup_response_contains_valid_jwt(self):
        response = self.client.post(self.url, self.valid_data)
        token = response.data['token']
        # Token should be a non-empty string with JWT format (3 dot-separated parts)
        assert isinstance(token, str)
        assert len(token.split('.')) == 3


@pytest.mark.django_db
class TestLogin:

    def setup_method(self):
        self.client = APIClient()
        self.url = '/api/auth/login'
        self.user = User.objects.create_user(
            email='imane@example.com',
            name='Imane',
            password='StrongPass1',
            avatar_color='#6366f1',
        )

    # --- Step 2: Validate fields ---

    def test_login_with_valid_credentials_returns_200_and_token(self):
        response = self.client.post(self.url, {
            'email': 'imane@example.com',
            'password': 'StrongPass1',
        })
        assert response.status_code == 200
        assert 'token' in response.data
        assert response.data['user']['id'] == self.user.id
        assert response.data['user']['name'] == 'Imane'
        assert response.data['user']['email'] == 'imane@example.com'
        assert 'email_verified' in response.data['user']
        assert response.data['user']['avatar_color'] == '#6366f1'

    def test_login_with_empty_email_returns_400(self):
        response = self.client.post(self.url, {
            'email': '',
            'password': 'StrongPass1',
        })
        assert response.status_code == 400
        assert 'email' in response.data

    def test_login_with_empty_password_returns_400(self):
        response = self.client.post(self.url, {
            'email': 'imane@example.com',
            'password': '',
        })
        assert response.status_code == 400
        assert 'password' in response.data

    def test_login_with_missing_email_returns_400(self):
        response = self.client.post(self.url, {
            'password': 'StrongPass1',
        })
        assert response.status_code == 400
        assert 'email' in response.data

    def test_login_with_missing_password_returns_400(self):
        response = self.client.post(self.url, {
            'email': 'imane@example.com',
        })
        assert response.status_code == 400
        assert 'password' in response.data

    # --- Step 3: Authenticate user ---

    def test_login_with_nonexistent_email_returns_401(self):
        response = self.client.post(self.url, {
            'email': 'nobody@example.com',
            'password': 'StrongPass1',
        })
        assert response.status_code == 401
        assert 'Invalid email or password' in str(response.data)

    def test_login_with_wrong_password_returns_401(self):
        response = self.client.post(self.url, {
            'email': 'imane@example.com',
            'password': 'WrongPassword1',
        })
        assert response.status_code == 401
        assert 'Invalid email or password' in str(response.data)

    def test_login_error_does_not_reveal_whether_email_exists(self):
        response_no_email = self.client.post(self.url, {
            'email': 'nobody@example.com',
            'password': 'StrongPass1',
        })
        response_wrong_pass = self.client.post(self.url, {
            'email': 'imane@example.com',
            'password': 'WrongPassword1',
        })
        # Same status and same error message for both
        assert response_no_email.status_code == response_wrong_pass.status_code
        assert response_no_email.data == response_wrong_pass.data

    # --- Step 5: Return response ---

    def test_login_response_contains_valid_jwt(self):
        response = self.client.post(self.url, {
            'email': 'imane@example.com',
            'password': 'StrongPass1',
        })
        token = response.data['token']
        assert isinstance(token, str)
        assert len(token.split('.')) == 3


@pytest.mark.django_db
class TestVerifyEmail:

    def setup_method(self):
        self.client = APIClient()
        self.url = '/api/auth/verify-email'
        self.user = User.objects.create_user(
            email='imane@example.com',
            name='Imane',
            password='StrongPass1',
        )
        self.token = EmailVerifyToken.objects.create(
            user=self.user,
            token='abc123',
            expires_at=timezone.now() + timedelta(hours=24),
        )

    # --- Step 2: Validate token ---

    def test_verify_email_with_valid_token_returns_200(self):
        response = self.client.get(self.url, {'token': 'abc123'})
        assert response.status_code == 200
        assert 'Email verified' in str(response.data['message'])

    def test_verify_email_with_missing_token_returns_400(self):
        response = self.client.get(self.url)
        assert response.status_code == 400

    def test_verify_email_with_invalid_token_returns_400(self):
        response = self.client.get(self.url, {'token': 'nonexistent'})
        assert response.status_code == 400

    def test_verify_email_with_expired_token_returns_400(self):
        self.token.expires_at = timezone.now() - timedelta(hours=1)
        self.token.save()
        response = self.client.get(self.url, {'token': 'abc123'})
        assert response.status_code == 400

    # --- Step 3: Verify user ---

    def test_verify_email_sets_user_email_verified_true(self):
        self.client.get(self.url, {'token': 'abc123'})
        self.user.refresh_from_db()
        assert self.user.email_verified is True

    def test_verify_email_deletes_token_after_use(self):
        self.client.get(self.url, {'token': 'abc123'})
        assert EmailVerifyToken.objects.filter(token='abc123').count() == 0

    # --- Step 4: Return response ---

    def test_verify_email_with_already_used_token_returns_400(self):
        self.client.get(self.url, {'token': 'abc123'})
        response = self.client.get(self.url, {'token': 'abc123'})
        assert response.status_code == 400


@pytest.mark.django_db
class TestForgotPassword:

    def setup_method(self):
        self.client = APIClient()
        self.url = '/api/auth/forgot-password'
        self.verified_user = User.objects.create_user(
            email='verified@example.com',
            name='Verified',
            password='StrongPass1',
            email_verified=True,
        )
        self.unverified_user = User.objects.create_user(
            email='unverified@example.com',
            name='Unverified',
            password='StrongPass1',
            email_verified=False,
        )

    # --- Step 2: Validate fields ---

    def test_forgot_password_with_missing_email_returns_400(self):
        response = self.client.post(self.url, {})
        assert response.status_code == 400

    def test_forgot_password_with_empty_email_returns_400(self):
        response = self.client.post(self.url, {'email': ''})
        assert response.status_code == 400

    # --- Step 3: Look up user ---

    @patch('accounts.views.send_verification_email')
    @patch('accounts.views.send_password_reset_email')
    def test_forgot_password_with_nonexistent_email_returns_200(self, mock_reset, mock_verify):
        response = self.client.post(self.url, {'email': 'nobody@example.com'})
        assert response.status_code == 200
        assert 'password reset link' in response.data['message'].lower()

    # --- Step 4: Verified user ---

    @patch('accounts.views.send_password_reset_email')
    def test_forgot_password_verified_user_creates_reset_token(self, mock_send):
        self.client.post(self.url, {'email': 'verified@example.com'})
        assert PasswordResetToken.objects.filter(user=self.verified_user).count() == 1

    @patch('accounts.views.send_password_reset_email')
    def test_forgot_password_verified_user_sends_reset_email(self, mock_send):
        self.client.post(self.url, {'email': 'verified@example.com'})
        mock_send.assert_called_once()

    @patch('accounts.views.send_password_reset_email')
    def test_forgot_password_verified_user_returns_reset_message(self, mock_send):
        response = self.client.post(self.url, {'email': 'verified@example.com'})
        assert response.status_code == 200
        assert 'password reset link' in response.data['message'].lower()

    @patch('accounts.views.send_password_reset_email')
    def test_forgot_password_reset_token_expires_in_one_hour(self, mock_send):
        self.client.post(self.url, {'email': 'verified@example.com'})
        token = PasswordResetToken.objects.get(user=self.verified_user)
        expected = timezone.now() + timedelta(hours=1)
        assert abs((token.expires_at - expected).total_seconds()) < 5

    # --- Step 4: Unverified user ---

    @patch('accounts.views.send_verification_email')
    def test_forgot_password_unverified_user_creates_verify_token(self, mock_send):
        self.client.post(self.url, {'email': 'unverified@example.com'})
        assert EmailVerifyToken.objects.filter(user=self.unverified_user).count() == 1

    @patch('accounts.views.send_verification_email')
    def test_forgot_password_unverified_user_sends_verification_email(self, mock_send):
        self.client.post(self.url, {'email': 'unverified@example.com'})
        mock_send.assert_called_once()

    @patch('accounts.views.send_verification_email')
    def test_forgot_password_unverified_user_returns_verify_message(self, mock_send):
        response = self.client.post(self.url, {'email': 'unverified@example.com'})
        assert response.status_code == 200
        assert 'verification email' in response.data['message'].lower()

    # --- Step 5: Security ---

    @patch('accounts.views.send_password_reset_email')
    def test_forgot_password_response_does_not_reveal_email_existence(self, mock_send):
        response_nonexistent = self.client.post(self.url, {'email': 'nobody@example.com'})
        response_verified = self.client.post(self.url, {'email': 'verified@example.com'})
        assert response_nonexistent.status_code == response_verified.status_code
        assert response_nonexistent.data['message'] == response_verified.data['message']


@pytest.mark.django_db
class TestResetPassword:

    def setup_method(self):
        self.client = APIClient()
        self.url = '/api/auth/reset-password'
        self.user = User.objects.create_user(
            email='imane@example.com',
            name='Imane',
            password='OldPass123',
        )
        self.token = PasswordResetToken.objects.create(
            user=self.user,
            token='resettoken123',
            expires_at=timezone.now() + timedelta(hours=1),
        )
        self.valid_data = {
            'token': 'resettoken123',
            'password': 'NewPass123',
            'confirm_password': 'NewPass123',
        }

    # --- Step 2: Validate fields ---

    def test_reset_password_with_missing_token_returns_400(self):
        data = {'password': 'NewPass123', 'confirm_password': 'NewPass123'}
        response = self.client.post(self.url, data)
        assert response.status_code == 400
        assert 'token' in response.data

    def test_reset_password_with_missing_password_returns_400(self):
        data = {'token': 'resettoken123', 'confirm_password': 'NewPass123'}
        response = self.client.post(self.url, data)
        assert response.status_code == 400
        assert 'password' in response.data

    def test_reset_password_with_missing_confirm_password_returns_400(self):
        data = {'token': 'resettoken123', 'password': 'NewPass123'}
        response = self.client.post(self.url, data)
        assert response.status_code == 400
        assert 'confirm_password' in response.data

    def test_reset_password_with_mismatched_passwords_returns_400(self):
        data = {**self.valid_data, 'confirm_password': 'Different1'}
        response = self.client.post(self.url, data)
        assert response.status_code == 400
        assert 'confirm_password' in response.data

    def test_reset_password_with_weak_password_returns_400(self):
        data = {**self.valid_data, 'password': 'abc', 'confirm_password': 'abc'}
        response = self.client.post(self.url, data)
        assert response.status_code == 400
        assert 'password' in response.data

    # --- Step 3: Validate token ---

    def test_reset_password_with_invalid_token_returns_400(self):
        data = {**self.valid_data, 'token': 'nonexistent'}
        response = self.client.post(self.url, data)
        assert response.status_code == 400

    def test_reset_password_with_expired_token_returns_400(self):
        self.token.expires_at = timezone.now() - timedelta(hours=1)
        self.token.save()
        response = self.client.post(self.url, self.valid_data)
        assert response.status_code == 400

    def test_reset_password_with_used_token_returns_400(self):
        self.token.used = True
        self.token.save()
        response = self.client.post(self.url, self.valid_data)
        assert response.status_code == 400

    # --- Step 4: Reset password ---

    def test_reset_password_changes_user_password(self):
        self.client.post(self.url, self.valid_data)
        self.user.refresh_from_db()
        assert not self.user.check_password('OldPass123')
        assert self.user.check_password('NewPass123')

    def test_reset_password_marks_token_as_used(self):
        self.client.post(self.url, self.valid_data)
        self.token.refresh_from_db()
        assert self.token.used is True

    # --- Step 5: Return response ---

    def test_reset_password_with_valid_data_returns_200(self):
        response = self.client.post(self.url, self.valid_data)
        assert response.status_code == 200
        assert 'Password reset successfully' in response.data['message']
