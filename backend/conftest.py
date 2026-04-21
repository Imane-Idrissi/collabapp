import pytest
from django.test import override_settings

REST_FRAMEWORK_TEST = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_THROTTLE_CLASSES': [],
    'DEFAULT_THROTTLE_RATES': {},
}


@pytest.fixture(autouse=True)
def disable_throttling(settings):
    settings.REST_FRAMEWORK = REST_FRAMEWORK_TEST
