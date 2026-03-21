from rest_framework import serializers


class CreateProjectSerializer(serializers.Serializer):
    name = serializers.CharField(required=True, allow_blank=False)
    description = serializers.CharField(required=False, default='', allow_blank=True)


class UpdateProjectSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=False)
    description = serializers.CharField(required=False, allow_blank=True)


class ColumnSerializer(serializers.Serializer):
    name = serializers.CharField(required=True, allow_blank=False)
