from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Contact
from .serializers import ContactSerializer, ContactListSerializer

class ContactViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing professional contacts
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['contact_type', 'is_active', 'is_preferred']
    search_fields = ['first_name', 'last_name', 'organization_name', 'specialty', 'email', 'phone', 'contact_number']
    ordering_fields = ['created_at', 'first_name', 'last_name', 'contact_type']
    ordering = ['-created_at']

    def get_queryset(self):
        """Filter contacts by user's clinic"""
        if hasattr(self.request.user, 'clinic'):
            return Contact.objects.filter(clinic=self.request.user.clinic)
        return Contact.objects.none()

    def get_serializer_class(self):
        """Use lightweight serializer for list view"""
        if self.action == 'list':
            return ContactListSerializer
        return ContactSerializer

    def perform_create(self, serializer):
        """Automatically assign clinic from authenticated user"""
        serializer.save(clinic=self.request.user.clinic)

    @action(detail=True, methods=['post'])
    def toggle_preferred(self, request, pk=None):
        """Toggle preferred status of a contact"""
        contact = self.get_object()
        contact.is_preferred = not contact.is_preferred
        contact.save()
        
        serializer = self.get_serializer(contact)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle active status of a contact"""
        contact = self.get_object()
        contact.is_active = not contact.is_active
        contact.save()
        
        serializer = self.get_serializer(contact)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get contact statistics"""
        queryset = self.get_queryset()
        
        stats = {
            'total': queryset.count(),
            'active': queryset.filter(is_active=True).count(),
            'inactive': queryset.filter(is_active=False).count(),
            'by_type': {}
        }
        
        # Count by contact type
        for choice_key, choice_label in Contact.CONTACT_TYPE_CHOICES:
            count = queryset.filter(contact_type=choice_key).count()
            stats['by_type'][choice_key] = {
                'label': choice_label,
                'count': count
            }
        
        return Response(stats)