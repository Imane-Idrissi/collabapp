import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser
from projects.models import ProjectMember


class ChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.project_id = self.scope['url_route']['kwargs']['project_id']
        self.room_group_name = f'chat_{self.project_id}'
        user = self.scope.get('user')

        if isinstance(user, AnonymousUser) or user is None:
            await self.close()
            return

        is_member = await self._is_member(user.id, self.project_id)
        if not is_member:
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def chat_message(self, event):
        await self.send_json(event['message'])

    async def board_event(self, event):
        await self.send_json({
            'type': 'board_event',
            'event': event['event'],
            'payload': event['payload'],
        })

    @database_sync_to_async
    def _is_member(self, user_id, project_id):
        return ProjectMember.objects.filter(user_id=user_id, project_id=project_id).exists()
