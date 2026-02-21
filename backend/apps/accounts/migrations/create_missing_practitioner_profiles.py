from django.db import migrations

def create_missing_practitioner_profiles(apps, schema_editor):
    """
    Create Practitioner profiles for all users with role='PRACTITIONER'
    who don't have a Practitioner profile yet.
    """
    User = apps.get_model('accounts', 'User')
    Practitioner = apps.get_model('clinics', 'Practitioner')
    
    # Find all users with PRACTITIONER role
    practitioner_users = User.objects.filter(role='PRACTITIONER', is_deleted=False)
    
    created_count = 0
    for user in practitioner_users:
        # Check if Practitioner profile already exists
        if not Practitioner.objects.filter(user=user).exists():
            # Create Practitioner profile
            # ✅ REMOVED: is_active (not in Practitioner model)
            Practitioner.objects.create(
                user=user,
                clinic=user.clinic,
                license_number='',
                specialization='',
                consultation_fee=0,
                is_accepting_patients=True
            )
            created_count += 1
            print(f"✅ Created Practitioner profile for: {user.email}")
    
    print(f"\n✅ Migration complete! Created {created_count} Practitioner profiles.")

def reverse_migration(apps, schema_editor):
    """
    Reverse migration - optionally delete auto-created profiles
    """
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_user_password_changed_alter_user_email_and_more'),
        ('clinics', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_missing_practitioner_profiles, reverse_migration),
    ]