from django.urls import path
from projects.views import CreateProjectView

urlpatterns = [
    path('', CreateProjectView.as_view(), name='create-project'),
]
