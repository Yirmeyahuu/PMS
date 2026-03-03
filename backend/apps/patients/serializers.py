from rest_framework import serializers
from .models import (
    Patient, IntakeForm,
    ServiceCategory, PortalService, 
    PortalLink, PortalBooking,
)


class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    age = serializers.SerializerMethodField()
    
    class Meta:
        model = Patient
        fields = '__all__'
        read_only_fields = ['id', 'patient_number', 'created_at', 'updated_at']
    
    def get_age(self, obj):
        from datetime import date
        today = date.today()
        return today.year - obj.date_of_birth.year - (
            (today.month, today.day) < (obj.date_of_birth.month, obj.date_of_birth.day)
        )


class IntakeFormSerializer(serializers.ModelSerializer):
    patient_name      = serializers.CharField(source='patient.get_full_name', read_only=True)
    completed_by_name = serializers.CharField(source='completed_by.get_full_name', read_only=True)
    
    class Meta:
        model = IntakeForm
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


# ─── Portal serializers ───────────────────────────────────────────────────────

class ServiceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = ServiceCategory
        fields = ['id', 'name', 'description', 'sort_order', 'is_active']


class PortalServiceSerializer(serializers.ModelSerializer):      # ✅ renamed class
    category_name = serializers.CharField(source='category.name', read_only=True)
    image_url     = serializers.SerializerMethodField()

    class Meta:
        model  = PortalService                                   # ✅ PortalService
        fields = [
            'id', 'name', 'description', 'duration_minutes',
            'price', 'image_url', 'is_active', 'sort_order',
            'category', 'category_name',
        ]

    def get_image_url(self, obj) -> str | None:
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class PortalLinkPublicSerializer(serializers.ModelSerializer):
    clinic_name    = serializers.CharField(source='clinic.name', read_only=True)
    clinic_logo    = serializers.SerializerMethodField()
    clinic_address = serializers.SerializerMethodField()
    categories     = serializers.SerializerMethodField()

    class Meta:
        model  = PortalLink
        fields = [
            'token', 'heading', 'description',
            'clinic_name', 'clinic_logo', 'clinic_address',
            'categories',
        ]

    def get_clinic_logo(self, obj) -> str | None:
        request = self.context.get('request')
        if obj.clinic.logo and request:
            return request.build_absolute_uri(obj.clinic.logo.url)
        return None

    def get_clinic_address(self, obj) -> str:
        c = obj.clinic
        parts = [c.address, c.city, c.province, c.postal_code]
        return ', '.join(p for p in parts if p)

    def get_categories(self, obj):
        categories = ServiceCategory.objects.filter(
            clinic=obj.clinic,
            is_active=True,
            is_deleted=False,
        ).prefetch_related('portal_services').order_by('sort_order', 'name')  # ✅ updated related_name

        result = []
        for cat in categories:
            services = cat.portal_services.filter(             # ✅ updated related_name
                is_active=True, is_deleted=False
            ).order_by('sort_order', 'name')
            result.append({
                'id':          cat.id,
                'name':        cat.name,
                'description': cat.description,
                'services':    PortalServiceSerializer(         # ✅ updated serializer
                    services, many=True, context=self.context
                ).data,
            })

        uncategorized = PortalService.objects.filter(          # ✅ PortalService
            clinic=obj.clinic,
            category__isnull=True,
            is_active=True,
            is_deleted=False,
        ).order_by('sort_order', 'name')

        if uncategorized.exists():
            result.append({
                'id':          None,
                'name':        'Other Services',
                'description': '',
                'services':    PortalServiceSerializer(         # ✅ updated serializer
                    uncategorized, many=True, context=self.context
                ).data,
            })

        return result


class PortalLinkAdminSerializer(serializers.ModelSerializer):
    portal_url = serializers.SerializerMethodField()

    class Meta:
        model  = PortalLink
        fields = [
            'id', 'clinic', 'token', 'heading',
            'description', 'is_active', 'portal_url',
            'created_at',
        ]
        read_only_fields = ['id', 'clinic', 'token', 'created_at']  # clinic + token are read-only

    def get_portal_url(self, obj) -> str:
        request = self.context.get('request')
        if request:
            base = f"{request.scheme}://{request.get_host()}"
            return f"{base}/portal/{obj.token}/"
        return f"/portal/{obj.token}/"
    
    


class PortalBookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PortalBooking
        fields = [
            'service', 'practitioner',
            'patient_first_name', 'patient_last_name',
            'patient_email', 'patient_phone',
            'notes', 'appointment_date', 'appointment_time',
        ]

    def validate_service(self, value):
        if not value.is_active:
            raise serializers.ValidationError("This service is no longer available.")
        return value

    def validate(self, attrs):
        portal_link = self.context.get('portal_link')
        if portal_link and attrs.get('service'):
            if attrs['service'].clinic_id != portal_link.clinic_id:
                raise serializers.ValidationError(
                    {'service': 'Service does not belong to this clinic.'}
                )
        return attrs


class PortalBookingResponseSerializer(serializers.ModelSerializer):
    service_name     = serializers.CharField(source='service.name',               read_only=True)
    service_duration = serializers.IntegerField(source='service.duration_minutes', read_only=True)
    service_price    = serializers.DecimalField(
        source='service.price', max_digits=10, decimal_places=2, read_only=True
    )
    practitioner_name           = serializers.SerializerMethodField()
    practitioner_specialization = serializers.SerializerMethodField()
    clinic_name = serializers.CharField(source='portal_link.clinic.name', read_only=True)

    class Meta:
        model  = PortalBooking
        fields = [
            'id', 'reference_number', 'status',
            'patient_first_name', 'patient_last_name',
            'patient_email', 'patient_phone',
            'appointment_date', 'appointment_time',
            'notes',
            'service_name', 'service_duration', 'service_price',
            'practitioner_name', 'practitioner_specialization',
            'clinic_name',
            'created_at',
        ]

    def get_practitioner_name(self, obj) -> str | None:
        return obj.practitioner.user.get_full_name() if obj.practitioner else None

    def get_practitioner_specialization(self, obj) -> str | None:
        return obj.practitioner.specialization if obj.practitioner else None