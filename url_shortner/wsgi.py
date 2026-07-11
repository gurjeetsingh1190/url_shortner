"""
WSGI config for url_shortner project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'url_shortner.settings')

application = get_wsgi_application()
app = application

# Run database migrations automatically in Vercel temp space on start
if 'VERCEL' in os.environ:
    from django.core.management import call_command
    try:
        call_command('migrate', no_input=True)
    except Exception as e:
        print(f"Error running auto-migration: {e}")
