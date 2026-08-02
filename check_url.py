import os, sys, django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ.setdefault('ENVIRONMENT', 'development')
django.setup()

from django.urls import resolve
try:
    match = resolve('/api/patients/2/assign_consent_document/')
    print("Match:", match.view_name)
except Exception as e:
    print("Error:", e)
