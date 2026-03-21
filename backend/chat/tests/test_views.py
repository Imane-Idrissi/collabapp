import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from chat.models import Message
from projects.models import Project, ProjectMember


def _create_project(user, name):
    project = Project.objects.create(name=name, description='', creator=user)
    ProjectMember.objects.create(project=project, user=user)
    return project


@pytest.mark.django_db
class TestSendMessage:

    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='imane@example.com', name='Imane', password='StrongPass1',
        )
        self.project = _create_project(self.user, 'My Project')
        self.url = f'/api/projects/{self.project.id}/messages'
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_send_message_without_auth_returns_401(self):
        client = APIClient()
        response = client.post(self.url, {'text': 'Hello'})
        assert response.status_code == 401

    def test_send_message_non_member_returns_403(self):
        other = User.objects.create_user(email='other@example.com', name='Other', password='StrongPass1')
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(other).access_token}')
        response = client.post(self.url, {'text': 'Hello'})
        assert response.status_code == 403

    def test_send_message_project_not_found_returns_404(self):
        response = self.client.post('/api/projects/99999/messages', {'text': 'Hello'})
        assert response.status_code == 404

    def test_send_message_missing_text_returns_400(self):
        response = self.client.post(self.url, {})
        assert response.status_code == 400

    def test_send_message_empty_text_returns_400(self):
        response = self.client.post(self.url, {'text': ''})
        assert response.status_code == 400

    def test_send_message_success(self):
        response = self.client.post(self.url, {'text': 'Hello team!'})
        assert response.status_code == 201
        assert response.data['text'] == 'Hello team!'
        assert response.data['sender']['id'] == self.user.id
        assert response.data['sender']['name'] == 'Imane'
        assert 'id' in response.data
        assert 'created_at' in response.data

    def test_send_message_stores_in_db(self):
        self.client.post(self.url, {'text': 'Hello team!'})
        assert Message.objects.filter(project=self.project, sender=self.user, text='Hello team!').exists()


@pytest.mark.django_db
class TestLoadMessages:

    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='imane@example.com', name='Imane', password='StrongPass1',
        )
        self.project = _create_project(self.user, 'My Project')
        self.url = f'/api/projects/{self.project.id}/messages'
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_load_messages_without_auth_returns_401(self):
        client = APIClient()
        response = client.get(self.url)
        assert response.status_code == 401

    def test_load_messages_non_member_returns_403(self):
        other = User.objects.create_user(email='other@example.com', name='Other', password='StrongPass1')
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(other).access_token}')
        response = client.get(self.url)
        assert response.status_code == 403

    def test_load_messages_project_not_found_returns_404(self):
        response = self.client.get('/api/projects/99999/messages')
        assert response.status_code == 404

    def test_load_messages_empty_returns_empty_list(self):
        response = self.client.get(self.url)
        assert response.status_code == 200
        assert response.data['messages'] == []

    def test_load_messages_returns_messages(self):
        Message.objects.create(project=self.project, sender=self.user, text='First')
        Message.objects.create(project=self.project, sender=self.user, text='Second')
        response = self.client.get(self.url)
        assert len(response.data['messages']) == 2

    def test_load_messages_includes_sender_info(self):
        Message.objects.create(project=self.project, sender=self.user, text='Hello')
        response = self.client.get(self.url)
        msg = response.data['messages'][0]
        assert msg['sender']['id'] == self.user.id
        assert msg['sender']['name'] == 'Imane'
        assert 'avatar_color' in msg['sender']

    def test_load_messages_ordered_oldest_first(self):
        Message.objects.create(project=self.project, sender=self.user, text='First')
        Message.objects.create(project=self.project, sender=self.user, text='Second')
        response = self.client.get(self.url)
        texts = [m['text'] for m in response.data['messages']]
        assert texts == ['First', 'Second']

    def test_load_messages_respects_limit(self):
        for i in range(5):
            Message.objects.create(project=self.project, sender=self.user, text=f'Msg {i}')
        response = self.client.get(self.url, {'limit': 3})
        assert len(response.data['messages']) == 3

    def test_load_messages_cursor_pagination(self):
        msgs = []
        for i in range(5):
            msgs.append(Message.objects.create(project=self.project, sender=self.user, text=f'Msg {i}'))
        # Get messages before the last one (cursor)
        response = self.client.get(self.url, {'before': msgs[4].id, 'limit': 2})
        assert len(response.data['messages']) == 2
        texts = [m['text'] for m in response.data['messages']]
        assert texts == ['Msg 2', 'Msg 3']

    def test_load_messages_cursor_returns_empty_when_no_more(self):
        msg = Message.objects.create(project=self.project, sender=self.user, text='Only')
        response = self.client.get(self.url, {'before': msg.id})
        assert response.data['messages'] == []
