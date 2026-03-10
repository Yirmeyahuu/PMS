import django_filters
from django.db.models import Q
from .models import Product, StockMovement


class ProductFilter(django_filters.FilterSet):
    search      = django_filters.CharFilter(method='filter_search')
    category    = django_filters.NumberFilter(field_name='category__id')
    item_type   = django_filters.CharFilter(field_name='item_type')
    is_active   = django_filters.BooleanFilter(field_name='is_active')
    is_archived = django_filters.BooleanFilter(field_name='is_archived')
    low_stock   = django_filters.BooleanFilter(method='filter_low_stock')

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(name__icontains=value) |
            Q(sku__icontains=value)  |
            Q(barcode__icontains=value)
        )

    def filter_low_stock(self, queryset, name, value):
        if value:
            # quantity_in_stock <= reorder_level  (using F expression)
            from django.db.models import F
            return queryset.filter(quantity_in_stock__lte=F('reorder_level'))
        return queryset

    class Meta:
        model  = Product
        fields = ['category', 'item_type', 'is_active', 'is_archived', 'low_stock']


class StockMovementFilter(django_filters.FilterSet):
    date_from     = django_filters.DateFilter(field_name='created_at', lookup_expr='date__gte')
    date_to       = django_filters.DateFilter(field_name='created_at', lookup_expr='date__lte')
    movement_type = django_filters.CharFilter(field_name='movement_type')
    product       = django_filters.NumberFilter(field_name='product__id')

    class Meta:
        model  = StockMovement
        fields = ['product', 'movement_type', 'date_from', 'date_to']