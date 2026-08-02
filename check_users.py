import os, sys, django
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
os.environ.setdefault('ENVIRONMENT', 'development')
django.setup()
from apps.accounts.models import User
for u in User.objects.all():
    print('User', u.id, u.email, 'clinic:', getattr(u, 'clinic_id', None))
