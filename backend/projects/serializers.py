from rest_framework import serializers


class CreateProjectSerializer(serializers.Serializer):
    name = serializers.CharField(required=True, allow_blank=False)
    description = serializers.CharField(required=False, default='', allow_blank=True)
