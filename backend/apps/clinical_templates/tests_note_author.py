from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import User
from apps.clinics.models import Clinic, Practitioner
from apps.patients.models import Patient, PatientCase
from apps.appointments.models import Appointment
from apps.clinical_templates.models import ClinicalTemplate, ClinicalNote

class NoteAuthorTest(APITestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(name="Test Clinic")
        
        # Practitioner User (assigned to appointment)
        self.practitioner_user = User.objects.create_user(email="dr@test.com", password="password", first_name="Dr.", last_name="Santos", clinic=self.clinic, role="PRACTITIONER")
        self.practitioner = Practitioner.objects.create(user=self.practitioner_user, clinic=self.clinic)
        
        # Admin User (logged in) - Admins skip branch checks
        self.admin_user = User.objects.create_user(email="admin@test.com", password="password", first_name="Maria", last_name="Reyes", clinic=self.clinic, role="ADMIN")
        
        self.patient = Patient.objects.create(first_name="John", last_name="Doe", date_of_birth="1990-01-01", clinic=self.clinic)
        self.patient_case = PatientCase.objects.create(patient=self.patient, title="Test Case")
        self.appointment = Appointment.objects.create(patient=self.patient, clinic=self.clinic, practitioner=self.practitioner, patient_case=self.patient_case, date="2026-01-01", start_time="10:00:00", end_time="11:00:00")
        self.template = ClinicalTemplate.objects.create(name="Test Template", clinic=self.clinic, created_by=self.admin_user, is_active=True, structure={"sections": []})
        self.url = '/api/clinical-templates/notes/'

    def test_manager_creates_note_for_practitioner_appointment(self):
        self.client.force_authenticate(user=self.admin_user)
        
        payload = {
            "patient": self.patient.id,
            "template": self.template.id,
            "date": "2026-01-01",
            "appointment": self.appointment.id,
            "patient_case": self.patient_case.id,
            "content": {"test": 1},
            "created_by": self.practitioner_user.id  # Maliciously attempt to spoof
        }
        
        res = self.client.post(self.url, payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        
        note = ClinicalNote.objects.get(id=res.data['id'])
        
        # Verifications
        self.assertEqual(note.created_by.id, self.admin_user.id)  # Creator is the manager
        self.assertEqual(note.practitioner.id, self.practitioner.id)  # Practitioner remains Dr. Santos
        
        # Verify serializer exposes both correctly
        self.assertEqual(res.data['created_by'], self.admin_user.id)
        self.assertEqual(res.data['practitioner'], self.practitioner.id)

    def test_print_note_displays_creator(self):
        self.client.force_authenticate(user=self.admin_user)
        
        # Create a note authored by the manager via API to ensure proper setup
        payload = {
            "patient": self.patient.id,
            "template": self.template.id,
            "date": "2026-01-01",
            "appointment": self.appointment.id,
            "patient_case": self.patient_case.id,
            "content": {"test": 1}
        }
        create_res = self.client.post(self.url, payload, format='json')
        self.assertEqual(create_res.status_code, status.HTTP_201_CREATED)
        
        note_id = create_res.data['id']
        
        print_url = f"{self.url}{note_id}/print_note/"
        res = self.client.get(print_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        # The print response should properly export both creator and practitioner
        self.assertEqual(res.data['created_by_name'], self.admin_user.get_full_name())
        self.assertEqual(res.data['practitioner_name'], self.practitioner.user.get_full_name())
