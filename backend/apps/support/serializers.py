from rest_framework import serializers
from .models import UserFeedback, UserFeedbackAttachment, UserFeedbackComment, UserFeedbackStatusHistory


class UserFeedbackAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserFeedbackAttachment
        fields = ['id', 'feedback', 'file', 'original_filename', 'mime_type', 'file_size', 'created_at']
        read_only_fields = ['id', 'feedback', 'created_at']

class UserFeedbackCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = UserFeedbackComment
        fields = ['id', 'author', 'author_name', 'comment', 'is_internal', 'created_at']
        read_only_fields = ['id', 'author', 'author_name', 'created_at']

    def get_author_name(self, obj):
        return obj.author.get_full_name()

class UserFeedbackStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = UserFeedbackStatusHistory
        fields = ['id', 'changed_by', 'changed_by_name', 'previous_status', 'new_status', 'comment', 'created_at']
        read_only_fields = ['id', 'changed_by', 'changed_by_name', 'created_at']

    def get_changed_by_name(self, obj):
        return obj.changed_by.get_full_name() if obj.changed_by else "System"

class UserFeedbackSerializer(serializers.ModelSerializer):
    attachments = UserFeedbackAttachmentSerializer(many=True, read_only=True)
    comments = serializers.SerializerMethodField()
    status_history = UserFeedbackStatusHistorySerializer(many=True, read_only=True)
    
    class Meta:
        model = UserFeedback
        fields = [
            'id', 'type', 'module', 'priority', 'status', 'title', 'description', 
            'page_url', 'browser', 'os', 'user_agent', 'app_version',
            'created_at', 'updated_at', 'resolved_at', 'closed_at',
            'attachments', 'comments', 'status_history'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at', 'resolved_at', 'closed_at']

    def get_comments(self, obj):
        request = self.context.get('request')
        comments = obj.comments.all()
        if request and request.user:
            effective = request.user.get_effective_roles()
            # If not admin, only show non-internal comments
            if 'OWNER' not in effective and 'MANAGER' not in effective:
                comments = comments.filter(is_internal=False)
        return UserFeedbackCommentSerializer(comments, many=True).data

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user
        
        # Determine clinic context (use the primary clinic associated with the user, if available)
        clinic = getattr(user, 'clinic', None)
        
        roles = user.get_effective_roles()
        role = roles[0] if roles else 'UNKNOWN'
        
        feedback = UserFeedback.objects.create(
            submitted_by=user,
            clinic=clinic,
            user_role=role,
            **validated_data
        )
        return feedback
