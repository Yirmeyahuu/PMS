import os, sys, django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ.setdefault('ENVIRONMENT', 'development')
django.setup()

from django.test import Client
from apps.accounts.models import User
user = User.objects.get(id=1)
client = Client(HTTP_HOST='127.0.0.1')
client.force_login(user)

response = client.post('/api/patients/2/assign_consent_document/', {'document_id': 1, 'patient_case_id': 2}, content_type='application/json')
print('Status:', response.status_code)
print('Content:', response.content)
