import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from projects.models import Project, ProjectMember, Column


@pytest.mark.django_db
class TestCreateProject:

    def setup_method(self):
        self.client = APIClient()
        self.url = '/api/projects'
        self.user = User.objects.create_user(
            email='imane@example.com',
            name='Imane',
            password='StrongPass1',
        )
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    # --- Step 2: Check authentication ---

    def test_create_project_without_auth_returns_401(self):
        client = APIClient()
        response = client.post(self.url, {'name': 'Test'})
        assert response.status_code == 401

    # --- Step 3: Validate fields ---

    def test_create_project_with_missing_name_returns_400(self):
        response = self.client.post(self.url, {})
        assert response.status_code == 400
        assert 'name' in response.data

    def test_create_project_with_empty_name_returns_400(self):
        response = self.client.post(self.url, {'name': ''})
        assert response.status_code == 400
        assert 'name' in response.data

    def test_create_project_without_description_returns_201(self):
        response = self.client.post(self.url, {'name': 'My Project'})
        assert response.status_code == 201
        assert response.data['description'] == ''

    # --- Step 4: Create project ---

    def test_create_project_stores_correct_data(self):
        self.client.post(self.url, {
            'name': 'My Project',
            'description': 'A cool project',
        })
        project = Project.objects.get(name='My Project')
        assert project.description == 'A cool project'
        assert project.creator == self.user

    def test_create_project_adds_creator_as_member(self):
        response = self.client.post(self.url, {'name': 'My Project'})
        project = Project.objects.get(id=response.data['id'])
        assert ProjectMember.objects.filter(project=project, user=self.user).exists()

    def test_create_project_creates_default_columns(self):
        response = self.client.post(self.url, {'name': 'My Project'})
        project = Project.objects.get(id=response.data['id'])
        columns = Column.objects.filter(project=project).order_by('position')
        assert columns.count() == 3
        assert columns[0].name == 'To Do'
        assert columns[0].position == 0
        assert columns[1].name == 'In Progress'
        assert columns[1].position == 1
        assert columns[2].name == 'Done'
        assert columns[2].position == 2

    # --- Step 5: Return response ---

    def test_create_project_returns_201_with_data(self):
        response = self.client.post(self.url, {
            'name': 'My Project',
            'description': 'A cool project',
        })
        assert response.status_code == 201
        assert response.data['name'] == 'My Project'
        assert response.data['description'] == 'A cool project'
        assert 'id' in response.data
        assert 'created_at' in response.data
