from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class UsersConfig(AppConfig):
    name = "kex.users"
    label = "users"   
    verbose_name = _("User Accounts")

    def ready(self):
        try:
            import kex.users.signals  # noqa F401
        except ImportError:
            pass
