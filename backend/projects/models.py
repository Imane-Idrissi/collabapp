from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

from projects.encryption import decrypt_api_key


class Project(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_projects')
    extraction_running = models.BooleanField(default=False)
    encrypted_gemini_key = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def has_gemini_key(self):
        return bool(self.encrypted_gemini_key)

    @property
    def masked_gemini_key(self):
        if not self.encrypted_gemini_key:
            return ''
        try:
            plaintext = decrypt_api_key(self.encrypted_gemini_key)
            return f'····{plaintext[-4:]}' if len(plaintext) >= 4 else '····'
        except Exception:
            return '····'

    def __str__(self):
        return self.name


class ProjectMember(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='project_memberships')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('project', 'user')

    def __str__(self):
        return f"{self.user} in {self.project}"


class Column(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='columns')
    name = models.CharField(max_length=255)
    position = models.IntegerField()

    def __str__(self):
        return f"{self.name} (pos {self.position})"


class Task(models.Model):
    column = models.ForeignKey(Column, on_delete=models.CASCADE, related_name='tasks')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    priority = models.CharField(max_length=20, blank=True, default='')
    position = models.IntegerField()
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_tasks')
    is_ai_generated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    version = models.IntegerField(default=1)

    class Meta:
        indexes = [
            models.Index(fields=['column'], name='idx_task_column'),
        ]

    def __str__(self):
        return self.name


class TaskAssignee(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='assignees')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='task_assignments')

    class Meta:
        unique_together = ('task', 'user')

    def __str__(self):
        return f"{self.user} assigned to {self.task}"


def _default_invite_expiry():
    return timezone.now() + timedelta(days=7)


class InviteToken(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='invite_tokens')
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=_default_invite_expiry)

    def __str__(self):
        return f"Invite for {self.project}"
