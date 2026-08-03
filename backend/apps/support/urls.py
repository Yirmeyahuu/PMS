from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserFeedbackViewSet

router = DefaultRouter()
router.register(r'feedback', UserFeedbackViewSet, basename='feedback')

urlpatterns = [
    path('', include(router.urls)),
]
