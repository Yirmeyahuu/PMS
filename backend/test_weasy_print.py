import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.billing.models import Invoice
from apps.billing.views import InvoiceViewSet
from django.test import RequestFactory
from django.template.loader import render_to_string

factory = RequestFactory()
request = factory.get('/')

view = InvoiceViewSet()
# Get a package invoice
inv = Invoice.objects.filter(appointment__isnull=True, patient_case__isnull=False).first()
if inv:
    print(f"Testing Invoice {inv.invoice_number}")
    context = view._build_invoice_context(inv, request)
    html_string = render_to_string('billing/invoice_print.html', context)
    if "Malasakit Admin" in html_string:
        print("Success: Practitioner name rendered from fallback.")
    else:
        print("Failed to render fallback.")
else:
    print("No package invoices found.")
