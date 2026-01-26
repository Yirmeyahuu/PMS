from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import Notification, EmailLog, SMSLog
from .serializers import NotificationSerializer, EmailLogSerializer, SMSLogSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """CRUD operations for notifications"""
    
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['notification_type', 'is_read']
    ordering_fields = ['created_at']
    
    def get_queryset(self):
        # Users can only see their own notifications
        return self.queryset.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        return Response({'status': 'notification marked as read'})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({'status': 'all notifications marked as read'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})


class EmailLogViewSet(viewsets.ReadOnlyModelViewSet):
    """View email logs"""
    
    queryset = EmailLog.objects.all()
    serializer_class = EmailLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['is_sent', 'recipient_email']
    ordering_fields = ['created_at', 'sent_at']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        # Filter to clinic-related emails only
        return self.queryset.none()  # Implement clinic-specific filtering if needed


class SMSLogViewSet(viewsets.ReadOnlyModelViewSet):
    """View SMS logs"""
    
    queryset = SMSLog.objects.all()
    serializer_class = SMSLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['is_sent', 'provider']
    ordering_fields = ['created_at', 'sent_at']
    
    def get_queryset(self):
        user = self.request.user
        if user.is_admin:
            return self.queryset
        # Filter to clinic-related SMS only
        return self.queryset.none()  # Implement clinic-specific filtering if needed