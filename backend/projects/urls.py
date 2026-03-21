from django.urls import path
from projects.views import ProjectListCreateView

urlpatterns = [
    path('', ProjectListCreateView.as_view(), name='project-list-create'),
]
