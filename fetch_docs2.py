import os, sys, django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.patients.models import PatientConsentDocument
from apps.patients.serializers import PatientConsentDocumentSerializer
docs = PatientConsentDocument.objects.filter(patient_id=2).order_by('-signed_at')
data = PatientConsentDocumentSerializer(docs, many=True).data
for d in data:
    print(f"Doc ID: {d['id']}, Appt: {d['appointment_id']}, Appt Object: {d['appointment']}")
