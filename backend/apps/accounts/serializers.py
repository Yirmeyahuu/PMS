from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, Role, Permission
from apps.clinics.models import Practitioner


class UserSerializer(serializers.ModelSerializer):
    password               = serializers.CharField(write_only=True, required=False, validators=[validate_password])
    needs_password_change  = serializers.BooleanField(read_only=True)
    clinic_branch_name     = serializers.SerializerMethodField()
    avatar_url             = serializers.SerializerMethodField()

    # ── NEW: expose whether the admin has completed clinic setup ──────────────
    clinic_setup_complete  = serializers.SerializerMethodField()

    # ── Practitioner availability fields ─────────────────────────────────────────
    duty_days        = serializers.ListField(child=serializers.CharField(), required=False)
    duty_start_time  = serializers.CharField(required=False)
    duty_end_time    = serializers.CharField(required=False)
    lunch_start_time = serializers.CharField(required=False)
    lunch_end_time   = serializers.CharField(required=False)
    
    # ── Position and discipline ──────────────────────────────────────────────
    position         = serializers.CharField(required=False, allow_blank=True)
    discipline       = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role', 'phone',
            'avatar', 'avatar_url', 'is_active', 'clinic', 'clinic_branch', 'clinic_branch_name',
            'created_at', 'password', 'password_changed', 'needs_password_change',
            'clinic_setup_complete',   # ← NEW
            # Position (for all staff)
            'position',
            # Availability fields
            'duty_days', 'duty_start_time', 'duty_end_time', 'lunch_start_time', 'lunch_end_time',
            # Discipline (for PRACTITIONER)
            'discipline',
        ]
        read_only_fields = ['id', 'created_at', 'password_changed']

    def get_avatar_url(self, obj) -> str | None:
        """Return the full URL for the avatar image."""
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None

    def get_clinic_branch_name(self, obj) -> str | None:
        if obj.clinic_branch:
            return obj.clinic_branch.name
        return None

    def get_clinic_setup_complete(self, obj) -> bool:
        """
        Returns True if the user's main clinic has completed setup.
        Non-admin users always see True (they don't do setup).
        """
        if not obj.is_admin:
            return True
        if obj.clinic:
            return obj.clinic.main_clinic.setup_complete
        return False

    def to_representation(self, instance):
        """Add practitioner availability, discipline, and practitioner_id to the serialized output."""
        data = super().to_representation(instance)
        if instance.role == 'PRACTITIONER':
            try:
                practitioner = instance.practitioner_profile
                if practitioner and not practitioner.is_deleted:
                    data['practitioner_id']  = practitioner.id
                    data['duty_days']        = practitioner.duty_days or ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
                    data['duty_start_time']  = practitioner.duty_start_time.strftime('%H:%M') if practitioner.duty_start_time else '08:00'
                    data['duty_end_time']    = practitioner.duty_end_time.strftime('%H:%M') if practitioner.duty_end_time else '17:00'
                    data['lunch_start_time'] = practitioner.lunch_start_time.strftime('%H:%M') if practitioner.lunch_start_time else '12:00'
                    data['lunch_end_time']   = practitioner.lunch_end_time.strftime('%H:%M') if practitioner.lunch_end_time else '13:00'
                    data['discipline']       = practitioner.discipline or 'OCCUPATIONAL_THERAPY'
            except Exception:
                pass
        return data

    def validate_clinic_branch(self, value):
        if value is None:
            return value
        request = self.context.get('request')
        if request and request.user and request.user.clinic:
            main_clinic = request.user.clinic.main_clinic
            if value.id != main_clinic.id and value.parent_clinic_id != main_clinic.id:
                raise serializers.ValidationError(
                    "The selected branch does not belong to your clinic."
                )
        return value

    def validate(self, attrs):
        duty_days = attrs.get('duty_days')
        if duty_days is not None:
            valid_days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            if not isinstance(duty_days, list):
                raise serializers.ValidationError({"duty_days": "duty_days must be a list."})
            for day in duty_days:
                if day not in valid_days:
                    raise serializers.ValidationError(
                        {"duty_days": f"Invalid day: {day}. Must be one of {valid_days}"}
                    )

        duty_start = attrs.get('duty_start_time')
        duty_end = attrs.get('duty_end_time')
        lunch_start = attrs.get('lunch_start_time')
        lunch_end = attrs.get('lunch_end_time')

        if duty_start and duty_end:
            if duty_start >= duty_end:
                raise serializers.ValidationError({
                    'duty_end_time': 'Duty end time must be after duty start time.'
                })

        if lunch_start and lunch_end:
            if lunch_start >= lunch_end:
                raise serializers.ValidationError({
                    'lunch_end_time': 'Lunch end time must be after lunch start time.'
                })

        if duty_start and duty_end and lunch_start and lunch_end:
            if not (duty_start <= lunch_start and lunch_end <= duty_end):
                raise serializers.ValidationError({
                    'lunch_start_time': 'Lunch must be within duty hours.'
                })

        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        
        # Pop practitioner-specific fields - don't set on User model
        # (Practitioner creation is handled by the view)
        practitioner_fields = [
            'duty_days', 'duty_start_time', 'duty_end_time', 
            'lunch_start_time', 'lunch_end_time'
        ]
        for field in practitioner_fields:
            validated_data.pop(field, None)
        
        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        
        # Pop practitioner-specific fields - don't set on User model
        practitioner_fields = [
            'duty_days', 'duty_start_time', 'duty_end_time', 
            'lunch_start_time', 'lunch_end_time', 'discipline'
        ]
        practitioner_data = {}
        for field in practitioner_fields:
            if field in validated_data:
                practitioner_data[field] = validated_data.pop(field)
        
        # Update User fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
            instance.password_changed = True
        instance.save()
        
        # Sync practitioner availability fields if role is PRACTITIONER
        if instance.role == 'PRACTITIONER' and practitioner_data:
            try:
                practitioner = instance.practitioner_profile
                if practitioner and not practitioner.is_deleted:
                    import json
                    update_data = {}
                    if 'duty_days' in practitioner_data:
                        duty_days = practitioner_data['duty_days']
                        if isinstance(duty_days, str):
                            try:
                                duty_days = json.loads(duty_days)
                            except (json.JSONDecodeError, ValueError):
                                duty_days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
                        update_data['duty_days'] = duty_days
                    if 'duty_start_time' in practitioner_data:
                        update_data['duty_start_time'] = practitioner_data['duty_start_time']
                    if 'duty_end_time' in practitioner_data:
                        update_data['duty_end_time'] = practitioner_data['duty_end_time']
                    if 'lunch_start_time' in practitioner_data:
                        update_data['lunch_start_time'] = practitioner_data['lunch_start_time']
                    if 'lunch_end_time' in practitioner_data:
                        update_data['lunch_end_time'] = practitioner_data['lunch_end_time']
                    if 'discipline' in practitioner_data:
                        update_data['discipline'] = practitioner_data['discipline']
                    
                    if update_data:
                        Practitioner.objects.filter(pk=practitioner.pk).update(**update_data)
                        # Force refresh of the cached practitioner_profile relation
                        # so to_representation sees the updated values
                        instance.__dict__.pop('practitioner_profile', None)
            except Exception:
                pass
        
        return instance


class AdminRegistrationSerializer(serializers.Serializer):
    first_name   = serializers.CharField(max_length=150, required=True)
    last_name    = serializers.CharField(max_length=150, required=True)
    company_name = serializers.CharField(max_length=255, required=True)
    email        = serializers.EmailField(required=True)
    phone        = serializers.CharField(max_length=15, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_phone(self, value):
        if value:
            cleaned = value.replace(' ', '').replace('-', '')
            if not (cleaned.startswith('09') and len(cleaned) == 11) and \
               not (cleaned.startswith('+639') and len(cleaned) == 13):
                raise serializers.ValidationError(
                    "Invalid phone number format. Use 09XXXXXXXXX or +639XXXXXXXXX"
                )
        return value


class UserRegistrationSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ['email', 'first_name', 'last_name', 'password', 'password_confirm', 'role', 'phone']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user     = User.objects.create(**validated_data)
        user.set_password(password)
        user.password_changed = True
        user.save()
        return user


class PasswordChangeSerializer(serializers.Serializer):
    old_password         = serializers.CharField(required=True, write_only=True)
    new_password         = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "Password fields didn't match."})
        return attrs

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Permission
        fields = '__all__'


class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)

    class Meta:
        model  = Role
        fields = '__all__'