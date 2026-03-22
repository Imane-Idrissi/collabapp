import uuid

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Count, Subquery
from projects.models import Column, InviteToken, Project, ProjectMember, Task
from django.shortcuts import get_object_or_404
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
        'created_at': task.created_at,
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
        }
        return Response(data, status=status.HTTP_200_OK)
