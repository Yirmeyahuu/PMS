from rest_framework import serializers
from .models import ClinicalNote, NoteTemplate, OutcomeMeasure, Attachment, CaseDocument


class ClinicalNoteSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    practitioner_name = serializers.CharField(source='practitioner.user.get_full_name', read_only=True)
    
    class Meta:
        model = ClinicalNote
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'signed_at']


class NoteTemplateSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = NoteTemplate
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class OutcomeMeasureSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    practitioner_name = serializers.CharField(source='practitioner.user.get_full_name', read_only=True)
    percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = OutcomeMeasure
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_percentage(self, obj):
        if obj.max_score and obj.max_score > 0:
            return round((obj.score / obj.max_score) * 100, 2)
        return None


class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    
    class Meta:
        model = Attachment
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'file_size']


class CaseDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    case_title = serializers.CharField(source='patient_case.title', read_only=True, default=None)

    class Meta:
        model = CaseDocument
        fields = [
            'id', 'patient', 'patient_name', 'patient_case', 'case_title',
            'clinic', 'uploaded_by', 'uploaded_by_name',
            'title', 'description', 'category',
            'source_type', 'source_id',
            'file', 'file_name', 'file_size', 'mime_type',
            'version', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'clinic', 'uploaded_by', 'file_name', 'file_size', 'mime_type', 'version', 'created_at', 'updated_at']

    def validate(self, attrs):
        request = self.context.get('request')
        if not request or not request.user:
            return attrs
            
        patient = attrs.get('patient')
        if patient:
            user_main = request.user.clinic.main_clinic if request.user.clinic else None
            patient_main = patient.clinic.main_clinic if patient.clinic else None
            
            if not user_main or user_main != patient_main:
                raise serializers.ValidationError({"patient": "You do not have permission to attach documents to this patient."})
            
        patient_case = attrs.get('patient_case')
        if patient_case and patient_case.patient != patient:
            raise serializers.ValidationError({"patient_case": "The selected case does not belong to this patient."})
            
        file_obj = attrs.get('file')
        if file_obj:
            if file_obj.size > 5 * 1024 * 1024:
                raise serializers.ValidationError({"file": "File is too large. The maximum allowed file size is 5 MB."})
                
            valid_types = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ]
            
            ext = file_obj.name.split('.')[-1].lower() if '.' in file_obj.name else ''
            valid_exts = ['pdf', 'doc', 'docx']
            
            if file_obj.content_type not in valid_types or ext not in valid_exts:
                raise serializers.ValidationError({"file": "Unsupported file type. Only PDF, DOC, and DOCX files are allowed."})
                
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['clinic'] = request.user.clinic
            validated_data['uploaded_by'] = request.user
            
        file_obj = validated_data.get('file')
        if file_obj:
            validated_data['file_size'] = file_obj.size
            if not validated_data.get('file_name'):
                validated_data['file_name'] = file_obj.name
            validated_data['mime_type'] = file_obj.content_type
            
        return super().create(validated_data)

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        file_url = rep.get('file')
        
        # If the file is stored in Cloudinary and is a PDF, generate a signed URL
        # to bypass Cloudinary's "Strict delivery of PDF and ZIP files" security setting.
        if file_url and 'res.cloudinary.com' in file_url:
            is_pdf = instance.mime_type == 'application/pdf' or (instance.file_name and instance.file_name.lower().endswith('.pdf'))
            if is_pdf:
                try:
                    from cloudinary.utils import cloudinary_url
                    public_id = instance.file.name
                    
                    # If public_id already has .pdf, it was uploaded as 'raw' (new behavior)
                    # Otherwise it was uploaded as 'image' (old behavior)
                    res_type = 'raw' if public_id.lower().endswith('.pdf') else 'image'
                    
                    # Cloudinary strict delivery requires the URL to end with .pdf
                    if not public_id.lower().endswith('.pdf'):
                        public_id += '.pdf'
                    
                    signed_url, _ = cloudinary_url(public_id, resource_type=res_type, sign_url=True, secure=True)
                    rep['file'] = signed_url
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).warning(f"Failed to sign Cloudinary URL: {e}")
                    
        return rep