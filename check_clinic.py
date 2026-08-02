import os, sys, django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ.setdefault('ENVIRONMENT', 'development')
django.setup()
from apps.patients.models import Patient
print('Patient 2 clinic:', Patient.objects.get(id=2).clinic_id)
