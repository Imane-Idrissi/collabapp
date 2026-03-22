from rest_framework import serializers


class AttachmentSerializer(serializers.Serializer):
    url = serializers.URLField(required=True)
    name = serializers.CharField(required=True, allow_blank=False)
    size = serializers.IntegerField(required=True)
    type = serializers.CharField(required=True, allow_blank=False)


class SendMessageSerializer(serializers.Serializer):
    text = serializers.CharField(required=False, allow_blank=True, default='')
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
    filename = serializers.CharField(required=True, allow_blank=False)
    content_type = serializers.CharField(required=True, allow_blank=False)
    size = serializers.IntegerField(required=True)

    MAX_FILE_SIZE = 10485760  # 10MB

    def validate_size(self, value):
        if value > self.MAX_FILE_SIZE:
            raise serializers.ValidationError('File size exceeds 10MB limit.')
        return value
