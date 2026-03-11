from django.contrib import admin

# Register your models here.
from django.contrib import admin
from .models import Conversation, ConversationParticipant, Message


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display  = ['id', 'clinic', 'updated_at']
    list_filter   = ['clinic']
    raw_id_fields = ['clinic']


@admin.register(ConversationParticipant)
class ConversationParticipantAdmin(admin.ModelAdmin):
    list_display  = ['conversation', 'user', 'last_read_at']
    raw_id_fields = ['conversation', 'user']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display  = ['id', 'conversation', 'sender', 'created_at', 'is_deleted']
    list_filter   = ['is_deleted']
    raw_id_fields = ['conversation', 'sender']
    search_fields = ['body', 'sender__email']