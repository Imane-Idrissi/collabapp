from rest_framework import serializers


class CreateProjectSerializer(serializers.Serializer):
    name = serializers.CharField(required=True, allow_blank=False)
    description = serializers.CharField(required=False, default='', allow_blank=True)


class UpdateProjectSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=False)
    description = serializers.CharField(required=False, allow_blank=True)


class ColumnSerializer(serializers.Serializer):
    name = serializers.CharField(required=True, allow_blank=False)


class CreateTaskSerializer(serializers.Serializer):
    name = serializers.CharField(required=True, allow_blank=False)
    column_id = serializers.IntegerField(required=True)
    description = serializers.CharField(required=False, default='', allow_blank=True)
    priority = serializers.CharField(required=False, default='', allow_blank=True)


class UpdateTaskSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=False)
    description = serializers.CharField(required=False, allow_blank=True)
    priority = serializers.CharField(required=False, allow_blank=True)
    column_id = serializers.IntegerField(required=False)
    position = serializers.IntegerField(required=False)
    version = serializers.IntegerField(required=False)
