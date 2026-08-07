import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.config.settings')
django.setup()

from apps.patients.models import Patient, PatientCase
from apps.clinics.models import Clinic
from apps.clinics.services.models import Service
from apps.appointments.models import Appointment
from apps.patients.services.case_service import auto_populate_package_case
from datetime import date, time

print("Setting up test data...")
clinic = Clinic.objects.first()
patient = Patient.objects.first()

service = Service.objects.create(
    clinic=clinic,
    name="Regression Test Package",
    is_package=True,
    session_allocation=15,
    price=5000
)

# Test 1: Package Consultation -> Auto New Case
appt1 = Appointment.objects.create(
    clinic=clinic, patient=patient, service=service,
    date=date.today(), start_time=time(9,0), end_time=time(10,0)
)
auto_populate_package_case(appt1)
appt1.refresh_from_db()
print(f"Test 1 (Auto New Case): Approved={appt1.patient_case.approved_sessions}, Remaining={appt1.patient_case.remaining_sessions}")
assert appt1.patient_case.approved_sessions == 15
assert appt1.patient_case.completed_sessions == 0

# Test 2: Second package appointment, Same Case
appt2 = Appointment.objects.create(
    clinic=clinic, patient=patient, service=service,
    patient_case=appt1.patient_case,
    date=date.today(), start_time=time(10,0), end_time=time(11,0)
)
# Simulate 1 session completed
appt1.patient_case.completed_sessions = 1
appt1.patient_case.save()

auto_populate_package_case(appt2)
appt2.refresh_from_db()
print(f"Test 2 (Same Case): Approved={appt2.patient_case.approved_sessions}, Completed={appt2.patient_case.completed_sessions}")
assert appt2.patient_case.approved_sessions == 15
assert appt2.patient_case.completed_sessions == 1 # Unchanged

# Test 3: Manual Case with existing allocation
manual_case = PatientCase.objects.create(
    patient=patient, title="Manual Test Case", status='OPEN',
    approved_sessions=10, completed_sessions=5
)
appt3 = Appointment.objects.create(
    clinic=clinic, patient=patient, service=service,
    patient_case=manual_case,
    date=date.today(), start_time=time(11,0), end_time=time(12,0)
)
auto_populate_package_case(appt3)
appt3.refresh_from_db()
print(f"Test 3 (Manual Case): Approved={appt3.patient_case.approved_sessions}")
assert appt3.patient_case.approved_sessions == 10

# Test 4: Uninitialized Case (created inline by frontend)
inline_case = PatientCase.objects.create(
    patient=patient, title="Inline Blank Case", status='OPEN',
    approved_sessions=None, completed_sessions=None
)
appt4 = Appointment.objects.create(
    clinic=clinic, patient=patient, service=service,
    patient_case=inline_case,
    date=date.today(), start_time=time(12,0), end_time=time(13,0)
)
auto_populate_package_case(appt4)
appt4.refresh_from_db()
print(f"Test 4 (Inline Blank Case): Approved={appt4.patient_case.approved_sessions}, Completed={appt4.patient_case.completed_sessions}, Cost={appt4.patient_case.package_cost}")
assert appt4.patient_case.approved_sessions == 15
assert appt4.patient_case.completed_sessions == 0
assert appt4.patient_case.package_cost == 5000

print("All regression tests passed successfully!")

# Clean up
service.delete()
appt1.delete()
appt2.delete()
appt3.delete()
appt4.delete()
manual_case.delete()
inline_case.delete()
appt1.patient_case.delete()

