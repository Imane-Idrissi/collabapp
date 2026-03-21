from django.urls import path
from projects.views import GenerateInviteView, JoinProjectView, ProjectDetailView, ProjectListCreateView

urlpatterns = [
    path('', ProjectListCreateView.as_view(), name='project-list-create'),
    path('/join', JoinProjectView.as_view(), name='join-project'),
    path('/<int:project_id>', ProjectDetailView.as_view(), name='project-detail'),
    path('/<int:project_id>/invites', GenerateInviteView.as_view(), name='generate-invite'),
]
