from .base import *

# SECURITY WARNING: keep the secret key used in production secret!
# Normalize empty string: Compose ${VAR:-default} does not substitute when VAR is set-but-empty in .env.
_secret = (os.getenv('SECRET_KEY') or '').strip()
SECRET_KEY = _secret if _secret else 'change-me-before-deploy'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG') == 'True'

# SECURITY SETTINGS
ACCESS_TOKEN_EXPIRE_TIME = os.getenv("ACCESS_TOKEN_EXPIRE_TIME", 3600)
REFRESH_ACCESS_TOKEN_EXPIRE_TIME = os.getenv(
    "REFRESH_ACCESS_TOKEN_EXPIRE_TIME", 3600 * 24
)
ACCESS_TOKEN_SECRET = os.getenv("ACCESS_TOKEN_SECRET", "access-token-secret")
REFRESH_TOKEN_SECRET = os.getenv("REFRESH_TOKEN_SECRET", "refresh-token-secret")

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME'),
        'USER': os.getenv('DB_USER'),
        'PASSWORD': os.getenv('DB_PASSWORD'),
        'HOST': os.getenv('DB_HOST'),
        'PORT': os.getenv('DB_PORT'),
    }
}
