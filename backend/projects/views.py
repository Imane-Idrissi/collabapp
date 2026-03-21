import uuid

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.db.models import Count, Subquery
from projects.models import Column, InviteToken, Project, ProjectMember
from django.shortcuts import get_object_or_404
from projects.serializers import CreateProjectSerializer, UpdateProjectSerializer

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
