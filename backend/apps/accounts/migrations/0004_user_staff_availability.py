from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_user_password_changed_alter_user_email_and_more'),
        ('accounts', '0002_user_position'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='duty_days',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='List of duty days for staff, e.g. ["Mon","Tue"]',
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='lunch_start_time',
            field=models.CharField(
                blank=True,
                default='12:00',
                help_text='Lunch start HH:MM',
                max_length=5,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='lunch_end_time',
            field=models.CharField(
                blank=True,
                default='13:00',
                help_text='Lunch end HH:MM',
                max_length=5,
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='duty_schedule',
            field=models.JSONField(
                blank=True,
                default=None,
                null=True,
                help_text='Per-day list of {start, end} blocks (Staff scheduling)',
            ),
        ),
    ]
