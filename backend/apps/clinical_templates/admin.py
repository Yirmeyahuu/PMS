from django.contrib import admin
from .models import ClinicalTemplate, ClinicalNote, ClinicalNoteAuditLog


@admin.register(ClinicalTemplate)
class ClinicalTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'clinic', 'category', 'version', 'is_active', 'is_archived', 'created_at']
    list_filter = ['category', 'is_active', 'is_archived', 'clinic']
    search_fields = ['name', 'description']
    readonly_fields = ['version', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(ClinicalNote)
class ClinicalNoteAdmin(admin.ModelAdmin):
    list_display = ['patient', 'practitioner', 'date', 'is_signed', 'is_draft', 'created_at']
    list_filter = ['is_signed', 'is_draft', 'date', 'clinic']
    search_fields = ['patient__first_name', 'patient__last_name']
    readonly_fields = ['encrypted_content', 'signed_at', 'created_at', 'updated_at']
    ordering = ['-date', '-created_at']
    
    def has_change_permission(self, request, obj=None):
        # Prevent editing signed notes
        if obj and obj.is_signed:
            return False
        return super().has_change_permission(request, obj)


@admin.register(ClinicalNoteAuditLog)
class ClinicalNoteAuditLogAdmin(admin.ModelAdmin):
    list_display = ['clinical_note', 'user', 'action', 'created_at', 'ip_address']
    list_filter = ['action', 'created_at']
    search_fields = ['clinical_note__patient__first_name', 'clinical_note__patient__last_name']
    
    # ✅ FIX: Specify fields explicitly instead of '__all__'
    readonly_fields = [
        'clinical_note', 'user', 'action', 'ip_address', 
        'user_agent', 'changes', 'created_at'
    ]
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False