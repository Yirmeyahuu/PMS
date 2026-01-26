from rest_framework import serializers
from .models import PhilHealthClaim, HMOClaim


class PhilHealthClaimSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)
    
    class Meta:
        model = PhilHealthClaim
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class HMOClaimSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)
    
    class Meta:
        model = HMOClaim
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']