from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.notifications'

    def ready(self):
        # Connect signals after all apps are loaded
        from apps.notifications.signals import connect_signals
        connect_signals()