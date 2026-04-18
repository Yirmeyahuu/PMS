"""
Send Y/N appointment reminders using the communication workflow.

Uses clinic-configurable reminder_hours_before setting.
"""
import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.appointments.models import Appointment
from apps.clinics.models import Clinic, ClinicCommunicationSettings
from apps.notifications.services.communication_service import send_appointment_reminder_with_reply

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send Y/N appointment reminders via the automated communication workflow.'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='Preview without sending.')
        parser.add_argument('--clinic-id', type=int, default=None, help='Restrict to a specific clinic.')

    def handle(self, *args, **options):
        dry_run   = options['dry_run']
        clinic_id = options['clinic_id']
        now       = timezone.now()

        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\n{'[DRY RUN] ' if dry_run else ''}Communication Reminder Sender"
        ))

        # Get all main clinics (or a specific one)
        clinic_qs = Clinic.objects.filter(main_clinic__isnull=True)
        if clinic_id:
            clinic_qs = clinic_qs.filter(id=clinic_id)

        total_sent = 0
        total_skipped = 0

        for clinic in clinic_qs:
            settings_obj = ClinicCommunicationSettings.get_for_clinic(clinic)
            if not settings_obj.reminders_enabled:
                continue

            hours_before = settings_obj.reminder_hours_before
            reminder_window_start = now + timedelta(hours=hours_before - 1)
            reminder_window_end = now + timedelta(hours=hours_before + 1)

            # Find appointments in all branches of this clinic
            branch_ids = list(
                Clinic.objects.filter(main_clinic=clinic).values_list('id', flat=True)
            ) + [clinic.id]

            appointments = Appointment.objects.filter(
                clinic_id__in=branch_ids,
                is_deleted=False,
                status__in=['SCHEDULED', 'CONFIRMED'],
                reminder_sent=False,
            ).select_related('patient', 'practitioner__user', 'clinic', 'location', 'service')

            # Filter by reminder window
            eligible = []
            for appt in appointments:
                appt_datetime = timezone.make_aware(
                    timezone.datetime.combine(appt.date, appt.start_time),
                    timezone.get_current_timezone(),
                ) if timezone.is_naive(timezone.datetime.combine(appt.date, appt.start_time)) else timezone.datetime.combine(appt.date, appt.start_time)

                if reminder_window_start <= appt_datetime <= reminder_window_end:
                    eligible.append(appt)

            if not eligible:
                continue

            self.stdout.write(f"\n  Clinic: {clinic.name} — {len(eligible)} reminder(s)")

            for appt in eligible:
                patient_name = appt.patient.get_full_name()
                if dry_run:
                    self.stdout.write(f"    [DRY] {patient_name} — {appt.date} {appt.start_time}")
                    total_skipped += 1
                    continue

                try:
                    result = send_appointment_reminder_with_reply(appt)
                    if result.get('skipped'):
                        self.stdout.write(f"    SKIP  {patient_name}: {result.get('reason')}")
                        total_skipped += 1
                    else:
                        self.stdout.write(self.style.SUCCESS(f"    SENT  {patient_name}"))
                        total_sent += 1
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"    FAIL  {patient_name}: {e}"))
                    logger.error("Reminder failed for appt %s: %s", appt.id, e)

        self.stdout.write(f"\n  Sent: {total_sent} | Skipped: {total_skipped}\n")
