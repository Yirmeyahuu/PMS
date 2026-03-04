from rest_framework import serializers
from .models import Service


class ServiceSerializer(serializers.ModelSerializer):
    image_url  = serializers.SerializerMethodField()
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)

    class Meta:
        model  = Service
        fields = [
            'id', 'clinic', 'clinic_name',
            'name', 'description', 'duration_minutes',
            'price', 'image', 'image_url', 'color_hex',
            'sort_order', 'is_active', 'show_in_portal',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'clinic', 'clinic_name', 'image_url', 'created_at', 'updated_at']

    def get_image_url(self, obj) -> str | None:
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def validate_name(self, value):
        """Name must be unique per clinic — exclude current instance on update."""
        request = self.context.get('request')
        qs = Service.objects.filter(
            clinic=request.user.clinic,
            name__iexact=value,
            is_deleted=False,
        )
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "A service with this name already exists in your clinic."
            )
        return value

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price must be a positive number.")
        return value

    def validate_duration_minutes(self, value):
        if value <= 0:
            raise serializers.ValidationError("Duration must be greater than 0 minutes.")
        return value

    def validate_color_hex(self, value):
        import re
        if not re.match(r'^#[0-9A-Fa-f]{6}$', value):
            raise serializers.ValidationError("Enter a valid hex color e.g. #0D9488")
        return value