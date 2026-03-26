from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, Role, Permission


class UserSerializer(serializers.ModelSerializer):
    password               = serializers.CharField(write_only=True, required=False, validators=[validate_password])
    needs_password_change  = serializers.BooleanField(read_only=True)
    clinic_branch_name     = serializers.SerializerMethodField()
    avatar_url             = serializers.SerializerMethodField()

    # ── NEW: expose whether the admin has completed clinic setup ──────────────
    clinic_setup_complete  = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'role', 'phone',
            'avatar', 'avatar_url', 'is_active', 'clinic', 'clinic_branch', 'clinic_branch_name',
            'created_at', 'password', 'password_changed', 'needs_password_change',
            'clinic_setup_complete',   # ← NEW
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

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user     = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
            instance.password_changed = True
        instance.save()
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