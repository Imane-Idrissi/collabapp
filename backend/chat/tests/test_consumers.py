import pytest
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from projects.models import Project, ProjectMember
from config.asgi import application


@database_sync_to_async
def create_user(email, name):
    return User.objects.create_user(email=email, name=name, password='StrongPass1')


@database_sync_to_async
def create_project_with_member(user, name):
    project = Project.objects.create(name=name, description='', creator=user)
    ProjectMember.objects.create(project=project, user=user)
    return project


@database_sync_to_async
def get_token(user):
    return str(RefreshToken.for_user(user).access_token)


def _make_communicator(path, token=None):
    headers = [(b'origin', b'http://localhost')]
    if token:
        headers.append((b'cookie', f'access_token={token}'.encode()))
    return WebsocketCommunicator(application, path, headers=headers)


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
class TestChatConsumer:

    async def test_connect_without_token_is_rejected(self):
        communicator = _make_communicator('/ws/chat/1/')
        connected, _ = await communicator.connect()
        assert connected is False
        await communicator.disconnect()

    async def test_connect_with_invalid_token_is_rejected(self):
        communicator = _make_communicator('/ws/chat/1/', token='invalid')
        connected, _ = await communicator.connect()
        assert connected is False
        await communicator.disconnect()

    async def test_connect_non_member_is_rejected(self):
        user = await create_user('imane@example.com', 'Imane')
        owner = await create_user('owner@example.com', 'Owner')
        project = await create_project_with_member(owner, 'Project')
        token = await get_token(user)
        communicator = _make_communicator(f'/ws/chat/{project.id}/', token=token)
        connected, _ = await communicator.connect()
        assert connected is False
        await communicator.disconnect()

    async def test_connect_member_is_accepted(self):
        user = await create_user('imane@example.com', 'Imane')
        project = await create_project_with_member(user, 'Project')
        token = await get_token(user)
        communicator = _make_communicator(f'/ws/chat/{project.id}/', token=token)
        connected, _ = await communicator.connect()
        assert connected is True
        await communicator.disconnect()

    async def test_receives_broadcast_message(self):
        user = await create_user('imane@example.com', 'Imane')
        project = await create_project_with_member(user, 'Project')
        token = await get_token(user)
        communicator = _make_communicator(f'/ws/chat/{project.id}/', token=token)
        connected, _ = await communicator.connect()
        assert connected is True

        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f'chat_{project.id}',
            {
                'type': 'chat.message',
                'message': {
                    'id': 1,
                    'text': 'Hello!',
                    'sender': {'id': user.id, 'name': 'Imane', 'avatar_color': '#6366f1'},
                    'created_at': '2026-03-21T00:00:00Z',
                },
            },
        )

        response = await communicator.receive_json_from()
        assert response['text'] == 'Hello!'
        assert response['sender']['name'] == 'Imane'
        await communicator.disconnect()

    async def test_receives_board_event(self):
        user = await create_user('imane@example.com', 'Imane')
        project = await create_project_with_member(user, 'Project')
        token = await get_token(user)
        communicator = _make_communicator(f'/ws/chat/{project.id}/', token=token)
        connected, _ = await communicator.connect()
        assert connected is True

        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            f'chat_{project.id}',
            {
                'type': 'board.event',
                'event': 'task:created',
                'payload': {
                    'id': 1,
                    'name': 'New task',
                    'column_id': 1,
                },
            },
        )

        response = await communicator.receive_json_from()
        assert response['type'] == 'board_event'
        assert response['event'] == 'task:created'
        assert response['payload']['name'] == 'New task'
        await communicator.disconnect()
