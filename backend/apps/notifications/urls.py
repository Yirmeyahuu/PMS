from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, EmailLogViewSet, SMSLogViewSet

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'email-logs',    EmailLogViewSet,    basename='email-log')
router.register(r'sms-logs',      SMSLogViewSet,      basename='sms-log')

urlpatterns = router.urls