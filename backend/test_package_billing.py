import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from decimal import Decimal
from apps.patients.models import Patient, PatientCase
from apps.appointments.models import Appointment
from apps.clinics.models import Clinic, Location, Practitioner
from apps.clinics.services.models import Service
from apps.billing.models import Invoice, InvoiceItem, Payment

# 1. Setup
clinic = Clinic.objects.first()
patient = Patient.objects.create(clinic=clinic, first_name="Test", last_name="PackageBilling")
service = Service.objects.filter(name__icontains='OT Consultation').first()
practitioner = Practitioner.objects.filter(clinic=clinic).first()
location = Location.objects.filter(clinic=clinic).first()

# Create Case
case = PatientCase.objects.create(
    patient=patient, 
    title="Test Billing Case", 
    session_source='PACKAGE', 
    package_cost=Decimal('2500'),
    approved_sessions=5
)

# Appt 1
appt1 = Appointment.objects.create(
    clinic=clinic, patient=patient, patient_case=case, service=service,
    practitioner=practitioner, location=location, date=timezone.now().date(),
    start_time='10:00:00', end_time='11:00:00'
)

# Appt 1 Invoice
inv1 = Invoice.objects.create(clinic=clinic, patient=patient, appointment=appt1, invoice_date=timezone.now().date())
InvoiceItem.objects.create(invoice=inv1, description="OT Consultation", quantity=Decimal('1'), unit_price=Decimal('2500'))
inv1.update_totals()

# Payment 1
Payment.objects.create(invoice=inv1, amount=Decimal('1250'), payment_method='CASH')
inv1.recalculate_amount_paid()

print("Appt 1 Invoice Amount:", inv1.total_amount, "Paid:", inv1.amount_paid)

# Appt 2
appt2 = Appointment.objects.create(
    clinic=clinic, patient=patient, patient_case=case, service=service,
    practitioner=practitioner, location=location, date=timezone.now().date(),
    start_time='12:00:00', end_time='13:00:00'
)

# Appt 2 Invoice
inv2 = Invoice.objects.create(clinic=clinic, patient=patient, appointment=appt2, invoice_date=timezone.now().date())
InvoiceItem.objects.create(invoice=inv2, description="OT Consultation (Covered by Package)", quantity=Decimal('1'), unit_price=Decimal('0'))
inv2.update_totals()

# Payment 2
Payment.objects.create(invoice=inv2, amount=Decimal('1250'), payment_method='CASH')
inv2.recalculate_amount_paid()

print("Appt 2 Invoice Amount:", inv2.total_amount, "Paid:", inv2.amount_paid, "Status:", inv2.status)

case.refresh_from_db()
print("Case Outstanding Balance:", case.outstanding_balance)
print("Case Package Status:", case.package_status)

# Cleanup
case.delete()
patient.delete()
