from django.db import models
from django.core.validators import MinValueValidator
from django.utils.crypto import get_random_string
from decimal import Decimal
from apps.common.models import TimeStampedModel, SoftDeleteModel


class InvoiceBatch(TimeStampedModel):
    STATUS_CHOICES = [
        ('PENDING',    'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED',  'Completed'),
        ('FAILED',     'Failed'),
    ]

    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='invoice_batches',
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='billing_invoice_batches',
    )

    batch_number = models.CharField(max_length=50, unique=True, editable=False)
    status       = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True
    )

    date_from    = models.DateField()
    date_to      = models.DateField()
    clinic_ids   = models.JSONField(default=list)
    filters_used = models.JSONField(default=dict)

    total_appointments    = models.PositiveIntegerField(default=0)
    total_created         = models.PositiveIntegerField(default=0)
    total_skipped         = models.PositiveIntegerField(default=0)
    total_failed          = models.PositiveIntegerField(default=0)
    error_log             = models.JSONField(default=list)
    total_invoiced_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        db_table = 'invoice_batches'
        ordering = ['-created_at']

    def __str__(self):
        return f"Batch {self.batch_number} — {self.status} ({self.total_created} invoices)"

    def save(self, *args, **kwargs):
        if not self.batch_number:
            from django.utils import timezone
            date_str  = timezone.now().strftime('%Y%m%d')
            suffix    = get_random_string(6).upper()
            self.batch_number = f"BATCH-{date_str}-{suffix}"
        super().save(*args, **kwargs)


class Invoice(TimeStampedModel, SoftDeleteModel):
    """Patient invoices for services rendered — each invoice is fully independent."""

    STATUS_CHOICES = [
        ('DRAFT',          'Draft'),
        ('PENDING',        'Pending'),
        ('PAID',           'Paid'),
        ('PARTIALLY_PAID', 'Partially Paid'),
        ('OVERDUE',        'Overdue'),
        ('CANCELLED',      'Cancelled'),
    ]

    clinic = models.ForeignKey(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='billing_invoices',
    )
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='billing_invoices',
    )
    appointment = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='billing_invoices',
    )
    bulk_batch = models.ForeignKey(
        InvoiceBatch,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices',
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_billing_invoices',
    )

    invoice_number = models.CharField(max_length=50, unique=True, editable=False)
    invoice_date   = models.DateField()
    due_date       = models.DateField(null=True, blank=True)

    # ── Status is ALWAYS scoped to THIS invoice only ──────────────────────────
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='DRAFT',
        db_index=True,
    )

    # ── Amounts — all scoped to THIS invoice only ─────────────────────────────
    subtotal         = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_percent = models.DecimalField(max_digits=5,  decimal_places=2, default=0)
    tax_amount       = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_percent      = models.DecimalField(max_digits=5,  decimal_places=2, default=0)
    total_amount     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount_paid      = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance_due      = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    payment_method = models.CharField(max_length=50, blank=True)
    payment_notes  = models.TextField(blank=True)

    philhealth_coverage = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    hmo_coverage        = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    notes            = models.TextField(blank=True)
    terms_conditions = models.TextField(blank=True)

    class Meta:
        db_table = 'invoices'
        ordering = ['-invoice_date', '-created_at']
        indexes  = [
            models.Index(fields=['clinic', 'invoice_date']),
            models.Index(fields=['patient', 'invoice_date']),
            models.Index(fields=['invoice_number']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Invoice {self.invoice_number} — {self.patient.get_full_name()} — {self.status}"

    def save(self, *args, **kwargs):
        # ── Auto-generate invoice number ──────────────────────────────────────
        if not self.invoice_number:
            from django.utils import timezone
            date_str     = timezone.now().strftime('%Y%m%d')
            last_invoice = Invoice.objects.filter(
                invoice_number__startswith=f'INV-{date_str}'
            ).order_by('invoice_number').last()

            if last_invoice:
                try:
                    last_num = int(last_invoice.invoice_number.split('-')[2])
                except (IndexError, ValueError):
                    last_num = 0
                new_num = last_num + 1
            else:
                new_num = 1

            self.invoice_number = f"INV-{date_str}-{new_num:04d}"

        # ── Recalculate balance for THIS invoice only ─────────────────────────
        total        = Decimal(str(self.total_amount or 0))
        paid         = Decimal(str(self.amount_paid or 0))
        philhealth   = Decimal(str(self.philhealth_coverage or 0))
        hmo          = Decimal(str(self.hmo_coverage or 0))
        self.balance_due = max(total - paid - philhealth - hmo, Decimal('0'))

        # ── Auto-update status ONLY based on THIS invoice's payment ───────────
        # Only auto-transition DRAFT/PENDING — never touch CANCELLED/OVERDUE
        # unless explicitly set by the caller.
        if self.status not in ('CANCELLED', 'OVERDUE') and total > 0:
            if paid >= total:
                self.status = 'PAID'
            elif paid > 0:
                self.status = 'PARTIALLY_PAID'
            # Leave DRAFT/PENDING as-is if nothing is paid yet

        super().save(*args, **kwargs)

    def update_totals(self):
        """
        Recalculate subtotal/total from THIS invoice's line items only.
        Never touches other invoices.
        """
        items = self.items.all()

        # Sum item totals (each item already computed qty * price - discount + tax)
        subtotal = sum(Decimal(str(item.total)) for item in items)
        self.subtotal = subtotal

        # Apply invoice-level discount
        discount_percent = Decimal(str(self.discount_percent or 0))
        if discount_percent > 0:
            self.discount_amount = (subtotal * discount_percent / 100).quantize(Decimal('0.01'))
        else:
            self.discount_amount = Decimal('0')

        discounted = subtotal - self.discount_amount

        # Apply invoice-level tax
        tax_percent = Decimal(str(self.tax_percent or 0))
        if tax_percent > 0:
            self.tax_amount = (discounted * tax_percent / 100).quantize(Decimal('0.01'))
        else:
            self.tax_amount = Decimal('0')

        self.total_amount = discounted + self.tax_amount

        # save() will recalculate balance_due and status automatically
        self.save()

    def recalculate_amount_paid(self):
        """
        Sum payments for THIS invoice only and update amount_paid + balance_due.
        Called by Payment.save() and Payment.delete().
        """
        # Always query fresh from DB scoped to this invoice's PK
        total_paid = (
            Payment.objects
            .filter(invoice_id=self.pk)
            .aggregate(total=models.Sum('amount'))['total']
            or Decimal('0')
        )
        self.amount_paid = Decimal(str(total_paid))
        # save() recalculates balance_due and status
        self.save()

    def mark_paid(self, payment_method='CASH', payment_reference=''):
        """
        Explicitly mark THIS invoice as fully paid.
        Does NOT affect any other invoice.
        """
        self.status         = 'PAID'
        self.amount_paid    = Decimal(str(self.total_amount or 0))
        self.balance_due    = Decimal('0')
        self.payment_method = payment_method
        self.payment_notes  = payment_reference
        # Use save() without update_fields so balance/status logic runs cleanly
        Invoice.objects.filter(pk=self.pk).update(
            status         = 'PAID',
            amount_paid    = self.amount_paid,
            balance_due    = Decimal('0'),
            payment_method = payment_method,
            payment_notes  = payment_reference,
        )
        # Refresh local instance to match DB
        self.refresh_from_db()


class InvoiceItem(TimeStampedModel):
    """Line items — always belong to exactly one Invoice."""

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='items',
    )

    description      = models.CharField(max_length=500)
    quantity         = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    unit_price       = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    discount_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_percent      = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total            = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    service_code     = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = 'invoice_items'
        ordering = ['id']

    def __str__(self):
        return f"{self.description} — {self.invoice.invoice_number}"

    def save(self, *args, **kwargs):
        quantity         = Decimal(str(self.quantity or 0))
        unit_price       = Decimal(str(self.unit_price or 0))
        discount_percent = Decimal(str(self.discount_percent or 0))
        tax_percent      = Decimal(str(self.tax_percent or 0))

        subtotal       = quantity * unit_price
        discount       = subtotal * (discount_percent / Decimal('100'))
        after_discount = subtotal - discount
        tax            = after_discount * (tax_percent / Decimal('100'))
        self.total     = after_discount + tax
        super().save(*args, **kwargs)
        # Callers must call invoice.update_totals() explicitly after bulk item ops


class Payment(TimeStampedModel):
    """
    Payment records — each payment belongs to exactly one Invoice.
    Saving/deleting a payment ONLY affects that specific invoice's amount_paid.
    """

    PAYMENT_METHOD_CHOICES = [
        ('CASH',          'Cash'),
        ('CREDIT_CARD',   'Credit Card'),
        ('DEBIT_CARD',    'Debit Card'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('GCASH',         'GCash'),
        ('PAYMAYA',       'PayMaya'),
        ('CHECK',         'Check'),
    ]

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='payments',
    )
    payment_date     = models.DateField()
    amount           = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    payment_method   = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    reference_number = models.CharField(max_length=100, blank=True)
    notes            = models.TextField(blank=True)
    receipt_number   = models.CharField(max_length=50, unique=True, editable=False)
    received_by      = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='received_payments',
    )

    class Meta:
        db_table = 'payments'
        ordering = ['-payment_date', '-created_at']
        indexes  = [
            models.Index(fields=['invoice', 'payment_date']),
            models.Index(fields=['receipt_number']),
        ]

    def __str__(self):
        return f"Payment {self.receipt_number} — ₱{self.amount} for {self.invoice.invoice_number}"

    def save(self, *args, **kwargs):
        # ── Auto-generate receipt number ──────────────────────────────────────
        if not self.receipt_number:
            from django.utils import timezone
            date_str     = timezone.now().strftime('%Y%m%d')
            last_payment = Payment.objects.filter(
                receipt_number__startswith=f'RCP-{date_str}'
            ).order_by('receipt_number').last()

            if last_payment:
                try:
                    last_num = int(last_payment.receipt_number.split('-')[2])
                except (IndexError, ValueError):
                    last_num = 0
                new_num = last_num + 1
            else:
                new_num = 1

            self.receipt_number = f"RCP-{date_str}-{new_num:04d}"

        super().save(*args, **kwargs)

        # ── Recalculate ONLY the invoice this payment belongs to ──────────────
        # Fetch a fresh DB instance to avoid stale cached data
        invoice = Invoice.objects.get(pk=self.invoice_id)
        invoice.recalculate_amount_paid()

    def delete(self, *args, **kwargs):
        invoice_id = self.invoice_id
        super().delete(*args, **kwargs)
        # ── Recalculate ONLY the invoice this payment belonged to ─────────────
        try:
            invoice = Invoice.objects.get(pk=invoice_id)
            invoice.recalculate_amount_paid()
        except Invoice.DoesNotExist:
            pass


class Service(TimeStampedModel):
    """Service catalog for billing"""

    clinic        = models.ForeignKey('clinics.Clinic', on_delete=models.CASCADE, related_name='services')
    name          = models.CharField(max_length=200)
    description   = models.TextField(blank=True)
    service_code  = models.CharField(max_length=50, blank=True)
    default_price = models.DecimalField(
        max_digits=10, decimal_places=2, validators=[MinValueValidator(0)]
    )
    category  = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'services'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} — ₱{self.default_price}"


class InvoicePrintSettings(TimeStampedModel):
    """
    Per-clinic print/branding settings for invoices.
    One record per clinic. If none exists, defaults are used.
    """

    clinic = models.OneToOneField(
        'clinics.Clinic',
        on_delete=models.CASCADE,
        related_name='invoice_print_settings',
    )

    logo_url       = models.URLField(max_length=500, blank=True)
    clinic_name    = models.CharField(max_length=200, blank=True)
    clinic_address = models.TextField(blank=True)
    clinic_phone   = models.CharField(max_length=50, blank=True)
    clinic_email   = models.EmailField(blank=True)
    clinic_website = models.URLField(max_length=200, blank=True)
    tin_number     = models.CharField(max_length=50, blank=True)

    header_text          = models.TextField(blank=True)
    footer_text          = models.TextField(blank=True, default='Thank you for your business!')
    terms_conditions     = models.TextField(blank=True)
    payment_instructions = models.TextField(blank=True)

    primary_color         = models.CharField(max_length=7, default='#0284c7')
    show_logo             = models.BooleanField(default=True)
    show_clinic_info      = models.BooleanField(default=True)
    show_patient_info     = models.BooleanField(default=True)
    show_appointment_info = models.BooleanField(default=True)
    show_payment_info     = models.BooleanField(default=True)
    currency_symbol       = models.CharField(max_length=10, default='₱')
    date_format           = models.CharField(max_length=30, default='%B %d, %Y')

    class Meta:
        db_table             = 'invoice_print_settings'
        verbose_name         = 'Invoice Print Settings'
        verbose_name_plural  = 'Invoice Print Settings'

    def __str__(self):
        return f"Print Settings — {self.clinic.name}"

    @classmethod
    def get_for_clinic(cls, clinic):
        """Return settings for a clinic, or an unsaved default instance."""
        try:
            return cls.objects.get(clinic=clinic)
        except cls.DoesNotExist:
            return cls(clinic=clinic)