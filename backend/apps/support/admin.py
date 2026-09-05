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
        'created_at', 'updated_at', 'resolve_action_column'
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
        'created_at', 'updated_at', 'resolved_at', 'closed_at', 'resolved_by'
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
                'assigned_developer', 'duplicate_of', 'resolved_at', 'closed_at',
                'resolved_by', 'resolution_summary', 'resolution_root_cause', 'resolution_details'
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

    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom_urls = [
            path(
                '<int:feedback_id>/resolve/',
                self.admin_site.admin_view(self.resolve_feedback_view),
                name='support_userfeedback_resolve',
            ),
        ]
        return custom_urls + urls

    def resolve_action_column(self, obj):
        from django.urls import reverse
        if obj.status not in ['RESOLVED', 'CLOSED']:
            url = reverse('admin:support_userfeedback_resolve', args=[obj.id])
            return format_html(
                '<a class="button" style="background-color: #28a745; color: white;" href="{}">Resolve</a>',
                url
            )
        return format_html('<span style="color: green; font-weight: bold;">✔ {}</span>', obj.get_status_display())
    resolve_action_column.short_description = 'Actions'
    
    def resolve_feedback_view(self, request, feedback_id):
        from django.shortcuts import get_object_or_404, redirect
        from django.template.response import TemplateResponse
        from django.utils import timezone
        from django.db import transaction
        from apps.notifications.services.notification_service import create_notification
        from django.contrib import messages
        from django.urls import reverse
        
        obj = get_object_or_404(UserFeedback, pk=feedback_id)
        
        if request.method == 'POST':
            summary = request.POST.get('resolution_summary', '')
            root_cause = request.POST.get('resolution_root_cause', '')
            details = request.POST.get('resolution_details', '')
            
            with transaction.atomic():
                obj.status = 'RESOLVED'
                obj.resolution_summary = summary
                obj.resolution_root_cause = root_cause
                obj.resolution_details = details
                obj.resolved_at = timezone.now()
                obj.resolved_by = request.user
                obj.save()
                
                clinic = obj.clinic or obj.submitted_by.clinic
                if clinic:
                    create_notification(
                        clinic=clinic,
                        notification_type='FEEDBACK_RESOLVED',
                        title='Your feedback has been resolved',
                        message='Your reported issue has been investigated and fixed. Click to view the resolution details.',
                        recipient=obj.submitted_by,
                        related_feedback_id=obj.id
                    )
            
            messages.success(request, f'Feedback #{obj.id} marked as resolved and user notified.')
            return redirect(reverse('admin:support_userfeedback_changelist'))
            
        context = dict(
            self.admin_site.each_context(request),
            title=f"Resolve Feedback: {obj.title}",
            obj=obj,
            opts=self.model._meta,
        )
        return TemplateResponse(request, "admin/support/userfeedback/resolve.html", context)

    def save_model(self, request, obj, form, change):
        old_status = None
        if change:
            old_obj = UserFeedback.objects.get(pk=obj.pk)
            old_status = old_obj.status

        # If it's being marked as RESOLVED and it wasn't already RESOLVED
        if obj.status == 'RESOLVED' and old_status != 'RESOLVED':
            from django.utils import timezone
            from django.db import transaction
            from apps.notifications.services.notification_service import create_notification
            
            if not obj.resolved_at:
                obj.resolved_at = timezone.now()
            if not obj.resolved_by:
                obj.resolved_by = request.user
                
            with transaction.atomic():
                super().save_model(request, obj, form, change)
                
                # Determine the clinic context for the notification
                clinic = obj.clinic
                if not clinic and obj.submitted_by.clinic:
                    clinic = obj.submitted_by.clinic
                
                if clinic:
                    create_notification(
                        clinic=clinic,
                        notification_type='FEEDBACK_RESOLVED',
                        title='Your feedback has been resolved',
                        message='Your reported issue has been investigated and fixed. Click to view the resolution details.',
                        recipient=obj.submitted_by,
                        related_feedback_id=obj.id
                    )
        else:
            super().save_model(request, obj, form, change)


@admin.register(UserFeedbackAttachment)
class UserFeedbackAttachmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'feedback', 'file_preview_thumbnail', 'original_filename', 'mime_type', 'uploaded_by', 'created_at')
    search_fields = ('original_filename', 'feedback__title', 'uploaded_by__email')
    list_filter = ('mime_type', 'created_at')
    readonly_fields = ('file_preview',)

    def file_preview_thumbnail(self, obj):
        if obj.file and obj.mime_type.startswith('image/'):
            return format_html(
                '<a href="{0}" target="_blank"><img src="{0}" width="50" height="50" style="object-fit: cover; border-radius: 4px;" /></a>',
                obj.file.url
            )
        elif obj.file:
            return format_html('<a href="{0}" target="_blank">View File</a>', obj.file.url)
        return "No File"
    file_preview_thumbnail.short_description = 'Preview'
    
    def file_preview(self, obj):
        if obj.file and obj.mime_type.startswith('image/'):
            return format_html(
                '<a href="{0}" target="_blank"><img src="{0}" width="300" style="object-fit: contain;" /></a>',
                obj.file.url
            )
        elif obj.file:
            return format_html('<a href="{0}" target="_blank">Download File</a>', obj.file.url)
        return "No Preview"
    file_preview.short_description = 'Large Preview'


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
