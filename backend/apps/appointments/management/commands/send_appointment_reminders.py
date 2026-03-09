"""
Management command to send appointment reminder emails AND SMS.

Usage:
    python manage.py send_appointment_reminders               # tomorrow (default)
    python manage.py send_appointment_reminders --date 2026-03-10
    python manage.py send_appointment_reminders --dry-run
    python manage.py send_appointment_reminders --days-ahead 2
    python manage.py send_appointment_reminders --retry-failed
    python manage.py send_appointment_reminders --email-only
    python manage.py send_appointment_reminders --sms-only
    python manage.py send_appointment_reminders --clinic-id 3
"""
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from datetime import timedelta
from apps.appointments.models import Appointment
from apps.appointments.email_service import send_appointment_reminder_email
from apps.appointments.sms_service import send_appointment_reminder_sms
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send appointment reminder emails and/or SMS to patients for upcoming appointments.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            help='Target appointment date (YYYY-MM-DD). Defaults to tomorrow.',
            default=None,
        )
        parser.add_argument(
            '--days-ahead',
            type=int,
            help='How many days ahead to look. Default is 1 (tomorrow).',
            default=1,
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview appointments without sending anything.',
        )
        parser.add_argument(
            '--retry-failed',
            action='store_true',
            help='Retry appointments where reminder_sent=False for today and tomorrow.',
        )
        parser.add_argument(
            '--clinic-id',
            type=int,
            help='Restrict to a specific clinic ID.',
            default=None,
        )
        parser.add_argument(
            '--email-only',
            action='store_true',
            help='Send email reminders only.',
        )
        parser.add_argument(
            '--sms-only',
            action='store_true',
            help='Send SMS reminders only.',
        )

    def handle(self, *args, **options):
        dry_run      = options['dry_run']
        retry_failed = options['retry_failed']
        days_ahead   = options['days_ahead']
        clinic_id    = options['clinic_id']
        date_str     = options['date']
        email_only   = options['email_only']
        sms_only     = options['sms_only']

        send_email = not sms_only
        send_sms   = not email_only

        # ── Determine target date ─────────────────────────────────────────────
        if date_str:
            try:
                from datetime import datetime
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                raise CommandError(f"Invalid date format '{date_str}'. Use YYYY-MM-DD.")
        else:
            target_date = timezone.now().date() + timedelta(days=days_ahead)

        # ── Header ────────────────────────────────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING(
            f"\n{'[DRY RUN] ' if dry_run else ''}Appointment Reminder Sender"
        ))
        self.stdout.write(f"  Target date  : {target_date}")
        self.stdout.write(f"  Channels     : {'Email' if send_email else ''}{'  +  SMS' if send_sms else ''}")
        self.stdout.write(f"  Retry failed : {retry_failed}")
        self.stdout.write(f"  Clinic filter: {'All' if not clinic_id else clinic_id}")
        self.stdout.write("")

        # ── Build queryset ────────────────────────────────────────────────────
        qs = Appointment.objects.filter(
            is_deleted=False,
            status__in=['SCHEDULED', 'CONFIRMED'],
        ).select_related(
            'patient', 'practitioner__user', 'clinic', 'location',
        )

        if retry_failed:
            today = timezone.now().date()
            qs = qs.filter(
                date__in=[today, today + timedelta(days=1)],
                reminder_sent=False,
            )
        else:
            qs = qs.filter(date=target_date, reminder_sent=False)

        if clinic_id:
            qs = qs.filter(clinic_id=clinic_id)

        total = qs.count()

        if total == 0:
            self.stdout.write(self.style.WARNING("  No appointments found matching criteria."))
            return

        self.stdout.write(f"  Found {total} appointment(s) to process.\n")

        # ── Dry run ───────────────────────────────────────────────────────────
        if dry_run:
            self.stdout.write(self.style.WARNING("  [DRY RUN] Would send to:\n"))
            self.stdout.write(
                f"  {'ID':>6}  {'Date':<12} {'Time':<8} {'Patient':<28} "
                f"{'Email':<28} {'Phone':<15}"
            )
            self.stdout.write("  " + "─" * 100)
            for appt in qs:
                email  = getattr(appt.patient, 'email', '') or '—'
                phone  = (
                    getattr(appt.patient, 'phone', '')
                    or getattr(appt.patient, 'contact_number', '')
                    or '—'
                )
                self.stdout.write(
                    f"  {appt.id:>6}  {str(appt.date):<12} "
                    f"{appt.start_time.strftime('%H:%M'):<8} "
                    f"{appt.patient.get_full_name():<28} "
                    f"{email:<28} {phone:<15}"
                )
            self.stdout.write(f"\n  Total: {total} appointment(s)\n")
            return

        # ── Send ──────────────────────────────────────────────────────────────
        email_summary = {'sent': 0, 'skipped': 0, 'failed': 0}
        sms_summary   = {'sent': 0, 'skipped': 0, 'failed': 0}
        errors        = []

        for appt in qs:
            patient_name = appt.patient.get_full_name()
            row_parts    = [f"  ID:{appt.id:<6} {patient_name:<30}"]

            # ── Email ─────────────────────────────────────────────────────────
            if send_email:
                email_addr = getattr(appt.patient, 'email', None)
                if not email_addr:
                    row_parts.append(self.style.WARNING("EMAIL:SKIP(no email)"))
                    email_summary['skipped'] += 1
                else:
                    ok, msg = send_appointment_reminder_email(appt)
                    if ok:
                        row_parts.append(self.style.SUCCESS(f"EMAIL:✅→{email_addr}"))
                        email_summary['sent'] += 1
                    elif 'already sent' in msg:
                        row_parts.append(self.style.WARNING("EMAIL:SKIP(already sent)"))
                        email_summary['skipped'] += 1
                    else:
                        row_parts.append(self.style.ERROR(f"EMAIL:❌({msg[:40]})"))
                        email_summary['failed'] += 1
                        errors.append({'id': appt.id, 'channel': 'email', 'error': msg})

            # ── SMS ───────────────────────────────────────────────────────────
            if send_sms:
                raw_phone = (
                    getattr(appt.patient, 'phone', None)
                    or getattr(appt.patient, 'contact_number', None)
                )
                if not raw_phone:
                    row_parts.append(self.style.WARNING("SMS:SKIP(no phone)"))
                    sms_summary['skipped'] += 1
                else:
                    ok, msg = send_appointment_reminder_sms(appt)
                    if ok:
                        row_parts.append(self.style.SUCCESS(f"SMS:✅→{raw_phone}"))
                        sms_summary['sent'] += 1
                    elif any(
                        p in msg.lower()
                        for p in ['disabled', 'not configured', 'could not be normalized']
                    ):
                        row_parts.append(self.style.WARNING(f"SMS:SKIP({msg[:30]})"))
                        sms_summary['skipped'] += 1
                    else:
                        row_parts.append(self.style.ERROR(f"SMS:❌({msg[:40]})"))
                        sms_summary['failed'] += 1
                        errors.append({'id': appt.id, 'channel': 'sms', 'error': msg})

            self.stdout.write("  ".join(row_parts))

        # ── Summary ───────────────────────────────────────────────────────────
        self.stdout.write("\n" + "─" * 60)
        if send_email:
            self.stdout.write(
                f"  📧 Email  → "
                + self.style.SUCCESS(f"Sent: {email_summary['sent']}  ")
                + self.style.WARNING(f"Skipped: {email_summary['skipped']}  ")
                + self.style.ERROR(f"Failed: {email_summary['failed']}")
            )
        if send_sms:
            self.stdout.write(
                f"  📱 SMS    → "
                + self.style.SUCCESS(f"Sent: {sms_summary['sent']}  ")
                + self.style.WARNING(f"Skipped: {sms_summary['skipped']}  ")
                + self.style.ERROR(f"Failed: {sms_summary['failed']}")
            )
        if errors:
            self.stdout.write(self.style.ERROR("\n  Errors:"))
            for err in errors:
                self.stdout.write(self.style.ERROR(
                    f"    • [{err['channel'].upper()}] ID {err['id']}: {err['error']}"
                ))
        self.stdout.write("─" * 60 + "\n")

        logger.info(
            "send_appointment_reminders complete: "
            "email(sent=%s skipped=%s failed=%s) "
            "sms(sent=%s skipped=%s failed=%s) date=%s",
            email_summary['sent'], email_summary['skipped'], email_summary['failed'],
            sms_summary['sent'],   sms_summary['skipped'],   sms_summary['failed'],
            target_date,
        )