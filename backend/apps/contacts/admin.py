from django.contrib import admin
from .models import Contact


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display  = ['contact_number', 'full_name', 'contact_type', 'phone', 'city', 'is_active', 'is_preferred']
    list_filter   = ['contact_type', 'is_active', 'is_preferred', 'clinic']
    search_fields = ['first_name', 'last_name', 'organization_name', 'email', 'phone', 'contact_number']
    readonly_fields = ['contact_number', 'created_at', 'updated_at']
    ordering = ['-created_at']