"""
Migration: Convert per-user notifications to clinic-wide notifications.

Steps:
  1. Create the NotificationRead join table.
  2. Add `clinic` FK to Notification (nullable first).
  3. Backfill `clinic` from the old `user` FK.
  4. Create NotificationRead rows for already-read notifications.
  5. Deduplicate: keep one notification per (clinic, title, message, created_at),
     merge read receipts, delete duplicates.
  6. Remove old `user`, `is_read`, `read_at` columns.
  7. Make `clinic` non-nullable.
"""
from django.db import migrations, models
import django.db.models.deletion


def backfill_clinic_and_reads(apps, schema_editor):
    """
    For every existing Notification:
      - Set notification.clinic = notification.user.clinic  (the main clinic)
      - If notification.is_read, create a NotificationRead row.
    """
    Notification     = apps.get_model('notifications', 'Notification')
    NotificationRead = apps.get_model('notifications', 'NotificationRead')

    reads_to_create = []

    for notif in Notification.objects.select_related('user', 'user__clinic').iterator(chunk_size=500):
        if notif.user and notif.user.clinic:
            # Resolve to the main clinic
            clinic = notif.user.clinic
            if hasattr(clinic, 'parent_clinic') and clinic.parent_clinic_id:
                notif.clinic_id = clinic.parent_clinic_id
            else:
                notif.clinic_id = clinic.id
            notif.save(update_fields=['clinic_id'])

            # Preserve read status
            if notif.is_read:
                reads_to_create.append(
                    NotificationRead(
                        notification=notif,
                        user=notif.user,
                    )
                )

    if reads_to_create:
        NotificationRead.objects.bulk_create(reads_to_create, ignore_conflicts=True)


def deduplicate_notifications(apps, schema_editor):
    """
    After backfill, many notifications are duplicates (same content sent to
    multiple users).  We keep the earliest one per group and merge reads.
    """
    from django.db.models import Min
    Notification     = apps.get_model('notifications', 'Notification')
    NotificationRead = apps.get_model('notifications', 'NotificationRead')

    # Group by content identity
    groups = (
        Notification.objects
        .filter(clinic__isnull=False)
        .values('clinic', 'notification_type', 'title', 'message', 'link_url', 'appointment', 'clinic_branch')
        .annotate(keep_id=Min('id'))
    )

    for group in groups:
        keep_id = group['keep_id']

        # Find all duplicates
        dup_qs = Notification.objects.filter(
            clinic_id=group['clinic'],
            notification_type=group['notification_type'],
            title=group['title'],
            message=group['message'],
            link_url=group['link_url'],
            appointment_id=group['appointment'],
            clinic_branch_id=group['clinic_branch'],
        ).exclude(id=keep_id)

        dup_ids = list(dup_qs.values_list('id', flat=True))

        if not dup_ids:
            continue

        # Re-point reads from duplicates to the kept notification
        NotificationRead.objects.filter(
            notification_id__in=dup_ids
        ).update(notification_id=keep_id)

        # Delete duplicates
        dup_qs.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0002_notification_appointment_notification_clinic_branch_and_more'),
        ('accounts', '0001_initial'),
        ('clinics', '0001_initial'),
    ]

    operations = [
        # 1. Create NotificationRead table
        migrations.CreateModel(
            name='NotificationRead',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('read_at', models.DateTimeField(auto_now_add=True)),
                ('notification', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reads',
                    to='notifications.notification',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notification_reads',
                    to='accounts.user',
                )),
            ],
            options={
                'db_table': 'notification_reads',
                'unique_together': {('notification', 'user')},
            },
        ),
        migrations.AddIndex(
            model_name='notificationread',
            index=models.Index(fields=['user', 'notification'], name='notif_read_user_notif_idx'),
        ),

        # 2. Add clinic FK (nullable for now)
        migrations.AddField(
            model_name='notification',
            name='clinic',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='notifications',
                to='clinics.clinic',
                help_text='The root/main clinic this notification belongs to.',
            ),
        ),

        # 3. Backfill clinic + create read receipts
        migrations.RunPython(backfill_clinic_and_reads, migrations.RunPython.noop),

        # 4. Deduplicate
        migrations.RunPython(deduplicate_notifications, migrations.RunPython.noop),

        # 5. Remove old per-user fields
        migrations.RemoveField(model_name='notification', name='user'),
        migrations.RemoveField(model_name='notification', name='is_read'),
        migrations.RemoveField(model_name='notification', name='read_at'),

        # 6. Make clinic non-nullable
        migrations.AlterField(
            model_name='notification',
            name='clinic',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='notifications',
                to='clinics.clinic',
                help_text='The root/main clinic this notification belongs to.',
            ),
        ),

        # 7. Update indexes (remove old user-based indexes, add clinic-based)
        migrations.AlterModelOptions(
            name='notification',
            options={'ordering': ['-created_at']},
        ),

        # Fix the related_name on clinic_branch to avoid clash
        migrations.AlterField(
            model_name='notification',
            name='clinic_branch',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='branch_notifications',
                to='clinics.clinic',
            ),
        ),
    ]