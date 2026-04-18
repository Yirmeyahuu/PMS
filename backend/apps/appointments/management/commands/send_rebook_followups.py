"""
Send no-rebook follow-ups for patients who didn't rebook after DNA/decline.

Waits X days (configurable per clinic) before sending.
"""
import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.clinics.models import Clinic, ClinicCommunicationSettings
from apps.notifications.services.communication_service import send_rebook_followup

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send no-rebook follow-up messages to patients who haven\'t rebooked after missing an appointment.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Preview without sending.')
        parser.add_argument('--clinic-id', type=int, default=None)

    def handle(self, *args, **options):
        dry_run   = options['dry_run']
        clinic_id = options['clinic_id']
        now       = timezone.now()

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\n{'[DRY RUN] ' if dry_run else ''}No-Rebook Follow-up Sender"
        ))

        clinic_qs = Clinic.objects.filter(main_clinic__isnull=True)
        if clinic_id:
            clinic_qs = clinic_qs.filter(id=clinic_id)

        total_sent = 0
        total_skipped = 0

        for clinic in clinic_qs:
            settings_obj = ClinicCommunicationSettings.get_for_clinic(clinic)
            if not settings_obj.rebook_followup_enabled:
                continue

            followup_days = settings_obj.no_rebook_followup_days
            cutoff_date = (now - timedelta(days=followup_days)).date()

            branch_ids = list(
                Clinic.objects.filter(main_clinic=clinic).values_list('id', flat=True)
            ) + [clinic.id]

            # Find DNA/declined appointments that:
            # - Had DNA follow-up sent
            # - No rebook follow-up yet
            # - DNA follow-up was sent >= X days ago
            appointments = Appointment.objects.filter(
                clinic_id__in=branch_ids,
                is_deleted=False,
                dna_followup_sent=True,
                rebook_followup_sent=False,
                dna_followup_sent_at__date__lte=cutoff_date,
            ).select_related('patient', 'clinic')

            for appt in appointments:
                # Check if patient has booked a new appointment since
                has_new = Appointment.objects.filter(
                    patient=appt.patient,
                    clinic_id__in=branch_ids,
                    is_deleted=False,
                    status__in=['SCHEDULED', 'CONFIRMED'],
                    date__gte=appt.date,
                    created_at__gt=appt.dna_followup_sent_at,
                ).exists()

                if has_new:
                    total_skipped += 1
                    continue

                patient_name = appt.patient.get_full_name()
                if dry_run:
                    self.stdout.write(f"    [DRY] {patient_name} — DNA on {appt.date}")
                    total_skipped += 1
                    continue

                try:
                    result = send_rebook_followup(appt)
                    if result.get('skipped'):
                        self.stdout.write(f"    SKIP  {patient_name}: {result.get('reason')}")
                        total_skipped += 1
                    else:
                        self.stdout.write(self.style.SUCCESS(f"    SENT  {patient_name}"))
                        total_sent += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"    FAIL  {patient_name}: {e}"))
                    logger.error("Rebook follow-up failed for appt %s: %s", appt.id, e)

        self.stdout.write(f"\n  Sent: {total_sent} | Skipped: {total_skipped}\n")
