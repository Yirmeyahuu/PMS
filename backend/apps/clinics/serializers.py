from rest_framework import serializers
from .models import Clinic, Practitioner, Location


class ClinicBranchSerializer(serializers.ModelSerializer):
    """Lightweight serializer for clinic branches"""

    is_branch   = serializers.BooleanField(read_only=True)
    parent_name = serializers.CharField(source='parent_clinic.name', read_only=True)

    class Meta:
        model  = Clinic
        fields = [
            'id', 'name', 'branch_code', 'is_main_branch', 'is_branch',
            'parent_clinic', 'parent_name', 'is_active', 'city', 'province',
            'email', 'phone', 'address', 'postal_code', 'website', 'tin',
        ]
        read_only_fields = ['id', 'branch_code', 'is_branch', 'parent_name']


class ClinicSerializer(serializers.ModelSerializer):
    branches         = ClinicBranchSerializer(many=True, read_only=True)
    is_branch        = serializers.BooleanField(read_only=True)
    main_clinic_name = serializers.CharField(source='main_clinic.name', read_only=True)
    logo_url         = serializers.SerializerMethodField()

    class Meta:
        model  = Clinic
        fields = '__all__'
        read_only_fields = [
            'id', 'branch_code', 'created_at', 'updated_at',
            'is_branch', 'main_clinic_name',
        ]

    def get_logo_url(self, obj) -> str | None:
        request = self.context.get('request')
        if obj.logo and request:
            return request.build_absolute_uri(obj.logo.url)
        return None



class ClinicProfileSetupSerializer(serializers.ModelSerializer):
    """
    Used exclusively for the initial clinic profile setup.
    - name, email, phone, address, city, province are required.
    - All other fields are optional.
    On a valid save, setup_complete is flipped to True.
    """

    # ✅ email is required here — it's the clinic's business email,
    #    separate from the admin's personal email used at registration.
    email = serializers.EmailField(required=True)

    class Meta:
        model  = Clinic
        fields = [
            'name', 'email', 'phone', 'address',
            'city', 'province', 'postal_code',
            'website', 'tin', 'philhealth_accreditation',
            'logo', 'timezone',
        ]

    def validate_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Clinic name cannot be blank.")
        return value.strip()

    def validate_email(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Clinic email is required.")
        return value.lower().strip()

    def validate_phone(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Clinic phone number is required.")
        return value.strip()

    def validate_address(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Clinic address is required.")
        return value.strip()

    def validate_city(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("City is required.")
        return value.strip()

    def validate_province(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Province is required.")
        return value.strip()



class PractitionerSerializer(serializers.ModelSerializer):
    user_name  = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model  = Practitioner
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Location
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']