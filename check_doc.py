import os, sys, django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ.setdefault('ENVIRONMENT', 'development')
django.setup()
from apps.records.models import CaseDocument
doc = CaseDocument.objects.first()
if doc:
    print('Doc ID:', doc.id, 'File:', doc.file.url if doc.file else None)
else:
    print('No case documents found')
