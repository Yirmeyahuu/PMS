import os, sys, django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ.setdefault('ENVIRONMENT', 'development')
django.setup()
from apps.patients.models import Patient
p = Patient.objects.get(id=2)
print('Patient 2 deleted?', p.is_deleted, 'active?', p.is_active)
