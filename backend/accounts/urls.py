from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from accounts.views import ForgotPasswordView, LoginView, ResetPasswordView, SignupView, UpdateEmailView, VerifyEmailView

urlpatterns = [
    path('signup', SignupView.as_view(), name='signup'),
    path('login', LoginView.as_view(), name='login'),
    path('token/refresh', TokenRefreshView.as_view(), name='token-refresh'),
    path('verify-email', VerifyEmailView.as_view(), name='verify-email'),
    path('forgot-password', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password', ResetPasswordView.as_view(), name='reset-password'),
    path('update-email', UpdateEmailView.as_view(), name='update-email'),
]
