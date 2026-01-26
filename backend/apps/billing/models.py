from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from apps.common.models import TimeStampedModel, SoftDeleteModel


class Invoice(TimeStampedModel, SoftDeleteModel):
    """Patient invoices for services rendered"""
    
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PENDING', 'Pending'),
        ('PAID', 'Paid'),
        ('PARTIALLY_PAID', 'Partially Paid'),
        ('OVERDUE', 'Overdue'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    appointment = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices'
    )
    
    # Invoice details
    invoice_number = models.CharField(max_length=50, unique=True, editable=False)
    invoice_date = models.DateField()
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    
    # Amounts
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance_due = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Payment details
    payment_method = models.CharField(max_length=50, blank=True)
    payment_notes = models.TextField(blank=True)
    
    # PhilHealth/HMO
    philhealth_coverage = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    hmo_coverage = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Notes
    notes = models.TextField(blank=True)
    terms_conditions = models.TextField(blank=True)
    
    class Meta:
        db_table = 'invoices'
        ordering = ['-invoice_date', '-created_at']
        indexes = [
            models.Index(fields=['clinic', 'invoice_date']),
            models.Index(fields=['patient', 'invoice_date']),
            models.Index(fields=['invoice_number']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.patient.get_full_name()}"
    
    def save(self, *args, **kwargs):
        if not self.invoice_number:
            # Generate invoice number: INV-YYYYMMDD-XXXX
            from django.utils import timezone
            date_str = timezone.now().strftime('%Y%m%d')
            last_invoice = Invoice.objects.filter(
                invoice_number__startswith=f'INV-{date_str}'
            ).order_by('invoice_number').last()
            
            if last_invoice:
                last_num = int(last_invoice.invoice_number.split('-')[2])
                new_num = last_num + 1
            else:
                new_num = 1
            
            self.invoice_number = f"INV-{date_str}-{new_num:04d}"
        
        # Calculate balance
        self.balance_due = self.total_amount - self.amount_paid - self.philhealth_coverage - self.hmo_coverage
        
        # Update status based on payment
        if self.amount_paid >= self.total_amount:
            self.status = 'PAID'
        elif self.amount_paid > 0:
            self.status = 'PARTIALLY_PAID'
        
        super().save(*args, **kwargs)


class InvoiceItem(TimeStampedModel):
    """Line items for invoices"""
    
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='items'
    )
    
    description = models.CharField(max_length=500)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Service/product reference
    service_code = models.CharField(max_length=50, blank=True)
    
    class Meta:
        db_table = 'invoice_items'
        ordering = ['id']
    
    def __str__(self):
        return f"{self.description} - {self.invoice.invoice_number}"
    
    def save(self, *args, **kwargs):
        # Calculate total
        subtotal = self.quantity * self.unit_price
        discount = subtotal * (self.discount_percent / 100)
        after_discount = subtotal - discount
        tax = after_discount * (self.tax_percent / 100)
        self.total = after_discount + tax
        
        super().save(*args, **kwargs)
        
        # Update invoice totals
        self.invoice.update_totals()


class Payment(TimeStampedModel):
    """Payment records for invoices"""
    
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('CREDIT_CARD', 'Credit Card'),
        ('DEBIT_CARD', 'Debit Card'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('GCASH', 'GCash'),
        ('PAYMAYA', 'PayMaya'),
        ('CHECK', 'Check'),
    ]
    
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    
    payment_date = models.DateField()
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    
    # Payment details
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    
    # Receipt
    receipt_number = models.CharField(max_length=50, unique=True, editable=False)
    
    # Processed by
    received_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='received_payments'
    )
    
    class Meta:
        db_table = 'payments'
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['invoice', 'payment_date']),
            models.Index(fields=['receipt_number']),
        ]
    
    def __str__(self):
        return f"Payment {self.receipt_number} - {self.amount}"
    
    def save(self, *args, **kwargs):
        if not self.receipt_number:
            # Generate receipt number: RCP-YYYYMMDD-XXXX
            from django.utils import timezone
            date_str = timezone.now().strftime('%Y%m%d')
            last_payment = Payment.objects.filter(
                receipt_number__startswith=f'RCP-{date_str}'
            ).order_by('receipt_number').last()
            
            if last_payment:
                last_num = int(last_payment.receipt_number.split('-')[2])
                new_num = last_num + 1
            else:
                new_num = 1
            
            self.receipt_number = f"RCP-{date_str}-{new_num:04d}"
        
        super().save(*args, **kwargs)
        
        # Update invoice amount paid
        self.invoice.amount_paid = sum(
            self.invoice.payments.values_list('amount', flat=True)
        )
        self.invoice.save()


class Service(TimeStampedModel):
    """Service catalog for billing"""
    
    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='services'
    )
    
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    service_code = models.CharField(max_length=50, blank=True)
    
    # Pricing
    default_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    
    # Categories
    category = models.CharField(max_length=100, blank=True)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'services'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} - ₱{self.default_price}"


# Add method to Invoice model
def update_totals(self):
    """Calculate and update invoice totals"""
    items = self.items.all()
    self.subtotal = sum(item.total for item in items)
    self.total_amount = self.subtotal - self.discount_amount + self.tax_amount
    self.save()

Invoice.update_totals = update_totals