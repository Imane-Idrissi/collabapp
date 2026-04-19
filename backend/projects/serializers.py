from rest_framework import serializers


class CreateProjectSerializer(serializers.Serializer):
    name = serializers.CharField(required=True, allow_blank=False, max_length=255)
    description = serializers.CharField(required=False, default='', allow_blank=True, max_length=5000)


class UpdateProjectSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=False, max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, max_length=5000)


class ColumnSerializer(serializers.Serializer):
    name = serializers.CharField(required=True, allow_blank=False, max_length=255)


class CreateTaskSerializer(serializers.Serializer):
    name = serializers.CharField(required=True, allow_blank=False, max_length=500)
    column_id = serializers.IntegerField(required=True)
    description = serializers.CharField(required=False, default='', allow_blank=True, max_length=5000)
    priority = serializers.CharField(required=False, default='', allow_blank=True)


class UpdateTaskSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_blank=False, max_length=500)
    description = serializers.CharField(required=False, allow_blank=True, max_length=5000)
    priority = serializers.CharField(required=False, allow_blank=True)
    column_id = serializers.IntegerField(required=False)
    position = serializers.IntegerField(required=False)
    version = serializers.IntegerField(required=False)


class BatchTaskItemSerializer(serializers.Serializer):
    name = serializers.CharField(required=True, allow_blank=False, max_length=500)
    column_id = serializers.IntegerField(required=True)
    description = serializers.CharField(required=False, default='', allow_blank=True, max_length=5000)
    priority = serializers.ChoiceField(
        required=False, default='', choices=['', 'low', 'medium', 'high'],
    )


class BatchCreateTasksSerializer(serializers.Serializer):
    tasks = BatchTaskItemSerializer(many=True, min_length=1, max_length=50)
