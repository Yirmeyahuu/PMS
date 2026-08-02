import os
import django
import sys
from datetime import timedelta

sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.patients.models import PatientConsentDocument
from apps.appointments.models import Appointment

docs = PatientConsentDocument.objects.filter(appointment__isnull=True)
print(f"Found {docs.count()} consent documents without an appointment.")

fixed = 0
for doc in docs:
    if not doc.patient:
        continue
        
    # Find an appointment for this patient created shortly after the document was signed
    # or just the earliest appointment on or after the signature date.
    appts = Appointment.objects.filter(
        patient_case__patient=doc.patient,
        created_at__gte=doc.signed_at - timedelta(minutes=10)
    ).order_by('created_at')
    
    appt = appts.first()
    if appt:
        doc.appointment = appt
        doc.patient_case = appt.patient_case
        doc.save(update_fields=['appointment', 'patient_case'])
        fixed += 1
        print(f"Linked doc {doc.id} to appointment {appt.id} (Case: {appt.patient_case_id})")

print(f"Fixed {fixed} documents.")
