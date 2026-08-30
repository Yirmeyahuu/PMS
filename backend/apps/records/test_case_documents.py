from rest_framework.test import APITestCase
from django.urls import reverse
from rest_framework import status
from apps.accounts.models import User
from apps.clinics.models import Clinic
from apps.patients.models import Patient
from apps.records.models import CaseDocument
from django.core.files.uploadedfile import SimpleUploadedFile

class CaseDocumentUploadTest(APITestCase):
    def setUp(self):
        self.clinic1 = Clinic.objects.create(name="Clinic 1")
        self.clinic2 = Clinic.objects.create(name="Clinic 2")
        self.branch1 = Clinic.objects.create(name="Branch 1", parent_clinic=self.clinic1)
        
        self.owner = User.objects.create_user(email="owner@example.com", password="password", first_name="Owner", last_name="User", clinic=self.clinic1, role="ADMIN")
        self.admin = User.objects.create_user(email="admin@example.com", password="password", first_name="Admin", last_name="User", clinic=self.clinic1, role="ADMIN")
        self.manager = User.objects.create_user(email="manager@example.com", password="password", first_name="Manager", last_name="User", clinic=self.clinic1, role="MANAGER")
        self.staff = User.objects.create_user(email="staff@example.com", password="password", first_name="Staff", last_name="User", clinic=self.clinic1, role="STAFF")
        
        # Practitioner assigned to branch1, but main clinic is clinic1
        self.practitioner = User.objects.create_user(email="practitioner@example.com", password="password", first_name="Prac", last_name="Titioner", clinic=self.clinic1, clinic_branch=self.branch1, role="PRACTITIONER")
        
        self.patient1 = Patient.objects.create(first_name="John", last_name="Doe", date_of_birth="1990-01-01", clinic=self.clinic1)
        self.patient_branch1 = Patient.objects.create(first_name="Branch", last_name="Patient", date_of_birth="1990-01-01", clinic=self.branch1)
        self.patient2 = Patient.objects.create(first_name="Jane", last_name="Smith", date_of_birth="1990-01-01", clinic=self.clinic2)
        
        self.url = reverse('case-documents-list')

    def _upload_valid_pdf(self, patient_id):
        return {
            'patient': patient_id,
            'title': 'Test Document',
            'category': 'CLINICAL_NOTE',
            'file': SimpleUploadedFile("test.pdf", b"file_content", content_type="application/pdf")
        }

    # TEST 1: Practitioner -> Authorized Patient
    def test_practitioner_authorized_patient(self):
        self.client.force_authenticate(user=self.practitioner)
        response = self.client.post(self.url, self._upload_valid_pdf(self.patient_branch1.id), format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # TEST 2: Admin -> Authorized Patient
    def test_admin_authorized_patient(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(self.url, self._upload_valid_pdf(self.patient1.id), format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # TEST 3: Manager -> Authorized Patient
    def test_manager_authorized_patient(self):
        self.client.force_authenticate(user=self.manager)
        response = self.client.post(self.url, self._upload_valid_pdf(self.patient1.id), format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # TEST 4: Staff -> Authorized Patient
    def test_staff_authorized_patient(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(self.url, self._upload_valid_pdf(self.patient1.id), format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # TEST 5: Owner -> Authorized Patient
    def test_owner_authorized_patient(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.post(self.url, self._upload_valid_pdf(self.patient1.id), format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    # TEST 6: Practitioner -> Unauthorized Patient
    def test_practitioner_unauthorized_patient(self):
        self.client.force_authenticate(user=self.practitioner)
        # Patient 2 is in clinic 2, practitioner is in clinic 1
        response = self.client.post(self.url, self._upload_valid_pdf(self.patient2.id), format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('patient', response.data)
        self.assertEqual(response.data['patient'][0], "You do not have permission to attach documents to this patient.")

    # TEST 7: Unauthenticated user
    def test_unauthenticated_user(self):
        # Do not authenticate
        response = self.client.post(self.url, self._upload_valid_pdf(self.patient1.id), format='multipart')
        # DRF IsAuthenticated returns 401 Unauthorized usually, or 403 Forbidden
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
