from rest_framework import serializers
from .models import ClinicalTemplate, ClinicalNote, ClinicalNoteAuditLog
from django.utils import timezone


class ClinicalTemplateSerializer(serializers.ModelSerializer):
    """Serializer for clinical templates"""
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    is_latest_version = serializers.SerializerMethodField()
    
    class Meta:
        model = ClinicalTemplate
        fields = [
            'id', 'clinic', 'created_by', 'created_by_name',
            'name', 'description', 'category', 'structure',
            'version', 'parent_template', 'is_active', 'is_archived',
            'is_latest_version', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'version',
            'clinic',       # ✅ ADD - set automatically from request.user
            'created_by',   # ✅ ADD - set automatically from request.user
        ]
    
    def get_is_latest_version(self, obj):
        """Check if this is the latest version of the template"""
        if not obj.parent_template:
            # Check if there are newer versions
            return not ClinicalTemplate.objects.filter(
                parent_template=obj
            ).exists()
        
        # If this has a parent, check if any sibling versions are newer
        latest = ClinicalTemplate.objects.filter(
            parent_template=obj.parent_template
        ).order_by('-version').first()
        
        return latest.id == obj.id if latest else True
    
    def validate_structure(self, value):
        """Validate template structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError('Structure must be a JSON object')
        
        if 'sections' not in value:
            raise serializers.ValidationError('Structure must contain "sections" key')
        
        if not isinstance(value['sections'], list):
            raise serializers.ValidationError('Sections must be an array')
        
        return value
    
    def create(self, validated_data):
        """Auto-set clinic from request user"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['clinic'] = request.user.clinic
            validated_data['created_by'] = request.user
        
        return super().create(validated_data)


class ClinicalNoteSerializer(serializers.ModelSerializer):
    """
    Serializer for clinical notes with automatic encryption/decryption.
    
    Architecture Decision:
    - 'content' field is virtual (not stored directly)
    - Encryption happens transparently in to_representation/create/update
    """
    
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    practitioner_name = serializers.CharField(source='practitioner.user.get_full_name', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    content = serializers.JSONField(write_only=True)  # Accepts plain JSON, encrypts internally
    decrypted_content = serializers.SerializerMethodField()
    
    class Meta:
        model = ClinicalNote
        fields = [
            'id', 'patient', 'patient_name', 'practitioner', 'practitioner_name',
            'appointment', 'clinic', 'template', 'template_name', 'template_version',
            'date', 'note_type', 'is_signed', 'signed_at', 'is_draft', 'last_autosave',
            'content', 'decrypted_content', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'signed_at', 'last_autosave', 'created_at', 'updated_at',
            'template_version'
        ]
    
    def get_decrypted_content(self, obj):
        """Return decrypted content (only if user has permission)"""
        request = self.context.get('request')
        
        # Security check: Only return content to authorized users
        if request and request.user:
            # Allow practitioner, admins, or same-clinic staff
            if (obj.practitioner.user == request.user or 
                request.user.is_admin or 
                (request.user.clinic == obj.clinic and request.user.is_staff)):
                return obj.content
        
        return None
    
    def create(self, validated_data):
        """Create note with encrypted content"""
        content = validated_data.pop('content', {})
        
        # Auto-populate fields
        request = self.context.get('request')
        if request and request.user:
            validated_data['clinic'] = request.user.clinic
        
        # Create instance
        instance = ClinicalNote(**validated_data)
        
        # Set encrypted content
        instance.set_content(content)
        instance.save()
        
        # Log creation
        self._create_audit_log(instance, 'CREATED')
        
        return instance
    
    def update(self, instance, validated_data):
        """Update note with encrypted content"""
        content = validated_data.pop('content', None)
        
        # Prevent editing signed notes
        if instance.is_signed:
            raise serializers.ValidationError('Cannot edit a signed clinical note')
        
        # Update fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Update content if provided
        if content is not None:
            instance.set_content(content)
            instance.last_autosave = timezone.now()
        
        instance.save()
        
        # Log update
        self._create_audit_log(instance, 'UPDATED')
        
        return instance
    
    def _create_audit_log(self, instance, action):
        """Create audit log entry"""
        request = self.context.get('request')
        
        ClinicalNoteAuditLog.objects.create(
            clinical_note=instance,
            user=request.user if request else None,
            action=action,
            ip_address=self._get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '') if request else ''
        )
    
    def _get_client_ip(self, request):
        """Extract client IP from request"""
        if not request:
            return None
        
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')


class ClinicalNoteAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit logs"""
    
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = ClinicalNoteAuditLog
        fields = '__all__'
        read_only_fields = '__all__'