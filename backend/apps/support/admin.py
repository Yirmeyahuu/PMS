from django.contrib import admin
from django.utils.html import format_html
from .models import UserFeedback, UserFeedbackAttachment, UserFeedbackComment, UserFeedbackStatusHistory


class UserFeedbackAttachmentInline(admin.TabularInline):
    model = UserFeedbackAttachment
    extra = 0
    readonly_fields = ['original_filename', 'mime_type', 'file_size', 'uploaded_by', 'created_at', 'file_preview']
    fields = ['file_preview', 'original_filename', 'mime_type', 'file_size', 'uploaded_by', 'created_at']
    can_delete = False

    def file_preview(self, obj):
        if obj.file and obj.mime_type.startswith('image/'):
            return format_html(
                '<a href="{0}" target="_blank"><img src="{0}" width="150" height="150" style="object-fit: contain;" /></a>',
                obj.file.url
            )
        return "No Preview Available"
    file_preview.short_description = 'Preview'


class UserFeedbackCommentInline(admin.TabularInline):
    model = UserFeedbackComment
    extra = 1
    fields = ['author', 'comment', 'is_internal', 'created_at']
    readonly_fields = ['created_at']


class UserFeedbackStatusHistoryInline(admin.TabularInline):
    model = UserFeedbackStatusHistory
    extra = 0
    readonly_fields = ['changed_by', 'previous_status', 'new_status', 'comment', 'created_at']
    can_delete = False


@admin.register(UserFeedback)
class UserFeedbackAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'type', 'title', 'submitted_by_display', 'clinic', 
        'module', 'priority', 'status', 'assigned_developer', 
        'created_at', 'updated_at'
    )
    list_filter = (
        'type', 'module', 'priority', 'status', 
        'clinic', 'user_role', 'assigned_developer', 'created_at'
    )
    search_fields = (
        'id', 'title', 'description', 
        'submitted_by__email', 'submitted_by__first_name', 'submitted_by__last_name',
        'clinic__name'
    )
    readonly_fields = (
        'submitted_by', 'clinic', 'user_role', 'type', 'module', 'priority',
        'title', 'description', 'duplicate_of', 
        'page_url', 'browser', 'os', 'user_agent', 'app_version',
        'created_at', 'updated_at', 'resolved_at', 'closed_at'
    )
    
    inlines = [
        UserFeedbackAttachmentInline,
        UserFeedbackCommentInline,
        UserFeedbackStatusHistoryInline
    ]

    fieldsets = (
        ('REPORT INFORMATION', {
            'fields': (
                'type', 'title', 'description', 'module', 'priority', 'status'
            )
        }),
        ('DEVELOPER ASSIGNMENT & STATUS', {
            'fields': (
                'assigned_developer', 'duplicate_of', 'resolved_at', 'closed_at'
            )
        }),
        ('SUBMITTED BY', {
            'fields': (
                'submitted_by', 'user_role', 'clinic', 'created_at'
            )
        }),
        ('TECHNICAL CONTEXT', {
            'fields': (
                'browser', 'os', 'page_url', 'user_agent', 'app_version'
            )
        }),
    )

    def submitted_by_display(self, obj):
        return obj.submitted_by.get_full_name()
    submitted_by_display.short_description = 'User'


@admin.register(UserFeedbackAttachment)
class UserFeedbackAttachmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'feedback', 'original_filename', 'mime_type', 'uploaded_by', 'created_at')
    search_fields = ('original_filename', 'feedback__title', 'uploaded_by__email')
    list_filter = ('mime_type', 'created_at')


@admin.register(UserFeedbackComment)
class UserFeedbackCommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'feedback', 'author', 'is_internal', 'created_at')
    search_fields = ('comment', 'feedback__title', 'author__email')
    list_filter = ('is_internal', 'created_at')


@admin.register(UserFeedbackStatusHistory)
class UserFeedbackStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'feedback', 'previous_status', 'new_status', 'changed_by', 'created_at')
    search_fields = ('feedback__title', 'changed_by__email')
    list_filter = ('previous_status', 'new_status', 'created_at')
