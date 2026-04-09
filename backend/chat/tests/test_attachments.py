import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from chat.models import Attachment, Message
from projects.models import Project, ProjectMember


def _create_project(user, name):
    project = Project.objects.create(name=name, description='', creator=user)
    ProjectMember.objects.create(project=project, user=user)
    return project


def _auth_client(user):
    client = APIClient()
    token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


@pytest.mark.django_db
class TestFileUpload:

    def setup_method(self):
        self.user = User.objects.create_user(
            email='imane@example.com', name='Imane', password='StrongPass1',
        )
        self.project = _create_project(self.user, 'Project')
        self.url = f'/api/projects/{self.project.id}/upload'
        self.client = _auth_client(self.user)

    def _make_file(self, name='test.png', content=b'fake-png-data', content_type='image/png'):
        return SimpleUploadedFile(name, content, content_type=content_type)

    def test_upload_without_auth_returns_401(self):
        client = APIClient()
        response = client.post(self.url, {'file': self._make_file()}, format='multipart')
        assert response.status_code == 401

    def test_upload_non_member_returns_403(self):
        other = User.objects.create_user(email='other@example.com', name='Other', password='StrongPass1')
        client = _auth_client(other)
        response = client.post(self.url, {'file': self._make_file()}, format='multipart')
        assert response.status_code == 403

    def test_upload_missing_file_returns_400(self):
        response = self.client.post(self.url, {}, format='multipart')
        assert response.status_code == 400

    def test_upload_file_too_large_returns_400(self):
        big_file = self._make_file(name='big.zip', content=b'x' * (10485760 + 1), content_type='application/zip')
        response = self.client.post(self.url, {'file': big_file}, format='multipart')
        assert response.status_code == 400

    def test_upload_success(self, tmp_path, settings):
        settings.MEDIA_ROOT = tmp_path
        response = self.client.post(self.url, {'file': self._make_file(name='photo.png')}, format='multipart')
        assert response.status_code == 200
        assert 'file_url' in response.data
        assert 'upload_url' not in response.data
        assert response.data['file_url'].startswith('/media/attachments/')
        assert response.data['file_url'].endswith('-photo.png')


@pytest.mark.django_db
class TestMessageWithAttachments:

    def setup_method(self):
        self.user = User.objects.create_user(
            email='imane@example.com', name='Imane', password='StrongPass1',
        )
        self.project = _create_project(self.user, 'Project')
        self.url = f'/api/projects/{self.project.id}/messages'
        self.client = _auth_client(self.user)

    def test_send_message_with_attachments_creates_records(self):
        response = self.client.post(self.url, {
            'text': 'Check this file',
            'attachments': [
                {'url': 'https://s3.example.com/file.pdf', 'name': 'file.pdf', 'size': 1024, 'type': 'application/pdf'},
            ],
        }, format='json')
        assert response.status_code == 201
        assert len(response.data['attachments']) == 1
        assert response.data['attachments'][0]['name'] == 'file.pdf'
        assert Attachment.objects.count() == 1

    def test_send_message_empty_text_with_attachments_succeeds(self):
        response = self.client.post(self.url, {
            'text': '',
            'attachments': [
                {'url': 'https://s3.example.com/img.png', 'name': 'img.png', 'size': 2048, 'type': 'image/png'},
            ],
        }, format='json')
        assert response.status_code == 201

    def test_send_message_empty_text_no_attachments_returns_400(self):
        response = self.client.post(self.url, {'text': ''}, format='json')
        assert response.status_code == 400


@pytest.mark.django_db
class TestLoadMessagesWithAttachments:

    def setup_method(self):
        self.user = User.objects.create_user(
            email='imane@example.com', name='Imane', password='StrongPass1',
        )
        self.project = _create_project(self.user, 'Project')
        self.url = f'/api/projects/{self.project.id}/messages'
        self.client = _auth_client(self.user)

    def test_load_messages_includes_attachments(self):
        msg = Message.objects.create(project=self.project, sender=self.user, text='Here')
        Attachment.objects.create(message=msg, url='https://s3.example.com/f.pdf', name='f.pdf', size=1024, type='application/pdf')
        response = self.client.get(self.url)
        assert response.status_code == 200
        attachments = response.data['messages'][0]['attachments']
        assert len(attachments) == 1
        assert attachments[0]['name'] == 'f.pdf'

    def test_load_message_no_attachments_returns_empty_array(self):
        Message.objects.create(project=self.project, sender=self.user, text='No files')
        response = self.client.get(self.url)
        assert response.data['messages'][0]['attachments'] == []
