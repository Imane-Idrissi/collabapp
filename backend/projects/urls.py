from django.urls import path
from chat.views import MessageListCreateView, UploadView
from projects.views import (
    BatchCreateTasksView,
    BoardView,
    ColumnDetailView,
    ColumnListCreateView,
    ExtractTasksView,
    GenerateInviteView,
    JoinProjectView,
    ProjectDetailView,
    ProjectListCreateView,
    TaskDetailView,
    TaskListCreateView,
)

urlpatterns = [
    path('', ProjectListCreateView.as_view(), name='project-list-create'),
    path('/join', JoinProjectView.as_view(), name='join-project'),
    path('/<int:project_id>', ProjectDetailView.as_view(), name='project-detail'),
    path('/<int:project_id>/invites', GenerateInviteView.as_view(), name='generate-invite'),
    path('/<int:project_id>/columns', ColumnListCreateView.as_view(), name='column-list-create'),
    path('/<int:project_id>/columns/<int:column_id>', ColumnDetailView.as_view(), name='column-detail'),
    path('/<int:project_id>/tasks', TaskListCreateView.as_view(), name='task-list-create'),
    path('/<int:project_id>/tasks/<int:task_id>', TaskDetailView.as_view(), name='task-detail'),
    path('/<int:project_id>/board', BoardView.as_view(), name='board'),
    path('/<int:project_id>/messages', MessageListCreateView.as_view(), name='message-list-create'),
    path('/<int:project_id>/upload', UploadView.as_view(), name='upload'),
    path('/<int:project_id>/extract-tasks', ExtractTasksView.as_view(), name='extract-tasks'),
    path('/<int:project_id>/tasks/batch', BatchCreateTasksView.as_view(), name='batch-create-tasks'),
]
