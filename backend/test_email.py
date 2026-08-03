import os
import sys

if sys.platform == 'darwin':
    homebrew_lib = '/opt/homebrew/lib'
    if homebrew_lib not in os.environ.get('DYLD_FALLBACK_LIBRARY_PATH', ''):
        os.environ['DYLD_FALLBACK_LIBRARY_PATH'] = f"{homebrew_lib}:{os.environ.get('DYLD_FALLBACK_LIBRARY_PATH', '')}"

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.billing.models import Invoice, InvoicePrintSettings
from django.template.loader import render_to_string
import traceback

invoice = Invoice.objects.first()
print_settings = InvoicePrintSettings.get_for_clinic(invoice.clinic)

context = {
    'system_branding': {},
    'invoice': invoice,
    'items': invoice.items.all(),
    'payments': invoice.payments.all(),
    'settings': print_settings,
    'clinic_display_name': 'Test Clinic',
    'currency': '₱',
    'custom_message': 'This is a test message',
}

try:
    html_body = render_to_string('billing/email/invoice_email.html', context)
    print("Email HTML generated successfully, length:", len(html_body))
except Exception as e:
    traceback.print_exc()
