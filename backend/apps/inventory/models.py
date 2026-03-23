import uuid
from django.db import models
from django.core.validators import MinValueValidator
from apps.common.models import TimeStampedModel, SoftDeleteModel

def generate_barcode():
    """Generate a unique barcode: INV- + 10 uppercase hex chars."""
    return f"INV-{uuid.uuid4().hex[:10].upper()}"


class Category(TimeStampedModel):
    """Product categories for grouping inventory items."""

    clinic       = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='inventory_categories',
    )
    name         = models.CharField(max_length=100)
    description  = models.TextField(blank=True)
    is_active    = models.BooleanField(default=True)

    class Meta:
        db_table            = 'inventory_categories'
        ordering            = ['name']
        unique_together     = [['clinic', 'name']]
        verbose_name_plural = 'categories'

    def __str__(self):
        return self.name


class Product(TimeStampedModel, SoftDeleteModel):
    """
    A clinic inventory product / item.
    Supports both consumable products and service items.
    """

    UNIT_CHOICES = [
        ('PCS',   'Pieces'),
        ('BOX',   'Box'),
        ('BOTTLE','Bottle'),
        ('PACK',  'Pack'),
        ('VIAL',  'Vial'),
        ('TUBE',  'Tube'),
        ('ML',    'mL'),
        ('MG',    'mg'),
        ('G',     'g'),
        ('OTHER', 'Other'),
    ]

    TYPE_CHOICES = [
        ('PRODUCT', 'Product'),
        ('SERVICE', 'Service'),
        ('SUPPLY',  'Supply'),
    ]

    clinic       = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='inventory_products',
    )
    category     = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='products',
    )
    created_by   = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_inventory_products',
    )
    modified_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='modified_inventory_products',
    )

    barcode = models.CharField(
        max_length=100,
        blank=True,
        unique=True,
        null=True,
        default=None,
    )

    # ── Identity ──────────────────────────────────────────────────────────────
    name         = models.CharField(max_length=200)
    sku          = models.CharField(max_length=100, blank=True)
    barcode      = models.CharField(max_length=100, blank=True)
    description  = models.TextField(blank=True)
    item_type    = models.CharField(max_length=20, choices=TYPE_CHOICES, default='PRODUCT')

    # ── Pricing ───────────────────────────────────────────────────────────────
    cost_price   = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
    )
    selling_price = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
    )

    # ── Stock ─────────────────────────────────────────────────────────────────
    unit             = models.CharField(max_length=20, choices=UNIT_CHOICES, default='PCS')
    quantity_in_stock = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
    )
    reorder_level    = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
        help_text='Alert when stock falls to or below this level.',
    )

    # ── Status ────────────────────────────────────────────────────────────────
    is_active     = models.BooleanField(default=True)
    is_archived   = models.BooleanField(default=False)

    class Meta:
        db_table    = 'inventory_products'
        ordering    = ['name']
        indexes     = [
            models.Index(fields=['clinic', 'is_archived']),
            models.Index(fields=['sku']),
            models.Index(fields=['item_type']),
        ]

    def __str__(self):
        return f"{self.name} ({self.sku or 'no SKU'})"

    @property
    def is_low_stock(self) -> bool:
        return self.quantity_in_stock <= self.reorder_level

    @property
    def stock_value(self):
        return self.quantity_in_stock * self.cost_price
    
    def save(self, *args, **kwargs):
        # Auto-generate barcode on first save if not already set
        if not self.barcode:
            self.barcode = generate_barcode()
        super().save(*args, **kwargs)


class StockMovement(TimeStampedModel):
    """
    Audit trail for every stock quantity change.
    """

    MOVEMENT_CHOICES = [
        ('IN',         'Stock In'),
        ('OUT',        'Stock Out'),
        ('ADJUSTMENT', 'Adjustment'),
        ('RETURN',     'Return'),
    ]

    product      = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='movements',
    )
    performed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='stock_movements',
    )

    movement_type    = models.CharField(max_length=20, choices=MOVEMENT_CHOICES)
    quantity         = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)],
    )
    quantity_before  = models.DecimalField(max_digits=10, decimal_places=2)
    quantity_after   = models.DecimalField(max_digits=10, decimal_places=2)
    reference        = models.CharField(max_length=200, blank=True,
                                        help_text='e.g. invoice number, PO number')
    notes            = models.TextField(blank=True)

    class Meta:
        db_table = 'inventory_stock_movements'
        ordering = ['-created_at']
        indexes  = [
            models.Index(fields=['product', 'created_at']),
        ]

    def __str__(self):
        return f"{self.movement_type} {self.quantity} × {self.product.name}"