from django.apps import AppConfig


class MessagesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name               = 'apps.messages'
    label              = 'clinic_messages'    # avoids collision with Django's built-in 'messages'
    verbose_name       = 'Messages'