import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.appointments.serializers import AppointmentEditSerializer
from apps.appointments.models import Appointment

appt = Appointment.objects.get(id=64)
serializer = AppointmentEditSerializer(appt, data={'patient_case': 7}, partial=True)
if not serializer.is_valid():
    print(serializer.errors)
else:
    print("Valid")
