import os

from celery import Celery

# set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.local")

app = Celery("kex")

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Load task modules from all registered Django app configs.
app.autodiscover_tasks()

# ── Celery Beat Schedule ──
# Periodic tasks that run automatically.
app.conf.beat_schedule = {
    "expire-stale-bookings-every-30min": {
        "task": "booking.expire_stale_bookings",
        "schedule": 30 * 60,  # Every 30 minutes (in seconds)
    },
}
