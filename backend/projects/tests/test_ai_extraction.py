import pytest
from unittest.mock import patch, MagicMock
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from chat.models import Message
from projects.models import Column, Project, ProjectMember, Task

EXTRACTION_MARKER = '──────── Tasks extracted ────────'


def _auth_client(user):
    client = APIClient()
    token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


def _setup():
    user = User.objects.create_user(
        email='imane@example.com', name='Imane', password='StrongPass1',
    )
    project = Project.objects.create(name='Project', description='', creator=user)
    ProjectMember.objects.create(project=project, user=user)
    column = Column.objects.create(project=project, name='To Do', position=0)
    return user, project, column


GEMINI_RESPONSE = [
    {'name': 'Set up CI pipeline', 'description': 'Configure GitHub Actions', 'priority': 'high'},
    {'name': 'Write README', 'description': 'Add setup instructions', 'priority': 'low'},
]


@pytest.mark.django_db
class TestExtractTasks:

    @pytest.fixture(autouse=True)
    def _set_gemini_key(self, settings):
        settings.GEMINI_API_KEY = 'test-key'

    def setup_method(self):
        self.user, self.project, self.column = _setup()
        self.client = _auth_client(self.user)
        self.url = f'/api/projects/{self.project.id}/extract-tasks'

    def test_extract_without_auth_returns_401(self):
        client = APIClient()
        response = client.post(self.url)
        assert response.status_code == 401

    def test_extract_non_member_returns_403(self):
        other = User.objects.create_user(email='other@example.com', name='Other', password='StrongPass1')
        client = _auth_client(other)
        response = client.post(self.url)
        assert response.status_code == 403

    def test_extract_already_running_returns_409(self):
        self.project.extraction_running = True
        self.project.save()
        response = self.client.post(self.url)
        assert response.status_code == 409

    def test_extract_no_messages_returns_empty(self):
        response = self.client.post(self.url)
        assert response.status_code == 200
        assert response.data['suggestions'] == []
        self.project.refresh_from_db()
        assert self.project.extraction_running is False

    @patch('projects.views.call_gemini')
    def test_extract_success(self, mock_gemini):
        mock_gemini.return_value = GEMINI_RESPONSE
        Message.objects.create(project=self.project, sender=self.user, text='We need a CI pipeline')
        Message.objects.create(project=self.project, sender=self.user, text='Also write a README')

        response = self.client.post(self.url)
        assert response.status_code == 200
        assert len(response.data['suggestions']) == 2
        assert response.data['suggestions'][0]['name'] == 'Set up CI pipeline'

        # Extraction marker inserted
        marker = Message.objects.filter(project=self.project, text=EXTRACTION_MARKER).first()
        assert marker is not None

        # Flag reset
        self.project.refresh_from_db()
        assert self.project.extraction_running is False

    @patch('projects.views.call_gemini')
    def test_extract_failure_resets_flag(self, mock_gemini):
        mock_gemini.side_effect = Exception('Gemini API error')
        Message.objects.create(project=self.project, sender=self.user, text='Something')

        response = self.client.post(self.url)
        assert response.status_code == 500

        self.project.refresh_from_db()
        assert self.project.extraction_running is False

    @patch('projects.views.call_gemini')
    def test_extract_only_messages_after_last_marker(self, mock_gemini):
        mock_gemini.return_value = [{'name': 'New task', 'description': '', 'priority': ''}]
        Message.objects.create(project=self.project, sender=self.user, text='Old message')
        Message.objects.create(project=self.project, sender=self.user, text=EXTRACTION_MARKER)
        Message.objects.create(project=self.project, sender=self.user, text='New message after marker')

        response = self.client.post(self.url)
        assert response.status_code == 200

        # Gemini was called with only the new message
        call_args = mock_gemini.call_args[0][0]
        texts = [m['text'] for m in call_args]
        assert 'New message after marker' in texts
        assert 'Old message' not in texts


@pytest.mark.django_db
class TestBatchCreateTasks:

    def setup_method(self):
        self.user, self.project, self.column = _setup()
        self.client = _auth_client(self.user)
        self.url = f'/api/projects/{self.project.id}/tasks/batch'

    def test_batch_without_auth_returns_401(self):
        client = APIClient()
        response = client.post(self.url, {}, format='json')
        assert response.status_code == 401

    def test_batch_non_member_returns_403(self):
        other = User.objects.create_user(email='other@example.com', name='Other', password='StrongPass1')
        client = _auth_client(other)
        response = client.post(self.url, {'tasks': []}, format='json')
        assert response.status_code == 403

    def test_batch_empty_tasks_returns_400(self):
        response = self.client.post(self.url, {'tasks': []}, format='json')
        assert response.status_code == 400

    def test_batch_invalid_column_returns_400(self):
        response = self.client.post(self.url, {
            'tasks': [{'name': 'Task', 'description': '', 'priority': '', 'column_id': 99999}],
        }, format='json')
        assert response.status_code == 400

    def test_batch_success(self):
        response = self.client.post(self.url, {
            'tasks': [
                {'name': 'Task 1', 'description': 'Desc 1', 'priority': 'high', 'column_id': self.column.id},
                {'name': 'Task 2', 'description': 'Desc 2', 'priority': 'low', 'column_id': self.column.id},
            ],
        }, format='json')
        assert response.status_code == 201
        assert len(response.data['tasks']) == 2
        assert response.data['tasks'][0]['is_ai_generated'] is True
        assert response.data['tasks'][1]['is_ai_generated'] is True
        assert Task.objects.filter(project=self.project, is_ai_generated=True).count() == 2
