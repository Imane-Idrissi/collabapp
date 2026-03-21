from django.urls import path
from projects.views import (
    ColumnDetailView,
    ColumnListCreateView,
    GenerateInviteView,
    JoinProjectView,
    ProjectDetailView,
    ProjectListCreateView,
)

urlpatterns = [
    path('', ProjectListCreateView.as_view(), name='project-list-create'),
    path('/join', JoinProjectView.as_view(), name='join-project'),
    path('/<int:project_id>', ProjectDetailView.as_view(), name='project-detail'),
    path('/<int:project_id>/invites', GenerateInviteView.as_view(), name='generate-invite'),
    path('/<int:project_id>/columns', ColumnListCreateView.as_view(), name='column-list-create'),
    path('/<int:project_id>/columns/<int:column_id>', ColumnDetailView.as_view(), name='column-detail'),
]
