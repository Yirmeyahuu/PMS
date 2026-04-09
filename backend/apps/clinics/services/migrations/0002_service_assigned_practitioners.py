from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clinics', '0009_practitioner_duty_schedule'),
        ('clinic_services', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='assigned_practitioners',
            field=models.ManyToManyField(
                blank=True,
                help_text='Practitioners who offer this service. Empty = any practitioner.',
                related_name='services',
                to='clinics.practitioner',
            ),
        ),
    ]
