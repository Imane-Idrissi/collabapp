import json
import logging
import uuid

from google import genai
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings as django_settings
from django.db.models import Count, Subquery
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from chat.models import Message
from projects.encryption import decrypt_api_key, encrypt_api_key
from projects.models import Column, InviteToken, Project, ProjectMember, Task

logger = logging.getLogger(__name__)
from projects.serializers import (
    ColumnSerializer,
    CreateProjectSerializer,
    CreateTaskSerializer,
    UpdateProjectSerializer,
    UpdateTaskSerializer,
)

def _broadcast_board_event(project_id, event, payload):
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f'chat_{project_id}',
            {
                'type': 'board.event',
                'event': event,
                'payload': payload,
            },
        )


DEFAULT_COLUMNS = [
    ('To Do', 0),
    ('In Progress', 1),
    ('Done', 2),
]


class ProjectListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_project_ids = ProjectMember.objects.filter(
            user=request.user,
        ).values_list('project_id', flat=True)
        projects = Project.objects.filter(
            id__in=user_project_ids,
        ).annotate(
            member_count=Count('members'),
        ).order_by('-created_at')

        search = request.query_params.get('search')
        if search:
            projects = projects.filter(name__icontains=search)

        data = [
            {
                'id': p.id,
                'name': p.name,
                'description': p.description,
                'member_count': p.member_count,
                'created_at': p.created_at,
            }
            for p in projects
        ]
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = CreateProjectSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        project = Project.objects.create(
            name=data['name'],
            description=data['description'],
            creator=request.user,
        )

        ProjectMember.objects.create(project=project, user=request.user)

        for name, position in DEFAULT_COLUMNS:
            Column.objects.create(project=project, name=name, position=position)

        return Response({
            'id': project.id,
            'name': project.name,
            'description': project.description,
            'created_at': project.created_at,
        }, status=status.HTTP_201_CREATED)


class ProjectDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, project_id):
        project = get_object_or_404(Project, id=project_id)

        if not ProjectMember.objects.filter(project=project, user=request.user).exists():
            return Response(
                {'detail': 'You are not a member of this project.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = UpdateProjectSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        if 'name' in data:
            project.name = data['name']
        if 'description' in data:
            project.description = data['description']
        project.save()

        return Response({
            'id': project.id,
            'name': project.name,
            'description': project.description,
            'created_at': project.created_at,
        }, status=status.HTTP_200_OK)


class GenerateInviteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id):
        project = get_object_or_404(Project, id=project_id)

        if not ProjectMember.objects.filter(project=project, user=request.user).exists():
            return Response(
                {'detail': 'You are not a member of this project.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        token = uuid.uuid4().hex
        InviteToken.objects.create(project=project, token=token)

        return Response({'token': token}, status=status.HTTP_201_CREATED)


class JoinProjectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token_value = request.data.get('token')
        if not token_value:
            return Response(
                {'token': ['This field is required.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invite = InviteToken.objects.filter(token=token_value).first()
        if not invite:
            return Response(
                {'token': ['Invalid invite token.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        project = invite.project

        if ProjectMember.objects.filter(project=project, user=request.user).exists():
            return Response(
                {'message': 'Already a member.', 'project': {'id': project.id, 'name': project.name}},
                status=status.HTTP_200_OK,
            )

        ProjectMember.objects.create(project=project, user=request.user)

        return Response(
            {'project': {'id': project.id, 'name': project.name}},
            status=status.HTTP_200_OK,
        )


def _check_project_membership(request, project_id):
    project = get_object_or_404(Project, id=project_id)
    if not ProjectMember.objects.filter(project=project, user=request.user).exists():
        return project, Response(
            {'detail': 'You are not a member of this project.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return project, None


class ProjectMemberListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project, error = _check_project_membership(request, project_id)
        if error:
            return error

        members = ProjectMember.objects.filter(
            project=project,
        ).select_related('user').order_by('joined_at')

        data = {
            'members': [
                {
                    'id': m.user.id,
                    'name': m.user.name,
                    'avatar_color': m.user.avatar_color,
                    'joined_at': m.joined_at,
                }
                for m in members
            ],
        }
        return Response(data, status=status.HTTP_200_OK)


class ColumnListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id):
        project, error = _check_project_membership(request, project_id)
        if error:
            return error

        serializer = ColumnSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        position = Column.objects.filter(project=project).count()
        column = Column.objects.create(
            project=project,
            name=serializer.validated_data['name'],
            position=position,
        )

        _broadcast_board_event(project_id, 'column:created', {
            'id': column.id,
            'name': column.name,
            'position': column.position,
        })

        return Response({
            'id': column.id,
            'name': column.name,
            'position': column.position,
        }, status=status.HTTP_201_CREATED)


class ColumnDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, project_id, column_id):
        project, error = _check_project_membership(request, project_id)
        if error:
            return error

        column = get_object_or_404(Column, id=column_id, project=project)

        serializer = ColumnSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        column.name = serializer.validated_data['name']
        column.save()

        _broadcast_board_event(project_id, 'column:renamed', {
            'id': column.id,
            'name': column.name,
            'position': column.position,
        })

        return Response({
            'id': column.id,
            'name': column.name,
            'position': column.position,
        }, status=status.HTTP_200_OK)

    def delete(self, request, project_id, column_id):
        project, error = _check_project_membership(request, project_id)
        if error:
            return error

        column = get_object_or_404(Column, id=column_id, project=project)

        if column.tasks.exists():
            return Response(
                {'detail': 'Column is not empty.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        col_id = column.id
        column.delete()

        _broadcast_board_event(project_id, 'column:deleted', {'id': col_id})

        return Response(status=status.HTTP_204_NO_CONTENT)


def _serialize_task(task):
    return {
        'id': task.id,
        'name': task.name,
        'description': task.description,
        'priority': task.priority,
        'position': task.position,
        'column_id': task.column_id,
        'creator_id': task.creator_id,
        'is_ai_generated': task.is_ai_generated,
        'version': task.version,
        'created_at': str(task.created_at),
    }


class TaskListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id):
        project, error = _check_project_membership(request, project_id)
        if error:
            return error

        serializer = CreateTaskSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        column = Column.objects.filter(id=data['column_id'], project=project).first()
        if not column:
            return Response(
                {'column_id': ['Invalid column.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        position = Task.objects.filter(column=column).count()
        task = Task.objects.create(
            column=column,
            project=project,
            name=data['name'],
            description=data['description'],
            priority=data['priority'],
            position=position,
            creator=request.user,
        )

        _broadcast_board_event(project_id, 'task:created', _serialize_task(task))

        return Response(_serialize_task(task), status=status.HTTP_201_CREATED)


class TaskDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, project_id, task_id):
        project, error = _check_project_membership(request, project_id)
        if error:
            return error

        task = get_object_or_404(Task, id=task_id, project=project)

        serializer = UpdateTaskSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        if 'version' in data and task.version != data['version']:
            return Response(
                {'detail': 'Someone else edited this task. Reload to see the latest version.'},
                status=status.HTTP_409_CONFLICT,
            )

        if 'name' in data:
            task.name = data['name']
        if 'description' in data:
            task.description = data['description']
        if 'priority' in data:
            task.priority = data['priority']
        if 'column_id' in data:
            column = Column.objects.filter(id=data['column_id'], project=project).first()
            if column:
                task.column = column
        if 'position' in data:
            task.position = data['position']

        is_move = 'column_id' in data or 'position' in data
        task.version += 1
        task.save()

        event_type = 'task:moved' if is_move else 'task:updated'
        _broadcast_board_event(project_id, event_type, _serialize_task(task))

        return Response(_serialize_task(task), status=status.HTTP_200_OK)

    def delete(self, request, project_id, task_id):
        project, error = _check_project_membership(request, project_id)
        if error:
            return error

        task = get_object_or_404(Task, id=task_id, project=project)
        task_id_val = task.id
        task.delete()

        _broadcast_board_event(project_id, 'task:deleted', {'id': task_id_val})

        return Response(status=status.HTTP_204_NO_CONTENT)


class BoardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        project, error = _check_project_membership(request, project_id)
        if error:
            return error

        columns = Column.objects.filter(
            project=project,
        ).prefetch_related('tasks').order_by('position')

        has_project_key = project.has_gemini_key
        ai_enabled = has_project_key or bool(django_settings.GEMINI_API_KEY)

        data = {
            'columns': [
                {
                    'id': col.id,
                    'name': col.name,
                    'position': col.position,
                    'tasks': [
                        _serialize_task(task)
                        for task in col.tasks.order_by('position')
                    ],
                }
                for col in columns
            ],
            'ai_enabled': ai_enabled,
            'has_api_key': has_project_key,
            'masked_api_key': project.masked_gemini_key if has_project_key else '',
            'is_creator': project.creator_id == request.user.id,
        }
        return Response(data, status=status.HTTP_200_OK)


EXTRACTION_MARKER = '──────── Tasks extracted ────────'

GEMINI_PROMPT = """You are analyzing a team chat conversation. Extract actionable tasks from the messages.

Return a JSON array of tasks. Each task should have:
- "name": short task title
- "description": brief description of what needs to be done
- "priority": "high", "medium", or "low"

If there are no actionable tasks, return an empty array: []

Only return the JSON array, no other text.

Messages:
"""


def call_gemini(messages, api_key=None):
    key = api_key or django_settings.GEMINI_API_KEY
    client = genai.Client(api_key=key)
    conversation = '\n'.join(
        f"{m['sender']}: {m['text']}" for m in messages
    )
    response = client.models.generate_content(
        model='gemini-2.0-flash',
        contents=GEMINI_PROMPT + conversation,
        config={'response_mime_type': 'application/json'},
    )
    return json.loads(response.text)


class ExtractTasksView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id):
        project, error = _check_project_membership(request, project_id)
        if error:
            return error

        if project.extraction_running:
            return Response(
                {'detail': 'Extraction already in progress.'},
                status=status.HTTP_409_CONFLICT,
            )

        last_marker = Message.objects.filter(
            project=project, text=EXTRACTION_MARKER,
        ).order_by('-created_at').first()

        messages = Message.objects.filter(
            project=project,
        ).exclude(text=EXTRACTION_MARKER).select_related('sender')

        if last_marker:
            messages = messages.filter(created_at__gt=last_marker.created_at)

        messages = messages.order_by('created_at')

        if not messages.exists():
            return Response({'suggestions': []}, status=status.HTTP_200_OK)

        gemini_key = None
        if project.has_gemini_key:
            gemini_key = decrypt_api_key(project.encrypted_gemini_key)
        elif not django_settings.GEMINI_API_KEY:
            return Response(
                {'detail': 'No API key configured. Add a Gemini API key in project settings.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        project.extraction_running = True
        project.save()

        try:
            message_data = [
                {'sender': m.sender.name, 'text': m.text}
                for m in messages
            ]
            suggestions = call_gemini(message_data, api_key=gemini_key)

            Message.objects.create(
                project=project,
                sender=request.user,
                text=EXTRACTION_MARKER,
            )

            project.extraction_running = False
            project.save()

            return Response({'suggestions': suggestions}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception('Gemini extraction failed')
            project.extraction_running = False
            project.save()

            error_msg = str(e)
            if 'RESOURCE_EXHAUSTED' in error_msg or '429' in error_msg:
                detail = 'Gemini API quota exceeded. Check your plan and billing at ai.google.dev, or try again later.'
            elif 'INVALID' in error_msg or '403' in error_msg or '401' in error_msg:
                detail = 'Invalid Gemini API key. Please update your key in project settings.'
            else:
                detail = 'AI extraction failed. Please try again.'

            return Response(
                {'detail': detail},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class BatchCreateTasksView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, project_id):
        project, error = _check_project_membership(request, project_id)
        if error:
            return error

        tasks_data = request.data.get('tasks', [])
        if not tasks_data:
            return Response(
                {'tasks': ['At least one task is required.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        created_tasks = []
        for t in tasks_data:
            column = Column.objects.filter(id=t.get('column_id'), project=project).first()
            if not column:
                return Response(
                    {'column_id': ['Invalid column.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            position = Task.objects.filter(column=column).count()
            task = Task.objects.create(
                column=column,
                project=project,
                name=t['name'],
                description=t.get('description', ''),
                priority=t.get('priority', ''),
                position=position,
                creator=request.user,
                is_ai_generated=True,
            )
            created_tasks.append(task)

        return Response(
            {'tasks': [_serialize_task(t) for t in created_tasks]},
            status=status.HTTP_201_CREATED,
        )


class APIKeyView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, project_id):
        project, error = _check_project_membership(request, project_id)
        if error:
            return error

        if project.creator_id != request.user.id:
            return Response(
                {'detail': 'Only the project creator can manage the API key.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        api_key = request.data.get('api_key', '').strip()
        if not api_key:
            return Response(
                {'api_key': ['This field is required.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        project.encrypted_gemini_key = encrypt_api_key(api_key)
        project.save()

        return Response({
            'has_key': True,
            'masked_key': project.masked_gemini_key,
        }, status=status.HTTP_200_OK)

    def delete(self, request, project_id):
        project, error = _check_project_membership(request, project_id)
        if error:
            return error

        if project.creator_id != request.user.id:
            return Response(
                {'detail': 'Only the project creator can manage the API key.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        project.encrypted_gemini_key = ''
        project.save()

        return Response(status=status.HTTP_204_NO_CONTENT)
