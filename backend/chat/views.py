import uuid

import boto3
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from chat.models import Attachment, Message
from chat.serializers import SendMessageSerializer, UploadSerializer
from projects.models import Project, ProjectMember


def _check_project_membership(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    if not ProjectMember.objects.filter(project=project, user=request.user).exists():
        return project, Response(
            {'detail': 'You are not a member of this project.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return project, None


def _serialize_attachment(attachment):
    return {
        'id': attachment.id,
        'url': attachment.url,
        'name': attachment.name,
        'size': attachment.size,
        'type': attachment.type,
    }


def _serialize_message(message):
    return {
        'id': message.id,
        'text': message.text,
        'sender': {
            'id': message.sender.id,
            'name': message.sender.name,
            'avatar_color': message.sender.avatar_color,
        },
        'attachments': [_serialize_attachment(a) for a in message.attachments.all()],
        'created_at': message.created_at,
    }


class UploadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id):
        project, error = _check_project_membership(request, project_id)
        if error:
            return error

        serializer = UploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        file_key = f'attachments/{project_id}/{uuid.uuid4().hex}-{data["filename"]}'
        bucket = settings.AWS_S3_BUCKET

        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION,
        )

        upload_url = s3.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': bucket,
                'Key': file_key,
                'ContentType': data['content_type'],
            },
            ExpiresIn=300,
        )

        file_url = f'https://{bucket}.s3.{settings.AWS_S3_REGION}.amazonaws.com/{file_key}'

        return Response({
            'upload_url': upload_url,
            'file_url': file_url,
        }, status=status.HTTP_200_OK)


class MessageListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id):
        project, error = _check_project_membership(request, project_id)
        if error:
            return error

        serializer = SendMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        message = Message.objects.create(
            project=project,
            sender=request.user,
            text=data['text'],
        )

        for att in data.get('attachments', []):
            Attachment.objects.create(
                message=message,
                url=att['url'],
                name=att['name'],
                size=att['size'],
                type=att['type'],
            )

        serialized = _serialize_message(message)

        channel_layer = get_channel_layer()
        if channel_layer:
            broadcast = serialized.copy()
            broadcast['created_at'] = str(broadcast['created_at'])
            async_to_sync(channel_layer.group_send)(
                f'chat_{project_id}',
                {
                    'type': 'chat.message',
                    'message': broadcast,
                },
            )

        return Response(serialized, status=status.HTTP_201_CREATED)

    def get(self, request, project_id):
        project, error = _check_project_membership(request, project_id)
        if error:
            return error

        limit = int(request.query_params.get('limit', 50))
        before = request.query_params.get('before')

        messages = Message.objects.filter(
            project=project,
        ).select_related('sender').prefetch_related('attachments')

        if before:
            messages = messages.filter(id__lt=int(before))

        messages = messages.order_by('-created_at')[:limit]

        # Reverse to return oldest-first for display
        messages = list(reversed(messages))

        return Response({
            'messages': [_serialize_message(m) for m in messages],
        }, status=status.HTTP_200_OK)
