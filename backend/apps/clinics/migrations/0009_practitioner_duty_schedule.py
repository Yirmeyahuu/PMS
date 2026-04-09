from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clinics', '0008_practitioner_discipline'),
    ]

    operations = [
        migrations.AddField(
            model_name='practitioner',
            name='duty_schedule',
            field=models.JSONField(
                blank=True,
                default=None,
                null=True,
                help_text='Per-day list of {start, end} blocks for split-shift support',
            ),
        ),
    ]
