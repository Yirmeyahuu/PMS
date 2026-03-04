from django.apps import AppConfig


class ClinicServicesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.clinics.services'
    label = 'clinic_services'   # ← unique label avoids clash with billing's 'services'