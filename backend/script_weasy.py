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
from weasyprint import HTML
import traceback

invoice = Invoice.objects.first()
print_settings = InvoicePrintSettings.get_for_clinic(invoice.clinic)
context = {
    'system_branding': {},
    'invoice': invoice,
    'items': invoice.items.all(),
    'payments': invoice.payments.all(),
    'settings': print_settings,
    'clinic_display_name': 'Test',
}
html_string = render_to_string('billing/invoice_print.html', context)
try:
    html = HTML(string=html_string)
    pdf = html.write_pdf()
    print("PDF length:", len(pdf))
except Exception as e:
    traceback.print_exc()
