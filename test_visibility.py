import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.accounts.models import User
from apps.patients.models import Patient, PatientCase
from apps.clinical_templates.models import ClinicalNote, ClinicalNoteAuditLog
from apps.clinical_templates.views import ClinicalNoteViewSet
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request

print("Running visibility test...")

# Find a clinic that has practitioners
from apps.clinics.models import Clinic
clinic = Clinic.objects.first()

# Create or find a patient and case
patient, _ = Patient.objects.get_or_create(clinic=clinic, first_name="Test", last_name="Patient")
case, _ = PatientCase.objects.get_or_create(patient=patient, title="Test Case")

# Create two practitioners
practitioner1, _ = User.objects.get_or_create(email="prac1@test.com", defaults={'role': 'PRACTITIONER'})
practitioner2, _ = User.objects.get_or_create(email="prac2@test.com", defaults={'role': 'PRACTITIONER'})

practitioner1.clinic = clinic
practitioner2.clinic = clinic
practitioner1.save()
practitioner2.save()

# Ensure they have practitioner profiles
from apps.accounts.models import PractitionerProfile
p1_profile, _ = PractitionerProfile.objects.get_or_create(user=practitioner1, defaults={'prc_number': '123'})
p2_profile, _ = PractitionerProfile.objects.get_or_create(user=practitioner2, defaults={'prc_number': '456'})

# Ensure they don't have elevated roles
print(f"Prac 1 effective roles: {practitioner1.get_effective_roles()}")
print(f"Prac 2 effective roles: {practitioner2.get_effective_roles()}")

# Create a note by Practitioner 1
note1, _ = ClinicalNote.objects.get_or_create(
    patient=patient,
    patient_case=case,
    created_by=practitioner1,
    practitioner=p1_profile,
    clinic=clinic,
    status='finalized'
)

# Practitioner 2 accesses the notes
factory = APIRequestFactory()
request = factory.get('/api/clinical-templates/notes/')
request.user = practitioner2

view = ClinicalNoteViewSet()
view.request = Request(request)
view.format_kwarg = None
view.kwargs = {}

qs = view.get_queryset()
visible_notes = qs.filter(id=note1.id)

print(f"Note 1 ID: {note1.id} (Created by {note1.created_by.email})")
print(f"Is note visible to {practitioner2.email}? {'YES' if visible_notes.exists() else 'NO'}")

# Clean up
note1.delete()
case.delete()
patient.delete()
practitioner1.delete()
practitioner2.delete()
