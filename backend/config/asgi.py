"""
ASGI config for Kex project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/dev/howto/deployment/asgi/

"""
import os
import sys
from pathlib import Path

import django
from django.core.asgi import get_asgi_application

# This allows easy placement of apps within the interior kex directory.
ROOT_DIR = Path(__file__).resolve(strict=True).parent.parent
sys.path.append(str(ROOT_DIR / "kex"))

# If DJANGO_SETTINGS_MODULE is unset, default to the local settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")
django.setup()

from channels.auth import AuthMiddlewareStack  # noqa
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa
from kex.chat.routing import websocket_urlpatterns  # noqa

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
