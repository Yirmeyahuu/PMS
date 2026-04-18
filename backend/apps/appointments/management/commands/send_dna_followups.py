"""
Send DNA/decline follow-ups for appointments marked as DNA or NO_SHOW.

Includes branch-specific rebooking link.
"""
import logging

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.notifications.services.communication_service import send_dna_followup

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send DNA follow-up messages with rebooking links.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Preview without sending.')
        parser.add_argument('--clinic-id', type=int, default=None)

    def handle(self, *args, **options):
        dry_run   = options['dry_run']
        clinic_id = options['clinic_id']

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\n{'[DRY RUN] ' if dry_run else ''}DNA Follow-up Sender"
        ))

        qs = Appointment.objects.filter(
            is_deleted=False,
            status__in=['DNA', 'NO_SHOW'],
            dna_followup_sent=False,
        ).select_related('patient', 'practitioner__user', 'clinic', 'location')

        # Also include declined appointments
        declined = Appointment.objects.filter(
            is_deleted=False,
            confirmation_status='DECLINED',
            dna_followup_sent=False,
        ).select_related('patient', 'practitioner__user', 'clinic', 'location')

        combined = (qs | declined).distinct()

        if clinic_id:
            combined = combined.filter(clinic_id=clinic_id)

        total = combined.count()
        if total == 0:
            self.stdout.write(self.style.WARNING("  No DNA appointments found."))
            return

        self.stdout.write(f"  Found {total} appointment(s) needing follow-up.\n")

        sent = 0
        skipped = 0

        for appt in combined:
            patient_name = appt.patient.get_full_name()
            if dry_run:
                self.stdout.write(f"    [DRY] {patient_name} — {appt.date}")
                skipped += 1
                continue

            try:
                result = send_dna_followup(appt)
                if result.get('skipped'):
                    self.stdout.write(f"    SKIP  {patient_name}: {result.get('reason')}")
                    skipped += 1
                else:
                    self.stdout.write(self.style.SUCCESS(f"    SENT  {patient_name}"))
                    sent += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"    FAIL  {patient_name}: {e}"))
                logger.error("DNA follow-up failed for appt %s: %s", appt.id, e)

        self.stdout.write(f"\n  Sent: {sent} | Skipped: {skipped}\n")
