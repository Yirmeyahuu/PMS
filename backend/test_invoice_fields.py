import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.billing.models import Invoice

# Find an invoice that has an appointment
inv = Invoice.objects.filter(appointment__isnull=False).first()
if inv:
    print("Invoice ID:", inv.id)
    appt = inv.appointment
    print("Appointment ID:", appt.id)
    prac = appt.practitioner
    if prac:
        print("Practitioner ID:", prac.id)
        user = prac.user
        print("User full name:", user.get_full_name())
    else:
        print("No practitioner on appointment")
    print("Appt Type Display:", appt.get_appointment_type_display())
else:
    print("No invoices with appointments found")
