from rest_framework import serializers
from apps.clinics.models import Practitioner
from .models import Service, DISCIPLINE_CHOICES


class ServiceSerializer(serializers.ModelSerializer):
    image_url   = serializers.SerializerMethodField()
    clinic_name = serializers.CharField(source='clinic.name', read_only=True)

    # Human-readable label for the discipline value
    discipline_label = serializers.SerializerMethodField()

    # Legacy field — kept for appointment backward-compat; not writable via API
    assigned_practitioners = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Practitioner.objects.filter(is_deleted=False),
        required=False,
    )

    class Meta:
        model  = Service
        fields = [
            'id', 'clinic', 'clinic_name',
            'name', 'description', 'duration_minutes',
            'price', 'image', 'image_url', 'color_hex',
            'discipline', 'discipline_label',
            'sort_order', 'is_active', 'show_in_portal',
            'is_package', 'session_allocation',
            'assigned_practitioners',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'clinic', 'clinic_name', 'image_url',
            'discipline_label', 'created_at', 'updated_at',
        ]

    def get_image_url(self, obj) -> str | None:
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_discipline_label(self, obj) -> str:
        """Return the human-readable label for the discipline value."""
        mapping = dict(DISCIPLINE_CHOICES)
        return mapping.get(obj.discipline, obj.discipline)

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

    def validate_discipline(self, value):
        valid_values = [c[0] for c in DISCIPLINE_CHOICES]
        if value not in valid_values:
            raise serializers.ValidationError(
                f"Invalid discipline. Choose from: {', '.join(valid_values)}."
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

    def validate(self, attrs):
        # Validate package requirements
        is_package = attrs.get('is_package', getattr(self.instance, 'is_package', False))
        session_allocation = attrs.get('session_allocation', getattr(self.instance, 'session_allocation', None))

        if is_package:
            if not session_allocation or session_allocation < 1:
                raise serializers.ValidationError({
                    'session_allocation': 'Session allocation must be at least 1 for a package service.'
                })
        else:
            attrs['session_allocation'] = None

        return attrs