from django.urls import path
from projects.views import ProjectDetailView, ProjectListCreateView

urlpatterns = [
    path('', ProjectListCreateView.as_view(), name='project-list-create'),
    path('/<int:project_id>', ProjectDetailView.as_view(), name='project-detail'),
]
