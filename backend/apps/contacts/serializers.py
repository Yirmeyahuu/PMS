from rest_framework import serializers
from .models import Contact

class ContactSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    contact_type_display = serializers.CharField(source='get_contact_type_display', read_only=True)

    class Meta:
        model = Contact
        fields = [
            'id',
            'clinic',
            'contact_number',
            'contact_type',
            'contact_type_display',
            'first_name',
            'middle_name',
            'last_name',
            'full_name',
            'organization_name',
            'specialty',
            'license_number',
            'email',
            'phone',
            'alternative_phone',
            'address',
            'city',
            'province',
            'postal_code',
            'notes',
            'website',
            'is_active',
            'is_preferred',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'contact_number', 'created_at', 'updated_at']

    def validate(self, data):
        # Ensure clinic matches authenticated user's clinic
        request = self.context.get('request')
        if request and hasattr(request.user, 'clinic'):
            data['clinic'] = request.user.clinic
        return data

class ContactListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    full_name = serializers.ReadOnlyField()
    contact_type_display = serializers.CharField(source='get_contact_type_display', read_only=True)

    class Meta:
        model = Contact
        fields = [
            'id',
            'contact_number',
            'full_name',
            'contact_type',
            'contact_type_display',
            'organization_name',
            'specialty',
            'email',
            'phone',
            'city',
            'is_active',
            'is_preferred',
        ]