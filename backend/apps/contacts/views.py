from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from .models import Contact
from .serializers import ContactSerializer, ContactListSerializer


class ContactViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['contact_type', 'is_active', 'is_preferred']
    search_fields      = [
        'first_name', 'last_name', 'organization_name',
        'specialty', 'email', 'phone', 'contact_number',
    ]
    ordering_fields = ['created_at', 'first_name', 'last_name', 'contact_type']
    ordering        = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'clinic') and user.clinic:
            return Contact.objects.filter(clinic=user.clinic)
        return Contact.objects.none()

    def get_serializer_class(self):
        if self.action == 'list':
            return ContactListSerializer
        return ContactSerializer

    def perform_create(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    def perform_update(self, serializer):
        serializer.save(clinic=self.request.user.clinic)

    @action(detail=True, methods=['post'])
    def toggle_preferred(self, request, pk=None):
        contact = self.get_object()
        contact.is_preferred = not contact.is_preferred
        contact.save()
        return Response(self.get_serializer(contact).data)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        contact = self.get_object()
        contact.is_active = not contact.is_active
        contact.save()
        return Response(self.get_serializer(contact).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = self.get_queryset()
        data = {
            'total':    qs.count(),
            'active':   qs.filter(is_active=True).count(),
            'inactive': qs.filter(is_active=False).count(),
            'by_type':  {},
        }
        for key, label in Contact.CONTACT_TYPE_CHOICES:
            data['by_type'][key] = {
                'label': label,
                'count': qs.filter(contact_type=key).count(),
            }
        return Response(data)