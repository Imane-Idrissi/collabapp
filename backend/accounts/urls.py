from django.urls import path
from accounts.views import LoginView, SignupView, VerifyEmailView

urlpatterns = [
    path('signup', SignupView.as_view(), name='signup'),
    path('login', LoginView.as_view(), name='login'),
    path('verify-email', VerifyEmailView.as_view(), name='verify-email'),
]
