from django.urls import path
from chat.views import MessageListCreateView

urlpatterns = [
    path('', MessageListCreateView.as_view(), name='message-list-create'),
]
