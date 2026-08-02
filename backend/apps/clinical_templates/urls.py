from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClinicalTemplateViewSet, ClinicalNoteViewSet, GlobalClinicalNoteAuditViewSet

router = DefaultRouter()
router.register(r'templates', ClinicalTemplateViewSet, basename='clinical-templates')
router.register(r'notes', ClinicalNoteViewSet, basename='clinical-notes-v2')
router.register(r'global-audit', GlobalClinicalNoteAuditViewSet, basename='global-audit')

urlpatterns = [
    path('', include(router.urls)),
]