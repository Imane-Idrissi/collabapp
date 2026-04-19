from django.urls import path
from accounts.views import (
    CookieTokenRefreshView,
    ForgotPasswordView,
    LoginView,
    LogoutView,
    MeView,
    ResetPasswordView,
    SendVerificationEmailView,
    SignupView,
    VerifyEmailView,
)

urlpatterns = [
    path('signup', SignupView.as_view(), name='signup'),
    path('login', LoginView.as_view(), name='login'),
    path('logout', LogoutView.as_view(), name='logout'),
    path('me', MeView.as_view(), name='me'),
    path('token/refresh', CookieTokenRefreshView.as_view(), name='token-refresh'),
    path('verify-email', VerifyEmailView.as_view(), name='verify-email'),
    path('send-verification-email', SendVerificationEmailView.as_view(), name='send-verification-email'),
    path('forgot-password', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password', ResetPasswordView.as_view(), name='reset-password'),
]
