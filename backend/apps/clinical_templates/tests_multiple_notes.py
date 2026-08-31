from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import User
from apps.clinics.models import Clinic, Practitioner
from apps.patients.models import Patient, PatientCase
from apps.appointments.models import Appointment
from apps.clinical_templates.models import ClinicalTemplate, ClinicalNote

class MultipleNotesTest(APITestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(name="Test Clinic")
        self.practitioner_user = User.objects.create_user(email="dr@test.com", password="password", first_name="Dr.", last_name="Santos", clinic=self.clinic, role="PRACTITIONER")
        self.practitioner = Practitioner.objects.create(user=self.practitioner_user, clinic=self.clinic)
        
        self.bale_torres = User.objects.create_user(email="bale@test.com", password="password", first_name="Bale", last_name="Torres", clinic=self.clinic, clinic_branch=self.clinic, role="ADMIN_ASSISTANT")
        self.admin_user = User.objects.create_user(email="admin@test.com", password="password", first_name="Maria", last_name="Reyes", clinic=self.clinic, role="ADMIN")
        
        self.patient = Patient.objects.create(first_name="John", last_name="Doe", date_of_birth="1990-01-01", clinic=self.clinic)
        self.patient_case = PatientCase.objects.create(patient=self.patient, title="Test Case")
        self.appointment = Appointment.objects.create(patient=self.patient, clinic=self.clinic, practitioner=self.practitioner, patient_case=self.patient_case, date="2026-01-01", start_time="10:00:00", end_time="11:00:00")
        self.template = ClinicalTemplate.objects.create(name="Test Template", clinic=self.clinic, created_by=self.admin_user, is_active=True, structure={"sections": []})
        self.url = '/api/clinical-templates/notes/'

    def test_1_multiple_drafts(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {"patient": self.patient.id, "template": self.template.id, "date": "2026-01-01", "appointment": self.appointment.id, "status": "drafted"}
        res1 = self.client.post(self.url, payload, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        res2 = self.client.post(self.url, payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ClinicalNote.objects.filter(appointment=self.appointment, status='drafted').count(), 2)

    def test_2_multiple_finalized(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {"patient": self.patient.id, "template": self.template.id, "date": "2026-01-01", "appointment": self.appointment.id, "status": "finalized"}
        res1 = self.client.post(self.url, payload, format='json')
        res2 = self.client.post(self.url, payload, format='json')
        self.assertEqual(ClinicalNote.objects.filter(appointment=self.appointment, status='finalized').count(), 2)

    def test_3_draft_and_finalized(self):
        self.client.force_authenticate(user=self.admin_user)
        payload_draft = {"patient": self.patient.id, "template": self.template.id, "date": "2026-01-01", "appointment": self.appointment.id, "status": "drafted"}
        payload_final = {"patient": self.patient.id, "template": self.template.id, "date": "2026-01-01", "appointment": self.appointment.id, "status": "finalized"}
        self.client.post(self.url, payload_draft, format='json')
        self.client.post(self.url, payload_final, format='json')
        self.client.post(self.url, payload_draft, format='json')
        self.client.post(self.url, payload_final, format='json')
        self.assertEqual(ClinicalNote.objects.filter(appointment=self.appointment).count(), 4)

    def test_4_creator_finalizes_own_note(self):
        self.client.force_authenticate(user=self.bale_torres)
        # Note 1 created by someone else
        ClinicalNote.objects.create(patient=self.patient, clinic=self.clinic, appointment=self.appointment, template=self.template, date="2026-01-01", created_by=self.admin_user, practitioner=self.practitioner, status="drafted")
        
        # Note 2 created by Bale
        payload = {"patient": self.patient.id, "template": self.template.id, "date": "2026-01-01", "appointment": self.appointment.id, "status": "drafted"}
        res_create = self.client.post(self.url, payload, format='json')
        note_id = res_create.data['id']
        
        # Bale finalizes Note 2
        update_url = f"{self.url}{note_id}/"
        res_update = self.client.patch(update_url, {"status": "finalized"}, format='json')
        self.assertEqual(res_update.status_code, status.HTTP_200_OK)
        
        # Note 1 remains drafted
        self.assertEqual(ClinicalNote.objects.filter(appointment=self.appointment, status="drafted").count(), 1)
        # Note 2 is finalized
        self.assertEqual(ClinicalNote.objects.filter(appointment=self.appointment, status="finalized").count(), 1)

    def test_7_creator_set_correctly(self):
        self.client.force_authenticate(user=self.bale_torres)
        payload = {"patient": self.patient.id, "template": self.template.id, "date": "2026-01-01", "appointment": self.appointment.id, "status": "drafted"}
        res = self.client.post(self.url, payload, format='json')
        note = ClinicalNote.objects.get(id=res.data['id'])
        self.assertEqual(note.created_by, self.bale_torres)
        self.assertEqual(note.practitioner, self.practitioner)
        
