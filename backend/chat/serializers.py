from rest_framework import serializers


class SendMessageSerializer(serializers.Serializer):
    text = serializers.CharField(required=True, allow_blank=False)
