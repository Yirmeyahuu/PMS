from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from apps.billing.models import Invoice, InvoiceItem
from apps.patients.models import Patient, PatientCase
from apps.appointments.models import Appointment
from apps.clinics.models import Clinic
from apps.billing.serializers import InvoiceSerializer

class PreviousOutstandingTests(TestCase):
    def setUp(self):
        self.clinic = Clinic.objects.create(name="Test Clinic")
        self.patient = Patient.objects.create(first_name="John", last_name="Doe", clinic=self.clinic, date_of_birth='1990-01-01')
        self.other_patient = Patient.objects.create(first_name="Jane", last_name="Smith", clinic=self.clinic, date_of_birth='1990-01-01')
        
    def create_invoice(self, patient, date, amount='100.00', amount_paid='0.00', status='DRAFT', is_package=False):
        appt = Appointment.objects.create(patient=patient, clinic=self.clinic, date=date, start_time="10:00", end_time="11:00")
        
        patient_case = None
        if is_package:
            patient_case = PatientCase.objects.create(patient=patient, title="Package", session_source='PACKAGE')
            
        inv = Invoice.objects.create(
            clinic=self.clinic,
            patient=patient,
            appointment=appt if not is_package else None,
            patient_case=patient_case,
            invoice_date=date,
            status=status,
            amount_paid=Decimal(amount_paid),
        )
        # Add an item so total_amount is calculated
        InvoiceItem.objects.create(
            invoice=inv,
            description="Consultation",
            quantity=1,
            unit_price=Decimal(amount),
        )
        inv.update_totals()
        return inv

    def test_one_previous_unpaid(self):
        inv1 = self.create_invoice(self.patient, timezone.now().date() - timedelta(days=5), amount='100.00', amount_paid='0.00')
        inv2 = self.create_invoice(self.patient, timezone.now().date(), amount='150.00', amount_paid='0.00')
        
        serializer = InvoiceSerializer(inv2)
        balances = serializer.data['previous_outstanding_balances']
        self.assertEqual(len(balances), 1)
        self.assertEqual(balances[0]['invoice_number'], inv1.invoice_number)
        self.assertEqual(balances[0]['balance_due'], '100.00')
        self.assertEqual(serializer.data['patient_previous_outstanding_total'], '100.00')

    def test_previous_fully_paid_excluded(self):
        inv1 = self.create_invoice(self.patient, timezone.now().date() - timedelta(days=5), amount='100.00', amount_paid='100.00', status='PAID')
        inv2 = self.create_invoice(self.patient, timezone.now().date(), amount='150.00', amount_paid='0.00')
        
        serializer = InvoiceSerializer(inv2)
        balances = serializer.data['previous_outstanding_balances']
        self.assertEqual(len(balances), 0)
        self.assertEqual(serializer.data['patient_previous_outstanding_total'], '0.00')

    def test_multiple_previous_unpaid(self):
        inv1 = self.create_invoice(self.patient, timezone.now().date() - timedelta(days=10), amount='100.00', amount_paid='50.00')
        inv2 = self.create_invoice(self.patient, timezone.now().date() - timedelta(days=5), amount='200.00', amount_paid='0.00')
        inv3 = self.create_invoice(self.patient, timezone.now().date(), amount='150.00', amount_paid='0.00')
        
        serializer = InvoiceSerializer(inv3)
        balances = serializer.data['previous_outstanding_balances']
        self.assertEqual(len(balances), 2)
        self.assertEqual(serializer.data['patient_previous_outstanding_total'], '250.00')

    def test_different_patient_isolated(self):
        inv1 = self.create_invoice(self.other_patient, timezone.now().date() - timedelta(days=5), amount='100.00', amount_paid='0.00')
        inv2 = self.create_invoice(self.patient, timezone.now().date(), amount='150.00', amount_paid='0.00')
        
        serializer = InvoiceSerializer(inv2)
        balances = serializer.data['previous_outstanding_balances']
        self.assertEqual(len(balances), 0)

    def test_cancelled_with_balance_included(self):
        inv1 = self.create_invoice(self.patient, timezone.now().date() - timedelta(days=5), amount='100.00', amount_paid='0.00', status='CANCELLED')
        inv2 = self.create_invoice(self.patient, timezone.now().date(), amount='150.00', amount_paid='0.00')
        
        serializer = InvoiceSerializer(inv2)
        balances = serializer.data['previous_outstanding_balances']
        self.assertEqual(len(balances), 1)
        self.assertEqual(serializer.data['patient_previous_outstanding_total'], '100.00')
        
    def test_package_invoice_returns_empty(self):
        inv1 = self.create_invoice(self.patient, timezone.now().date() - timedelta(days=5), amount='100.00', amount_paid='0.00')
        pkg_inv = self.create_invoice(self.patient, timezone.now().date(), amount='150.00', amount_paid='0.00', is_package=True)
        
        serializer = InvoiceSerializer(pkg_inv)
        balances = serializer.data['previous_outstanding_balances']
        self.assertEqual(len(balances), 0)
        self.assertEqual(serializer.data['patient_previous_outstanding_total'], '0.00')
