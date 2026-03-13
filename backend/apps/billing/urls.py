from rest_framework.routers import DefaultRouter
from .views import (
    InvoiceViewSet,
    InvoiceItemViewSet,
    PaymentViewSet,
    ServiceViewSet,
    InvoiceBatchViewSet,
    AppointmentPrintViewSet,
)

router = DefaultRouter()
router.register(r'invoices',           InvoiceViewSet,          basename='invoices')
router.register(r'invoice-items',      InvoiceItemViewSet,      basename='invoice-items')
router.register(r'payments',           PaymentViewSet,          basename='payments')
router.register(r'services',           ServiceViewSet,          basename='services')
router.register(r'invoice-batches',    InvoiceBatchViewSet,     basename='invoice-batches')
router.register(r'appointments-print', AppointmentPrintViewSet, basename='appointments-print')

urlpatterns = router.urls