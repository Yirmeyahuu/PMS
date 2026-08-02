import os, sys, django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.appointments.models import Appointment
from apps.patients.models import PatientConsentDocument, PatientCase

appts = Appointment.objects.filter(date__in=['2026-07-31', '2026-08-28'])
for appt in appts:
    print(f"\n--- Appointment ID: {appt.id} ---")
    print(f"Date: {appt.date} {appt.start_time}")
    print(f"Patient: {appt.patient.get_full_name()} (ID: {appt.patient.id})")
    print(f"Case ID: {appt.patient_case_id}")
    
    docs = PatientConsentDocument.objects.filter(appointment=appt)
    for doc in docs:
        print(f"  Doc ID: {doc.id}, Type: {doc.type}, Signed At: {doc.signed_at}")
        
print("\n--- ALL Consent Docs for this Patient ---")
if appts.exists():
    patient = appts.first().patient
    all_docs = PatientConsentDocument.objects.filter(patient=patient).order_by('signed_at')
    for doc in all_docs:
        print(f"  Doc ID: {doc.id}, Type: {doc.type}, Signed At: {doc.signed_at}, Appt: {doc.appointment_id}, Case: {doc.patient_case_id}")
