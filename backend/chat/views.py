from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.shortcuts import get_object_or_404
from chat.models import Message
from chat.serializers import SendMessageSerializer
from projects.models import Project, ProjectMember


def _check_project_membership(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    if not ProjectMember.objects.filter(project=project, user=request.user).exists():
        return project, Response(
            {'detail': 'You are not a member of this project.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return project, None


def _serialize_message(message):
    return {
        'id': message.id,
        'text': message.text,
        'sender': {
            'id': message.sender.id,
            'name': message.sender.name,
            'avatar_color': message.sender.avatar_color,
        },
        'created_at': message.created_at,
    }


class MessageListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id):
        project, error = _check_project_membership(request, project_id)
        if error:
            return error

        serializer = SendMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        message = Message.objects.create(
            project=project,
            sender=request.user,
            text=serializer.validated_data['text'],
        )

        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f'chat_{project_id}',
                {
                    'type': 'chat.message',
                    'message': {
                        'id': message.id,
                        'text': message.text,
                        'sender': {
                            'id': message.sender.id,
                            'name': message.sender.name,
                            'avatar_color': message.sender.avatar_color,
                        },
                        'created_at': str(message.created_at),
                    },
                },
            )

        return Response(_serialize_message(message), status=status.HTTP_201_CREATED)

    def get(self, request, project_id):
        project, error = _check_project_membership(request, project_id)
        if error:
            return error

        limit = int(request.query_params.get('limit', 50))
        before = request.query_params.get('before')

        messages = Message.objects.filter(project=project).select_related('sender')

        if before:
            messages = messages.filter(id__lt=int(before))

        messages = messages.order_by('-created_at')[:limit]

        # Reverse to return oldest-first for display
        messages = list(reversed(messages))

        return Response({
            'messages': [_serialize_message(m) for m in messages],
        }, status=status.HTTP_200_OK)
