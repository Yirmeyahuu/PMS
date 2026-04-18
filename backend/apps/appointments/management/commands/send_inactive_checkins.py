"""
Send wellness check-ins to patients who haven't visited in X months.

Configurable per clinic via inactive_patient_months setting.
"""
import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.clinics.models import Clinic, ClinicCommunicationSettings
from apps.notifications.services.communication_service import send_inactive_patient_checkin
from apps.patients.models import Patient

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send wellness check-in messages to inactive patients.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Preview without sending.')
        parser.add_argument('--clinic-id', type=int, default=None)
        parser.add_argument('--limit', type=int, default=50, help='Max patients to process per clinic.')

    def handle(self, *args, **options):
        dry_run   = options['dry_run']
        clinic_id = options['clinic_id']
        limit     = options['limit']
        now       = timezone.now()

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\n{'[DRY RUN] ' if dry_run else ''}Inactive Patient Check-in Sender"
        ))

        clinic_qs = Clinic.objects.filter(main_clinic__isnull=True)
        if clinic_id:
            clinic_qs = clinic_qs.filter(id=clinic_id)

        total_sent = 0
        total_skipped = 0

        for clinic in clinic_qs:
            settings_obj = ClinicCommunicationSettings.get_for_clinic(clinic)
            if not settings_obj.inactive_checkin_enabled:
                continue

            months = settings_obj.inactive_patient_months
            cutoff_date = (now - timedelta(days=months * 30)).date()

            branch_ids = list(
                Clinic.objects.filter(main_clinic=clinic).values_list('id', flat=True)
            ) + [clinic.id]

            # Find patients with last_visit_date before cutoff
            # and haven't been sent a check-in recently (within 30 days)
            recent_checkin_cutoff = now - timedelta(days=30)

            patients = Patient.objects.filter(
                clinic_id__in=branch_ids,
                is_archived=False,
                last_visit_date__isnull=False,
                last_visit_date__lte=cutoff_date,
            ).filter(
                Q(last_checkin_sent_at__isnull=True)
                | Q(last_checkin_sent_at__lt=recent_checkin_cutoff)
            )[:limit]

            if not patients:
                continue

            self.stdout.write(f"\n  Clinic: {clinic.name} — {len(patients)} inactive patient(s)")

            for patient in patients:
                # Verify no upcoming appointments
                has_upcoming = Appointment.objects.filter(
                    patient=patient,
                    clinic_id__in=branch_ids,
                    is_deleted=False,
                    status__in=['SCHEDULED', 'CONFIRMED'],
                    date__gte=now.date(),
                ).exists()

                if has_upcoming:
                    total_skipped += 1
                    continue

                patient_name = patient.get_full_name()
                if dry_run:
                    self.stdout.write(f"    [DRY] {patient_name} — last visit: {patient.last_visit_date}")
                    total_skipped += 1
                    continue

                try:
                    result = send_inactive_patient_checkin(patient, clinic)
                    if result.get('skipped'):
                        self.stdout.write(f"    SKIP  {patient_name}: {result.get('reason')}")
                        total_skipped += 1
                    else:
                        self.stdout.write(self.style.SUCCESS(f"    SENT  {patient_name}"))
                        total_sent += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"    FAIL  {patient_name}: {e}"))
                    logger.error("Inactive check-in failed for patient %s: %s", patient.id, e)

        self.stdout.write(f"\n  Sent: {total_sent} | Skipped: {total_skipped}\n")
