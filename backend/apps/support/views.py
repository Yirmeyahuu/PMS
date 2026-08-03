from rest_framework import viewsets, mixins, status, parsers
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.utils import timezone
import mimetypes
import os

from apps.common.permissions import HasFeaturePermission
from .models import UserFeedback, UserFeedbackAttachment
from .serializers import UserFeedbackSerializer, UserFeedbackAttachmentSerializer
from .permissions import IsOwnerOrAdmin

# Maximum 5MB per file
MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024
# Maximum 5 attachments per report
MAX_ATTACHMENTS = 5
# Allowed MIME types
ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp']

class UserFeedbackViewSet(viewsets.ModelViewSet):
    """
    API for creating and viewing Feedback/Reports.
    Uses IsOwnerOrAdmin for object-level security.
    """
    serializer_class = UserFeedbackSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    
    def get_queryset(self):
        user = self.request.user
        effective = user.get_effective_roles()
        
        # Admins and Managers see everything
        if 'OWNER' in effective or 'MANAGER' in effective:
            return UserFeedback.objects.all().prefetch_related('attachments', 'comments', 'status_history')
            
        # Normal users only see their own
        return UserFeedback.objects.filter(submitted_by=user).prefetch_related('attachments', 'comments', 'status_history')
        
    def perform_update(self, serializer):
        # Capture old status before saving
        old_instance = self.get_object()
        old_status = old_instance.status
        
        instance = serializer.save()
        
        # If status changed, log to history
        if old_status != instance.status:
            from .models import UserFeedbackStatusHistory
            UserFeedbackStatusHistory.objects.create(
                feedback=instance,
                previous_status=old_status,
                new_status=instance.status,
                changed_by=self.request.user,
                comment="Status updated via API."
            )
            
    @action(detail=True, methods=['POST'], parser_classes=[parsers.MultiPartParser])
    def upload_attachment(self, request, pk=None):
        feedback = self.get_object()
        
        # Check attachment limit
        if feedback.attachments.count() >= MAX_ATTACHMENTS:
            return Response(
                {"detail": f"Maximum of {MAX_ATTACHMENTS} attachments allowed per report."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        file_obj = request.data.get('file')
        if not file_obj:
            return Response({"detail": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)
            
        # File size validation
        if file_obj.size > MAX_ATTACHMENT_SIZE:
            return Response(
                {"detail": f"File size exceeds {MAX_ATTACHMENT_SIZE / 1024 / 1024}MB limit."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # MIME validation
        mime_type, _ = mimetypes.guess_type(file_obj.name)
        
        # Fallback to content_type if mimetypes can't guess
        if not mime_type:
            mime_type = file_obj.content_type
            
        if mime_type not in ALLOWED_MIMES:
            return Response(
                {"detail": "Unsupported file type. Only JPG, PNG, and WEBP are allowed."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Create attachment securely
        attachment = UserFeedbackAttachment.objects.create(
            feedback=feedback,
            file=file_obj,
            original_filename=file_obj.name,
            mime_type=mime_type,
            file_size=file_obj.size,
            uploaded_by=request.user
        )
        
        serializer = UserFeedbackAttachmentSerializer(attachment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['GET'], url_path='attachments/(?P<attachment_id>[^/.]+)')
    def download_attachment(self, request, pk=None, attachment_id=None):
        feedback = self.get_object()
        
        from django.shortcuts import get_object_or_404
        from django.http import FileResponse
        
        attachment = get_object_or_404(UserFeedbackAttachment, pk=attachment_id, feedback=feedback)
        
        if not attachment.file:
            return Response({"detail": "File not found."}, status=status.HTTP_404_NOT_FOUND)
            
        return FileResponse(attachment.file, as_attachment=False, filename=attachment.original_filename)
