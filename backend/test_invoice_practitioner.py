import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.billing.models import Invoice

invoices = Invoice.objects.all()[:10]
for inv in invoices:
    print(f"Invoice {inv.invoice_number}:")
    appt = inv.appointment
    if appt:
        prac = appt.practitioner
        if prac:
            user = prac.user
            print(f"  Practitioner User: {user.get_full_name()} (ID: {prac.id})")
        else:
            print("  Practitioner: None")
        print(f"  Appt Type: {appt.get_appointment_type_display()}")
    else:
        print("  Appointment: None")
        if inv.patient_case and inv.patient_case.primary_practitioner:
            prac = inv.patient_case.primary_practitioner
            print(f"  Case Primary Prac: {prac.user.get_full_name()} (ID: {prac.id})")
