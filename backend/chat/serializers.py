import os

from django.conf import settings
from rest_framework import serializers

BLOCKED_EXTENSIONS = {'.html', '.htm', '.svg', '.js', '.jsx', '.exe', '.sh', '.bat', '.cmd', '.msi', '.php'}
ALLOWED_EXTENSIONS = {
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.csv', '.md', '.json', '.xml',
    '.zip', '.tar', '.gz',
    '.mp4', '.mov', '.mp3', '.wav',
}


class AttachmentSerializer(serializers.Serializer):
    url = serializers.CharField(required=True)
    name = serializers.CharField(required=True, allow_blank=False)
    size = serializers.IntegerField(required=True)
    type = serializers.CharField(required=True, allow_blank=False)

    def validate_url(self, value):
        if not value.startswith(settings.MEDIA_URL):
            raise serializers.ValidationError('Attachment URL must point to uploaded files.')
        return value


class SendMessageSerializer(serializers.Serializer):
    text = serializers.CharField(required=False, allow_blank=True, default='', max_length=10000)
    attachments = serializers.ListField(
        child=AttachmentSerializer(),
        required=False,
        default=list,
    )

    def validate(self, data):
        if not data.get('text') and not data.get('attachments'):
            raise serializers.ValidationError({'text': ['This field is required.']})
        return data


class UploadSerializer(serializers.Serializer):
    file = serializers.FileField(required=True)

    MAX_FILE_SIZE = 10485760  # 10MB

    def validate_file(self, value):
        if value.size > self.MAX_FILE_SIZE:
            raise serializers.ValidationError('File size exceeds 10MB limit.')

        ext = os.path.splitext(value.name)[1].lower()
        if not ext:
            raise serializers.ValidationError('File must have an extension.')
        if ext in BLOCKED_EXTENSIONS:
            raise serializers.ValidationError(f'File type "{ext}" is not allowed.')
        if ext not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(f'File type "{ext}" is not allowed.')

        return value
