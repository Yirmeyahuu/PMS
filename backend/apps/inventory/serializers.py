from rest_framework import serializers
from .models import Category, Product, StockMovement


class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model            = Category
        fields           = '__all__'
        read_only_fields = ['id', 'clinic', 'created_at', 'updated_at']


class ProductSerializer(serializers.ModelSerializer):
    category_name  = serializers.CharField(source='category.name',            read_only=True)
    created_by_name = serializers.SerializerMethodField()
    modified_by_name = serializers.SerializerMethodField()
    is_low_stock   = serializers.BooleanField(read_only=True)
    stock_value    = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )

    # Not required in request — set by perform_create
    clinic = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model            = Product
        fields           = '__all__'
        read_only_fields = ['id', 'clinic', 'created_by', 'created_at', 'updated_at', 'is_deleted']

    def get_created_by_name(self, obj) -> str | None:
        return obj.created_by.get_full_name() if obj.created_by else None

    def get_modified_by_name(self, obj) -> str | None:
        return obj.modified_by.get_full_name() if obj.modified_by else None


class ProductListSerializer(serializers.ModelSerializer):
    """Lighter serializer for the list view — omits heavy fields."""

    category_name = serializers.CharField(source='category.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    modified_by_name = serializers.SerializerMethodField()
    is_low_stock  = serializers.BooleanField(read_only=True)

    class Meta:
        model  = Product
        fields = [
            'id', 'name', 'sku', 'item_type', 'category', 'category_name',
            'selling_price', 'quantity_in_stock', 'unit',
            'reorder_level', 'is_low_stock', 'is_active', 'is_archived',
            'created_by', 'created_by_name', 'modified_by', 'modified_by_name',
        ]

    def get_created_by_name(self, obj) -> str | None:
        return obj.created_by.get_full_name() if obj.created_by else None

    def get_modified_by_name(self, obj) -> str | None:
        return obj.modified_by.get_full_name() if obj.modified_by else None


class StockMovementSerializer(serializers.ModelSerializer):
    product_name     = serializers.CharField(source='product.name',              read_only=True)
    performed_by_name = serializers.SerializerMethodField()

    class Meta:
        model            = StockMovement
        fields           = '__all__'
        read_only_fields = [
            'id', 'performed_by', 'quantity_before',
            'quantity_after', 'created_at', 'updated_at',
        ]

    def get_performed_by_name(self, obj) -> str | None:
        return obj.performed_by.get_full_name() if obj.performed_by else None


class StockAdjustmentSerializer(serializers.Serializer):
    """Used for the adjust_stock action."""
    movement_type = serializers.ChoiceField(choices=StockMovement.MOVEMENT_CHOICES)
    quantity      = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    reference     = serializers.CharField(required=False, allow_blank=True, default='')
    notes         = serializers.CharField(required=False, allow_blank=True, default='')