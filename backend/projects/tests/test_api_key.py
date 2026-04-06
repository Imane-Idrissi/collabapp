import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from projects.encryption import decrypt_api_key
from projects.models import Column, Project, ProjectMember


@pytest.mark.django_db
class TestAPIKeyView:

    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='imane@example.com',
            name='Imane',
            password='StrongPass1',
        )
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.project = Project.objects.create(name='Test', creator=self.user)
        ProjectMember.objects.create(project=self.project, user=self.user)
        for name, pos in [('To Do', 0), ('In Progress', 1), ('Done', 2)]:
            Column.objects.create(project=self.project, name=name, position=pos)
        self.url = f'/api/projects/{self.project.id}/api-key'

    # --- Authentication ---

    def test_put_without_auth_returns_401(self):
        client = APIClient()
        response = client.put(self.url, {'api_key': 'test-key'})
        assert response.status_code == 401

    def test_delete_without_auth_returns_401(self):
        client = APIClient()
        response = client.delete(self.url)
        assert response.status_code == 401

    # --- Membership ---

    def test_put_non_member_returns_403(self):
        other = User.objects.create_user(email='other@example.com', name='Other', password='StrongPass1')
        token = str(RefreshToken.for_user(other).access_token)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.put(self.url, {'api_key': 'test-key'})
        assert response.status_code == 403

    # --- Creator only ---

    def test_put_non_creator_member_returns_403(self):
        other = User.objects.create_user(email='member@example.com', name='Member', password='StrongPass1')
        ProjectMember.objects.create(project=self.project, user=other)
        token = str(RefreshToken.for_user(other).access_token)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.put(self.url, {'api_key': 'test-key'})
        assert response.status_code == 403

    def test_delete_non_creator_member_returns_403(self):
        other = User.objects.create_user(email='member@example.com', name='Member', password='StrongPass1')
        ProjectMember.objects.create(project=self.project, user=other)
        token = str(RefreshToken.for_user(other).access_token)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.delete(self.url)
        assert response.status_code == 403

    # --- Validation ---

    def test_put_empty_key_returns_400(self):
        response = self.client.put(self.url, {'api_key': ''})
        assert response.status_code == 400
        assert 'api_key' in response.data

    def test_put_missing_key_returns_400(self):
        response = self.client.put(self.url, {})
        assert response.status_code == 400

    # --- Set key ---

    def test_put_valid_key_stores_encrypted(self):
        response = self.client.put(self.url, {'api_key': 'AIzaSyD-real-key-123'})
        assert response.status_code == 200
        assert response.data['has_key'] is True
        assert response.data['masked_key'] == '····-123'
        self.project.refresh_from_db()
        assert self.project.encrypted_gemini_key != ''
        assert decrypt_api_key(self.project.encrypted_gemini_key) == 'AIzaSyD-real-key-123'

    def test_put_replaces_existing_key(self):
        self.client.put(self.url, {'api_key': 'old-key-1234'})
        self.client.put(self.url, {'api_key': 'new-key-5678'})
        self.project.refresh_from_db()
        assert decrypt_api_key(self.project.encrypted_gemini_key) == 'new-key-5678'

    # --- Delete key ---

    def test_delete_clears_key(self):
        self.client.put(self.url, {'api_key': 'AIzaSyD-real-key-123'})
        response = self.client.delete(self.url)
        assert response.status_code == 204
        self.project.refresh_from_db()
        assert self.project.encrypted_gemini_key == ''

    # --- Masking ---

    def test_masked_key_shows_last_four_chars(self):
        response = self.client.put(self.url, {'api_key': 'AIzaSyD-test-key-ABCD'})
        assert response.data['masked_key'] == '····ABCD'

    def test_masked_key_short_key(self):
        response = self.client.put(self.url, {'api_key': 'abc'})
        assert response.data['masked_key'] == '····'


@pytest.mark.django_db
class TestBoardViewAPIKey:

    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='imane@example.com',
            name='Imane',
            password='StrongPass1',
        )
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        self.project = Project.objects.create(name='Test', creator=self.user)
        ProjectMember.objects.create(project=self.project, user=self.user)
        Column.objects.create(project=self.project, name='To Do', position=0)
        self.board_url = f'/api/projects/{self.project.id}/board'

    def test_board_includes_api_key_fields_when_no_key(self, settings):
        settings.GEMINI_API_KEY = ''
        response = self.client.get(self.board_url)
        assert response.data['has_api_key'] is False
        assert response.data['masked_api_key'] == ''
        assert response.data['ai_enabled'] is False

    def test_board_ai_enabled_with_project_key(self, settings):
        settings.GEMINI_API_KEY = ''
        self.client.put(
            f'/api/projects/{self.project.id}/api-key',
            {'api_key': 'AIzaSyD-test-1234'},
        )
        response = self.client.get(self.board_url)
        assert response.data['ai_enabled'] is True
        assert response.data['has_api_key'] is True
        assert response.data['masked_api_key'] == '····1234'

    def test_board_ai_enabled_with_global_key(self, settings):
        settings.GEMINI_API_KEY = 'global-key'
        response = self.client.get(self.board_url)
        assert response.data['ai_enabled'] is True
        assert response.data['has_api_key'] is False
