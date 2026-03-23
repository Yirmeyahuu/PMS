from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.core.mail import EmailMultiAlternatives
from django.conf import settings

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

    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """Send an email to the contact"""
        contact = self.get_object()
        
        if not contact.email:
            return Response(
                {'error': 'Contact does not have an email address'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        message = request.data.get('message', '')
        if not message:
            return Response(
                {'error': 'Message is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(message) > 3000:
            return Response(
                {'error': 'Message cannot exceed 3000 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get clinic info for email header
        clinic = request.user.clinic
        clinic_name = clinic.name if clinic else 'Our Clinic'
        clinic_address = clinic.address if clinic else ''
        if clinic and clinic.city:
            clinic_address = f"{clinic.address}, {clinic.city}, {clinic.province}" if clinic.address else f"{clinic.city}, {clinic.province}"
        
        # Build email content
        subject = f"Message from {clinic_name}"
        
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); 
                          color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .clinic-name {{ font-size: 24px; font-weight: bold; margin: 0; }}
                .clinic-address {{ font-size: 14px; opacity: 0.9; margin-top: 5px; }}
                .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
                .message-box {{ background: white; padding: 20px; border-radius: 8px; 
                               margin: 20px 0; border-left: 4px solid #0ea5e9; }}
                .footer {{ text-align: center; color: #6c757d; font-size: 12px; 
                         margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; }}
                .signature {{ margin-top: 20px; font-style: italic; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 class="clinic-name">{clinic_name}</h1>
                    <p class="clinic-address">{clinic_address}</p>
                </div>
                <div class="content">
                    <div class="message-box">
                        {message.replace(chr(10), '<br>')}
                    </div>
                    <div class="signature">
                        <p>Yours Truly,</p>
                        <p><strong>{clinic_name}</strong></p>
                    </div>
                </div>
                <div class="footer">
                    <p>This email was sent from {clinic_name}</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_message = f"""
{message}

Yours Truly,
{clinic_name}
{clinic_address}
        """
        
        try:
            mail = EmailMultiAlternatives(
                subject=subject,
                body=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else settings.DEFAULT_EMAIL,
                to=[contact.email],
            )
            mail.attach_alternative(html_message, 'text/html')
            mail.send(fail_silently=False)
            
            return Response({'success': True, 'message': 'Email sent successfully'})
        except Exception as e:
            return Response(
                {'error': f'Failed to send email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )