"""
WSGI config for hcmue_be project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from django.core.wsgi import get_wsgi_application

# Match manage.py: same settings module (DB, SECRET_KEY, JWT) when served by Gunicorn.
load_dotenv(Path(__file__).resolve().parent.parent / '.env')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings.deployment')

application = get_wsgi_application()
