from django.contrib import admin
from .models import Notification, NotificationRead, EmailLog, SMSLog


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ['id', 'clinic', 'notification_type', 'title', 'clinic_branch', 'created_at']
    list_filter   = ['notification_type', 'clinic', 'created_at']
    search_fields = ['title', 'message']
    readonly_fields = ['created_at']


@admin.register(NotificationRead)
class NotificationReadAdmin(admin.ModelAdmin):
    list_display  = ['id', 'notification', 'user', 'read_at']
    list_filter   = ['read_at']
    raw_id_fields = ['notification', 'user']


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'recipient_email', 'subject', 'is_sent', 'sent_at']
    list_filter  = ['is_sent']


@admin.register(SMSLog)
class SMSLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'recipient_phone', 'is_sent', 'provider', 'sent_at']
    list_filter  = ['is_sent', 'provider']