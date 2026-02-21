from rest_framework import serializers
from .models import Clinic, Practitioner, Location



class ClinicBranchSerializer(serializers.ModelSerializer):
    """Lightweight serializer for clinic branches"""
    
    is_branch = serializers.BooleanField(read_only=True)
    parent_name = serializers.CharField(source='parent_clinic.name', read_only=True)
    
    class Meta:
        model = Clinic
        fields = [
            'id', 'name', 'branch_code', 'is_main_branch', 'is_branch',
            'parent_clinic', 'parent_name', 'is_active', 'city', 'province'
        ]
        read_only_fields = ['id', 'is_branch', 'parent_name']


class ClinicSerializer(serializers.ModelSerializer):
    branches = ClinicBranchSerializer(many=True, read_only=True)
    is_branch = serializers.BooleanField(read_only=True)
    main_clinic_name = serializers.CharField(source='main_clinic.name', read_only=True)
    
    class Meta:
        model = Clinic
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_branch', 'main_clinic_name']


class PractitionerSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = Practitioner
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']