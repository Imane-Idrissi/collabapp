import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from projects.models import Column, Project, ProjectMember, Task


def _auth_client(user):
    client = APIClient()
    token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    return client


def _setup_project_with_member():
    user = User.objects.create_user(
        email='imane@example.com', name='Imane', password='StrongPass1',
    )
    project = Project.objects.create(name='Project', description='', creator=user)
    ProjectMember.objects.create(project=project, user=user)
    column = Column.objects.create(project=project, name='To Do', position=0)
    return user, project, column


@pytest.mark.django_db
class TestTaskBroadcast:

    def setup_method(self):
        self.user, self.project, self.column = _setup_project_with_member()
        self.client = _auth_client(self.user)

    @patch('projects.views.get_channel_layer')
    def test_create_task_broadcasts_task_created(self, mock_get_layer):
        mock_layer = MagicMock()
        mock_layer.group_send = AsyncMock()
        mock_get_layer.return_value = mock_layer

        response = self.client.post(
            f'/api/projects/{self.project.id}/tasks',
            {'name': 'New task', 'column_id': self.column.id},
        )
        assert response.status_code == 201

        mock_layer.group_send.assert_called_once()
        call_args = mock_layer.group_send.call_args
        assert call_args[0][0] == f'chat_{self.project.id}'
        event = call_args[0][1]
        assert event['type'] == 'board.event'
        assert event['event'] == 'task:created'
        assert event['payload']['name'] == 'New task'
        assert event['payload']['id'] == response.data['id']

    @patch('projects.views.get_channel_layer')
    def test_edit_task_name_broadcasts_task_updated(self, mock_get_layer):
        mock_layer = MagicMock()
        mock_layer.group_send = AsyncMock()
        mock_get_layer.return_value = mock_layer

        task = Task.objects.create(
            column=self.column, project=self.project,
            name='Old name', description='', priority='', position=0,
            creator=self.user,
        )

        response = self.client.patch(
            f'/api/projects/{self.project.id}/tasks/{task.id}',
            {'name': 'New name'},
        )
        assert response.status_code == 200

        mock_layer.group_send.assert_called_once()
        event = mock_layer.group_send.call_args[0][1]
        assert event['type'] == 'board.event'
        assert event['event'] == 'task:updated'
        assert event['payload']['name'] == 'New name'

    @patch('projects.views.get_channel_layer')
    def test_move_task_to_column_broadcasts_task_moved(self, mock_get_layer):
        mock_layer = MagicMock()
        mock_layer.group_send = AsyncMock()
        mock_get_layer.return_value = mock_layer

        col2 = Column.objects.create(project=self.project, name='Done', position=1)
        task = Task.objects.create(
            column=self.column, project=self.project,
            name='Task', description='', priority='', position=0,
            creator=self.user,
        )

        response = self.client.patch(
            f'/api/projects/{self.project.id}/tasks/{task.id}',
            {'column_id': col2.id},
        )
        assert response.status_code == 200

        event = mock_layer.group_send.call_args[0][1]
        assert event['event'] == 'task:moved'
        assert event['payload']['column_id'] == col2.id

    @patch('projects.views.get_channel_layer')
    def test_move_task_position_broadcasts_task_moved(self, mock_get_layer):
        mock_layer = MagicMock()
        mock_layer.group_send = AsyncMock()
        mock_get_layer.return_value = mock_layer

        task = Task.objects.create(
            column=self.column, project=self.project,
            name='Task', description='', priority='', position=0,
            creator=self.user,
        )

        response = self.client.patch(
            f'/api/projects/{self.project.id}/tasks/{task.id}',
            {'position': 5},
        )
        assert response.status_code == 200

        event = mock_layer.group_send.call_args[0][1]
        assert event['event'] == 'task:moved'

    @patch('projects.views.get_channel_layer')
    def test_delete_task_broadcasts_task_deleted(self, mock_get_layer):
        mock_layer = MagicMock()
        mock_layer.group_send = AsyncMock()
        mock_get_layer.return_value = mock_layer

        task = Task.objects.create(
            column=self.column, project=self.project,
            name='Task', description='', priority='', position=0,
            creator=self.user,
        )
        task_id = task.id

        response = self.client.delete(
            f'/api/projects/{self.project.id}/tasks/{task_id}',
        )
        assert response.status_code == 204

        event = mock_layer.group_send.call_args[0][1]
        assert event['type'] == 'board.event'
        assert event['event'] == 'task:deleted'
        assert event['payload']['id'] == task_id


@pytest.mark.django_db
class TestColumnBroadcast:

    def setup_method(self):
        self.user, self.project, self.column = _setup_project_with_member()
        self.client = _auth_client(self.user)

    @patch('projects.views.get_channel_layer')
    def test_create_column_broadcasts_column_created(self, mock_get_layer):
        mock_layer = MagicMock()
        mock_layer.group_send = AsyncMock()
        mock_get_layer.return_value = mock_layer

        response = self.client.post(
            f'/api/projects/{self.project.id}/columns',
            {'name': 'New Column'},
        )
        assert response.status_code == 201

        event = mock_layer.group_send.call_args[0][1]
        assert event['type'] == 'board.event'
        assert event['event'] == 'column:created'
        assert event['payload']['name'] == 'New Column'
        assert event['payload']['id'] == response.data['id']

    @patch('projects.views.get_channel_layer')
    def test_rename_column_broadcasts_column_renamed(self, mock_get_layer):
        mock_layer = MagicMock()
        mock_layer.group_send = AsyncMock()
        mock_get_layer.return_value = mock_layer

        response = self.client.patch(
            f'/api/projects/{self.project.id}/columns/{self.column.id}',
            {'name': 'Renamed'},
        )
        assert response.status_code == 200

        event = mock_layer.group_send.call_args[0][1]
        assert event['type'] == 'board.event'
        assert event['event'] == 'column:renamed'
        assert event['payload']['name'] == 'Renamed'

    @patch('projects.views.get_channel_layer')
    def test_delete_column_broadcasts_column_deleted(self, mock_get_layer):
        mock_layer = MagicMock()
        mock_layer.group_send = AsyncMock()
        mock_get_layer.return_value = mock_layer

        empty_col = Column.objects.create(project=self.project, name='Empty', position=1)
        col_id = empty_col.id

        response = self.client.delete(
            f'/api/projects/{self.project.id}/columns/{col_id}',
        )
        assert response.status_code == 204

        event = mock_layer.group_send.call_args[0][1]
        assert event['type'] == 'board.event'
        assert event['event'] == 'column:deleted'
        assert event['payload']['id'] == col_id
