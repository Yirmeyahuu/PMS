from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClinicalTemplateViewSet, ClinicalNoteViewSet

router = DefaultRouter()
router.register(r'templates', ClinicalTemplateViewSet, basename='clinical-templates')
router.register(r'notes', ClinicalNoteViewSet, basename='clinical-notes-v2')

urlpatterns = [
    path('', include(router.urls)),
]