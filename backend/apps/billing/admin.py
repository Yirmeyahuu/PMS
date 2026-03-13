from django.contrib import admin
from .models import Invoice, InvoiceItem, InvoiceBatch, Payment, Service


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display  = ['invoice_number', 'patient', 'clinic', 'status', 'total_amount', 'balance_due', 'invoice_date']
    list_filter   = ['status', 'invoice_date', 'clinic']
    search_fields = ['invoice_number', 'patient__first_name', 'patient__last_name']
    readonly_fields = ['invoice_number', 'created_at', 'updated_at']


@admin.register(InvoiceItem)
class InvoiceItemAdmin(admin.ModelAdmin):
    list_display  = ['invoice', 'description', 'quantity', 'unit_price', 'total']
    list_filter   = ['invoice__status']
    search_fields = ['description', 'invoice__invoice_number']


@admin.register(InvoiceBatch)
class InvoiceBatchAdmin(admin.ModelAdmin):
    list_display  = ['batch_number', 'clinic', 'status', 'total_created', 'total_failed', 'total_invoiced_amount', 'created_at']
    list_filter   = ['status', 'created_at']
    readonly_fields = ['batch_number', 'created_at']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display  = ['receipt_number', 'invoice', 'amount', 'payment_method', 'payment_date']
    list_filter   = ['payment_method', 'payment_date']
    readonly_fields = ['receipt_number', 'created_at']


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display  = ['name', 'clinic', 'default_price', 'category', 'is_active']
    list_filter   = ['is_active', 'category']
    search_fields = ['name', 'service_code']