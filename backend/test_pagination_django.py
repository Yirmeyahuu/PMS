import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from apps.users.models import User
from rest_framework_simplejwt.tokens import RefreshToken

user = User.objects.first()
refresh = RefreshToken.for_user(user)
client = Client(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')

response = client.get('/api/communication-logs/?patient=17&page=2&page_size=10')
print("Status Code:", response.status_code)
print("Data count:", len(response.json().get('results', [])))
