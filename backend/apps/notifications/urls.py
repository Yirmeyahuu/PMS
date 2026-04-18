from rest_framework.routers import DefaultRouter
from .views import (
    NotificationViewSet, EmailLogViewSet, SMSLogViewSet,
    ClinicCommunicationSettingsViewSet, CommunicationLogViewSet,
)

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'email-logs',    EmailLogViewSet,    basename='email-log')
router.register(r'sms-logs',      SMSLogViewSet,      basename='sms-log')
router.register(r'communication-settings', ClinicCommunicationSettingsViewSet, basename='communication-settings')
router.register(r'communication-logs',     CommunicationLogViewSet,           basename='communication-log')

urlpatterns = router.urls