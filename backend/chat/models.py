from django.conf import settings
from django.db import models


class Message(models.Model):
    project = models.ForeignKey('projects.Project', on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='messages')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['project', '-created_at'], name='idx_message_project_created'),
        ]

    def __str__(self):
        return f"Message by {self.sender} in {self.project}"


class Attachment(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='attachments')
    url = models.URLField()
    name = models.CharField(max_length=255)
    size = models.BigIntegerField()
    type = models.CharField(max_length=100)

    def __str__(self):
        return self.name
