import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import User
from projects.models import Column, InviteToken, Project, ProjectMember, Task


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


def _create_project(user, name, description=''):
    project = Project.objects.create(name=name, description=description, creator=user)
    ProjectMember.objects.create(project=project, user=user)
    return project


@pytest.mark.django_db
class TestListProjects:

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

    def test_list_projects_without_auth_returns_401(self):
        client = APIClient()
        response = client.get(self.url)
        assert response.status_code == 401

    # --- Step 3: Query projects ---

    def test_list_projects_with_no_projects_returns_empty_list(self):
        response = self.client.get(self.url)
        assert response.status_code == 200
        assert response.data == []

    def test_list_projects_returns_user_projects(self):
        _create_project(self.user, 'Project 1')
        _create_project(self.user, 'Project 2')
        response = self.client.get(self.url)
        assert response.status_code == 200
        assert len(response.data) == 2

    def test_list_projects_only_shows_member_projects(self):
        _create_project(self.user, 'My Project')
        other_user = User.objects.create_user(
            email='other@example.com',
            name='Other',
            password='StrongPass1',
        )
        _create_project(other_user, 'Not My Project')
        response = self.client.get(self.url)
        assert len(response.data) == 1
        assert response.data[0]['name'] == 'My Project'

    def test_list_projects_search_filters_by_name(self):
        _create_project(self.user, 'CollabApp')
        _create_project(self.user, 'Todo App')
        response = self.client.get(self.url, {'search': 'collab'})
        assert len(response.data) == 1
        assert response.data[0]['name'] == 'CollabApp'

    def test_list_projects_search_no_matches_returns_empty(self):
        _create_project(self.user, 'CollabApp')
        response = self.client.get(self.url, {'search': 'nonexistent'})
        assert response.status_code == 200
        assert response.data == []

    # --- Step 4: Return response ---

    def test_list_projects_includes_member_count(self):
        project = _create_project(self.user, 'Team Project')
        other_user = User.objects.create_user(
            email='other@example.com',
            name='Other',
            password='StrongPass1',
        )
        ProjectMember.objects.create(project=project, user=other_user)
        response = self.client.get(self.url)
        assert response.data[0]['member_count'] == 2


@pytest.mark.django_db
class TestUpdateProject:

    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='imane@example.com',
            name='Imane',
            password='StrongPass1',
        )
        self.project = _create_project(self.user, 'Original Name', 'Original desc')
        self.url = f'/api/projects/{self.project.id}'
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    # --- Authentication ---

    def test_update_project_without_auth_returns_401(self):
        client = APIClient()
        response = client.patch(self.url, {'name': 'New'})
        assert response.status_code == 401

    # --- Membership ---

    def test_update_project_non_member_returns_403(self):
        other = User.objects.create_user(email='other@example.com', name='Other', password='StrongPass1')
        client = APIClient()
        token = str(RefreshToken.for_user(other).access_token)
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = client.patch(self.url, {'name': 'New'})
        assert response.status_code == 403

    def test_update_project_not_found_returns_404(self):
        response = self.client.patch('/api/projects/99999', {'name': 'New'})
        assert response.status_code == 404

    # --- Validation ---

    def test_update_project_with_empty_name_returns_400(self):
        response = self.client.patch(self.url, {'name': ''}, format='json')
        assert response.status_code == 400

    # --- Update ---

    def test_update_project_name_only(self):
        response = self.client.patch(self.url, {'name': 'New Name'})
        assert response.status_code == 200
        self.project.refresh_from_db()
        assert self.project.name == 'New Name'
        assert self.project.description == 'Original desc'

    def test_update_project_description_only(self):
        response = self.client.patch(self.url, {'description': 'New desc'})
        assert response.status_code == 200
        self.project.refresh_from_db()
        assert self.project.name == 'Original Name'
        assert self.project.description == 'New desc'

    def test_update_project_both_fields(self):
        response = self.client.patch(self.url, {'name': 'New Name', 'description': 'New desc'})
        assert response.status_code == 200
        assert response.data['name'] == 'New Name'
        assert response.data['description'] == 'New desc'
        assert 'id' in response.data
        assert 'created_at' in response.data


@pytest.mark.django_db
class TestGenerateInvite:

    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='imane@example.com', name='Imane', password='StrongPass1',
        )
        self.project = _create_project(self.user, 'My Project')
        self.url = f'/api/projects/{self.project.id}/invites'
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_generate_invite_without_auth_returns_401(self):
        client = APIClient()
        response = client.post(self.url)
        assert response.status_code == 401

    def test_generate_invite_non_member_returns_403(self):
        other = User.objects.create_user(email='other@example.com', name='Other', password='StrongPass1')
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(other).access_token}')
        response = client.post(self.url)
        assert response.status_code == 403

    def test_generate_invite_project_not_found_returns_404(self):
        response = self.client.post('/api/projects/99999/invites')
        assert response.status_code == 404

    def test_generate_invite_creates_token(self):
        response = self.client.post(self.url)
        assert response.status_code == 201
        assert 'token' in response.data
        assert InviteToken.objects.filter(project=self.project).exists()


@pytest.mark.django_db
class TestJoinProject:

    def setup_method(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            email='owner@example.com', name='Owner', password='StrongPass1',
        )
        self.project = _create_project(self.owner, 'Team Project')
        self.invite = InviteToken.objects.create(project=self.project, token='invite123')
        self.joiner = User.objects.create_user(
            email='joiner@example.com', name='Joiner', password='StrongPass1',
        )
        self.url = '/api/projects/join'
        token = str(RefreshToken.for_user(self.joiner).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_join_project_without_auth_returns_401(self):
        client = APIClient()
        response = client.post(self.url, {'token': 'invite123'})
        assert response.status_code == 401

    def test_join_project_missing_token_returns_400(self):
        response = self.client.post(self.url, {})
        assert response.status_code == 400

    def test_join_project_invalid_token_returns_400(self):
        response = self.client.post(self.url, {'token': 'nonexistent'})
        assert response.status_code == 400

    def test_join_project_already_member_returns_200(self):
        ProjectMember.objects.create(project=self.project, user=self.joiner)
        response = self.client.post(self.url, {'token': 'invite123'})
        assert response.status_code == 200
        assert 'Already a member' in response.data['message']

    def test_join_project_success_creates_member(self):
        response = self.client.post(self.url, {'token': 'invite123'})
        assert response.status_code == 200
        assert ProjectMember.objects.filter(project=self.project, user=self.joiner).exists()
        assert response.data['project']['id'] == self.project.id
        assert response.data['project']['name'] == 'Team Project'


@pytest.mark.django_db
class TestCreateColumn:

    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='imane@example.com', name='Imane', password='StrongPass1',
        )
        self.project = _create_project(self.user, 'My Project')
        self.url = f'/api/projects/{self.project.id}/columns'
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_create_column_without_auth_returns_401(self):
        client = APIClient()
        response = client.post(self.url, {'name': 'New Column'})
        assert response.status_code == 401

    def test_create_column_non_member_returns_403(self):
        other = User.objects.create_user(email='other@example.com', name='Other', password='StrongPass1')
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(other).access_token}')
        response = client.post(self.url, {'name': 'New Column'})
        assert response.status_code == 403

    def test_create_column_project_not_found_returns_404(self):
        response = self.client.post('/api/projects/99999/columns', {'name': 'New Column'})
        assert response.status_code == 404

    def test_create_column_missing_name_returns_400(self):
        response = self.client.post(self.url, {})
        assert response.status_code == 400

    def test_create_column_empty_name_returns_400(self):
        response = self.client.post(self.url, {'name': ''})
        assert response.status_code == 400

    def test_create_column_success(self):
        response = self.client.post(self.url, {'name': 'New Column'})
        assert response.status_code == 201
        assert response.data['name'] == 'New Column'
        assert response.data['position'] == 0
        assert 'id' in response.data

    def test_create_column_sets_next_position(self):
        Column.objects.create(project=self.project, name='Existing', position=0)
        response = self.client.post(self.url, {'name': 'Second'})
        assert response.data['position'] == 1


@pytest.mark.django_db
class TestRenameColumn:

    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='imane@example.com', name='Imane', password='StrongPass1',
        )
        self.project = _create_project(self.user, 'My Project')
        self.column = Column.objects.create(project=self.project, name='To Do', position=0)
        self.url = f'/api/projects/{self.project.id}/columns/{self.column.id}'
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_rename_column_without_auth_returns_401(self):
        client = APIClient()
        response = client.patch(self.url, {'name': 'New Name'})
        assert response.status_code == 401

    def test_rename_column_non_member_returns_403(self):
        other = User.objects.create_user(email='other@example.com', name='Other', password='StrongPass1')
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(other).access_token}')
        response = client.patch(self.url, {'name': 'New Name'})
        assert response.status_code == 403

    def test_rename_column_not_found_returns_404(self):
        response = self.client.patch(
            f'/api/projects/{self.project.id}/columns/99999', {'name': 'New Name'}
        )
        assert response.status_code == 404

    def test_rename_column_empty_name_returns_400(self):
        response = self.client.patch(self.url, {'name': ''}, format='json')
        assert response.status_code == 400

    def test_rename_column_success(self):
        response = self.client.patch(self.url, {'name': 'Doing'})
        assert response.status_code == 200
        assert response.data['name'] == 'Doing'
        assert response.data['id'] == self.column.id
        assert response.data['position'] == 0
        self.column.refresh_from_db()
        assert self.column.name == 'Doing'


@pytest.mark.django_db
class TestDeleteColumn:

    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='imane@example.com', name='Imane', password='StrongPass1',
        )
        self.project = _create_project(self.user, 'My Project')
        self.column = Column.objects.create(project=self.project, name='To Do', position=0)
        self.url = f'/api/projects/{self.project.id}/columns/{self.column.id}'
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_delete_column_without_auth_returns_401(self):
        client = APIClient()
        response = client.delete(self.url)
        assert response.status_code == 401

    def test_delete_column_non_member_returns_403(self):
        other = User.objects.create_user(email='other@example.com', name='Other', password='StrongPass1')
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(other).access_token}')
        response = client.delete(self.url)
        assert response.status_code == 403

    def test_delete_column_not_found_returns_404(self):
        response = self.client.delete(f'/api/projects/{self.project.id}/columns/99999')
        assert response.status_code == 404

    def test_delete_column_with_tasks_returns_400(self):
        Task.objects.create(
            column=self.column, project=self.project, name='A task',
            position=0, creator=self.user,
        )
        response = self.client.delete(self.url)
        assert response.status_code == 400

    def test_delete_column_success(self):
        response = self.client.delete(self.url)
        assert response.status_code == 204
        assert not Column.objects.filter(id=self.column.id).exists()


@pytest.mark.django_db
class TestCreateTask:

    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='imane@example.com', name='Imane', password='StrongPass1',
        )
        self.project = _create_project(self.user, 'My Project')
        self.column = Column.objects.create(project=self.project, name='To Do', position=0)
        self.url = f'/api/projects/{self.project.id}/tasks'
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_create_task_without_auth_returns_401(self):
        client = APIClient()
        response = client.post(self.url, {'name': 'Task', 'column_id': self.column.id})
        assert response.status_code == 401

    def test_create_task_non_member_returns_403(self):
        other = User.objects.create_user(email='other@example.com', name='Other', password='StrongPass1')
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(other).access_token}')
        response = client.post(self.url, {'name': 'Task', 'column_id': self.column.id})
        assert response.status_code == 403

    def test_create_task_project_not_found_returns_404(self):
        response = self.client.post('/api/projects/99999/tasks', {'name': 'Task', 'column_id': 1})
        assert response.status_code == 404

    def test_create_task_missing_name_returns_400(self):
        response = self.client.post(self.url, {'column_id': self.column.id})
        assert response.status_code == 400

    def test_create_task_missing_column_id_returns_400(self):
        response = self.client.post(self.url, {'name': 'Task'})
        assert response.status_code == 400

    def test_create_task_invalid_column_id_returns_400(self):
        response = self.client.post(self.url, {'name': 'Task', 'column_id': 99999})
        assert response.status_code == 400

    def test_create_task_column_from_other_project_returns_400(self):
        other_user = User.objects.create_user(email='other@example.com', name='Other', password='StrongPass1')
        other_project = _create_project(other_user, 'Other Project')
        other_column = Column.objects.create(project=other_project, name='Col', position=0)
        response = self.client.post(self.url, {'name': 'Task', 'column_id': other_column.id})
        assert response.status_code == 400

    def test_create_task_success(self):
        response = self.client.post(self.url, {
            'name': 'My Task',
            'column_id': self.column.id,
            'description': 'Some desc',
            'priority': 'high',
        })
        assert response.status_code == 201
        assert response.data['name'] == 'My Task'
        assert response.data['description'] == 'Some desc'
        assert response.data['priority'] == 'high'
        assert response.data['position'] == 0
        assert response.data['column_id'] == self.column.id
        assert response.data['creator_id'] == self.user.id
        assert response.data['version'] == 1
        assert response.data['is_ai_generated'] is False

    def test_create_task_sets_next_position(self):
        Task.objects.create(
            column=self.column, project=self.project, name='First',
            position=0, creator=self.user,
        )
        response = self.client.post(self.url, {'name': 'Second', 'column_id': self.column.id})
        assert response.data['position'] == 1


@pytest.mark.django_db
class TestEditTask:

    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='imane@example.com', name='Imane', password='StrongPass1',
        )
        self.project = _create_project(self.user, 'My Project')
        self.column = Column.objects.create(project=self.project, name='To Do', position=0)
        self.column2 = Column.objects.create(project=self.project, name='Done', position=1)
        self.task = Task.objects.create(
            column=self.column, project=self.project, name='My Task',
            description='Desc', priority='medium', position=0, creator=self.user,
        )
        self.url = f'/api/projects/{self.project.id}/tasks/{self.task.id}'
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_edit_task_without_auth_returns_401(self):
        client = APIClient()
        response = client.patch(self.url, {'name': 'New'})
        assert response.status_code == 401

    def test_edit_task_non_member_returns_403(self):
        other = User.objects.create_user(email='other@example.com', name='Other', password='StrongPass1')
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(other).access_token}')
        response = client.patch(self.url, {'name': 'New'})
        assert response.status_code == 403

    def test_edit_task_not_found_returns_404(self):
        response = self.client.patch(
            f'/api/projects/{self.project.id}/tasks/99999', {'name': 'New'}
        )
        assert response.status_code == 404

    def test_edit_task_version_conflict_returns_409(self):
        response = self.client.patch(self.url, {'name': 'New', 'version': 999}, format='json')
        assert response.status_code == 409

    def test_edit_task_name(self):
        response = self.client.patch(self.url, {'name': 'Updated', 'version': 1}, format='json')
        assert response.status_code == 200
        assert response.data['name'] == 'Updated'
        assert response.data['version'] == 2

    def test_edit_task_move_to_column(self):
        response = self.client.patch(
            self.url, {'column_id': self.column2.id, 'version': 1}, format='json',
        )
        assert response.status_code == 200
        assert response.data['column_id'] == self.column2.id
        assert response.data['version'] == 2

    def test_edit_task_increments_version(self):
        self.client.patch(self.url, {'name': 'V2', 'version': 1}, format='json')
        self.task.refresh_from_db()
        assert self.task.version == 2
        response = self.client.patch(self.url, {'name': 'V3', 'version': 2}, format='json')
        assert response.status_code == 200
        assert response.data['version'] == 3


@pytest.mark.django_db
class TestDeleteTask:

    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='imane@example.com', name='Imane', password='StrongPass1',
        )
        self.project = _create_project(self.user, 'My Project')
        self.column = Column.objects.create(project=self.project, name='To Do', position=0)
        self.task = Task.objects.create(
            column=self.column, project=self.project, name='My Task',
            position=0, creator=self.user,
        )
        self.url = f'/api/projects/{self.project.id}/tasks/{self.task.id}'
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_delete_task_without_auth_returns_401(self):
        client = APIClient()
        response = client.delete(self.url)
        assert response.status_code == 401

    def test_delete_task_non_member_returns_403(self):
        other = User.objects.create_user(email='other@example.com', name='Other', password='StrongPass1')
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(other).access_token}')
        response = client.delete(self.url)
        assert response.status_code == 403

    def test_delete_task_not_found_returns_404(self):
        response = self.client.delete(f'/api/projects/{self.project.id}/tasks/99999')
        assert response.status_code == 404

    def test_delete_task_success(self):
        response = self.client.delete(self.url)
        assert response.status_code == 204
        assert not Task.objects.filter(id=self.task.id).exists()


@pytest.mark.django_db
class TestLoadBoard:

    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='imane@example.com', name='Imane', password='StrongPass1',
        )
        self.project = _create_project(self.user, 'My Project')
        self.url = f'/api/projects/{self.project.id}/board'
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_load_board_without_auth_returns_401(self):
        client = APIClient()
        response = client.get(self.url)
        assert response.status_code == 401

    def test_load_board_non_member_returns_403(self):
        other = User.objects.create_user(email='other@example.com', name='Other', password='StrongPass1')
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(other).access_token}')
        response = client.get(self.url)
        assert response.status_code == 403

    def test_load_board_project_not_found_returns_404(self):
        response = self.client.get('/api/projects/99999/board')
        assert response.status_code == 404

    def test_load_board_empty_returns_empty_columns(self):
        response = self.client.get(self.url)
        assert response.status_code == 200
        assert response.data['columns'] == []

    def test_load_board_returns_columns_with_tasks(self):
        col = Column.objects.create(project=self.project, name='To Do', position=0)
        task = Task.objects.create(
            column=col, project=self.project, name='Task 1',
            position=0, creator=self.user,
        )
        response = self.client.get(self.url)
        assert response.status_code == 200
        assert len(response.data['columns']) == 1
        assert response.data['columns'][0]['name'] == 'To Do'
        assert len(response.data['columns'][0]['tasks']) == 1
        assert response.data['columns'][0]['tasks'][0]['name'] == 'Task 1'

    def test_load_board_columns_ordered_by_position(self):
        Column.objects.create(project=self.project, name='Done', position=2)
        Column.objects.create(project=self.project, name='To Do', position=0)
        Column.objects.create(project=self.project, name='In Progress', position=1)
        response = self.client.get(self.url)
        names = [c['name'] for c in response.data['columns']]
        assert names == ['To Do', 'In Progress', 'Done']

    def test_load_board_tasks_ordered_by_position(self):
        col = Column.objects.create(project=self.project, name='To Do', position=0)
        Task.objects.create(column=col, project=self.project, name='Second', position=1, creator=self.user)
        Task.objects.create(column=col, project=self.project, name='First', position=0, creator=self.user)
        response = self.client.get(self.url)
        task_names = [t['name'] for t in response.data['columns'][0]['tasks']]
        assert task_names == ['First', 'Second']


@pytest.mark.django_db
class TestListMembers:

    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='imane@example.com', name='Imane', password='StrongPass1',
        )
        self.project = _create_project(self.user, 'My Project')
        self.url = f'/api/projects/{self.project.id}/members'
        token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_list_members_without_auth_returns_401(self):
        client = APIClient()
        response = client.get(self.url)
        assert response.status_code == 401

    def test_list_members_as_non_member_returns_403(self):
        other = User.objects.create_user(email='other@example.com', name='Other', password='StrongPass1')
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {RefreshToken.for_user(other).access_token}')
        response = client.get(self.url)
        assert response.status_code == 403

    def test_list_members_returns_member_list(self):
        other = User.objects.create_user(
            email='alex@example.com', name='Alex', password='StrongPass1',
            avatar_color='#10b981',
        )
        ProjectMember.objects.create(project=self.project, user=other)
        response = self.client.get(self.url)
        assert response.status_code == 200
        assert len(response.data['members']) == 2
        names = [m['name'] for m in response.data['members']]
        assert 'Imane' in names
        assert 'Alex' in names
        member = response.data['members'][0]
        assert 'id' in member
        assert 'name' in member
        assert 'avatar_color' in member
        assert 'joined_at' in member
