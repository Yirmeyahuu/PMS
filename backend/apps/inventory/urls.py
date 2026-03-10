from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, ProductViewSet, StockMovementViewSet

router = DefaultRouter()
router.register(r'inventory/categories',     CategoryViewSet,      basename='inventory-category')
router.register(r'inventory/products',       ProductViewSet,       basename='inventory-product')
router.register(r'inventory/stock-movements',StockMovementViewSet, basename='inventory-stock-movement')

urlpatterns = router.urls