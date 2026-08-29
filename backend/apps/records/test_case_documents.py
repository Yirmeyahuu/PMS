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
        
        self.user1 = User.objects.create_user(email="user1@example.com", password="password", first_name="User", last_name="One", clinic=self.clinic1)
        self.user2 = User.objects.create_user(email="user2@example.com", password="password", first_name="User", last_name="Two", clinic=self.clinic2)
        
        self.patient1 = Patient.objects.create(first_name="John", last_name="Doe", clinic=self.clinic1)
        self.patient2 = Patient.objects.create(first_name="Jane", last_name="Smith", clinic=self.clinic2)
        
        self.url = reverse('case-documents-list')
        
    def test_upload_valid_pdf(self):
        self.client.force_authenticate(user=self.user1)
        pdf_file = SimpleUploadedFile("test.pdf", b"file_content", content_type="application/pdf")
        
        data = {
            'patient': self.patient1.id,
            'title': 'Test Document',
            'category': 'CLINICAL_NOTE',
            'file': pdf_file
        }
        
        response = self.client.post(self.url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CaseDocument.objects.count(), 1)
        
    def test_upload_invalid_type(self):
        self.client.force_authenticate(user=self.user1)
        img_file = SimpleUploadedFile("test.jpg", b"file_content", content_type="image/jpeg")
        
        data = {
            'patient': self.patient1.id,
            'title': 'Test Document',
            'category': 'CLINICAL_NOTE',
            'file': img_file
        }
        
        response = self.client.post(self.url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('file', response.data)
        
    def test_upload_large_file(self):
        self.client.force_authenticate(user=self.user1)
        large_content = b"0" * (6 * 1024 * 1024)
        large_file = SimpleUploadedFile("test.pdf", large_content, content_type="application/pdf")
        
        data = {
            'patient': self.patient1.id,
            'title': 'Large Document',
            'category': 'CLINICAL_NOTE',
            'file': large_file
        }
        
        response = self.client.post(self.url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('file', response.data)
        
    def test_upload_wrong_clinic_patient(self):
        self.client.force_authenticate(user=self.user1)
        pdf_file = SimpleUploadedFile("test.pdf", b"file_content", content_type="application/pdf")
        
        data = {
            'patient': self.patient2.id,
            'title': 'Test Document',
            'category': 'CLINICAL_NOTE',
            'file': pdf_file
        }
        
        response = self.client.post(self.url, data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('patient', response.data)
