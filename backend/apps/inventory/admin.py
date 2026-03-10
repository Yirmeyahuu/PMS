from django.contrib import admin
from .models import Category, Product, StockMovement


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display  = ['name', 'clinic', 'is_active', 'created_at']
    list_filter   = ['is_active', 'clinic']
    search_fields = ['name']


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display  = [
        'name', 'sku', 'item_type', 'category',
        'selling_price', 'quantity_in_stock', 'unit',
        'is_active', 'is_archived',
    ]
    list_filter   = ['item_type', 'is_active', 'is_archived', 'clinic']
    search_fields = ['name', 'sku', 'barcode']


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display  = [
        'product', 'movement_type', 'quantity',
        'quantity_before', 'quantity_after', 'performed_by', 'created_at',
    ]
    list_filter   = ['movement_type']
    search_fields = ['product__name', 'reference']
    readonly_fields = [
        'product', 'movement_type', 'quantity',
        'quantity_before', 'quantity_after', 'performed_by', 'created_at',
    ]