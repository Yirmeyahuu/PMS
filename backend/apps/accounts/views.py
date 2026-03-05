from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from django.db import transaction
from django.utils import timezone
from .models import User, Role, Permission
from .serializers import (
    UserSerializer, AdminRegistrationSerializer, UserRegistrationSerializer,
    RoleSerializer, PermissionSerializer, PasswordChangeSerializer
)
from .services.password_service import PasswordService
from .services.email_service import EmailService
from apps.clinics.models import Clinic, Practitioner
import logging

logger = logging.getLogger(__name__)


class AuthViewSet(viewsets.GenericViewSet):
    """Authentication endpoints"""
    
    permission_classes = [AllowAny]
    
    def get_permissions(self):
        if self.action in ['register_admin', 'register', 'login', 'verify_token']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    @action(detail=False, methods=['post'], url_path='register-admin', permission_classes=[AllowAny])
    def register_admin(self, request):
        """Register admin — auto-generates password, emails credentials,
        and creates a PortalLink for the new clinic."""
        serializer = AdminRegistrationSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                temp_password = PasswordService.generate_temporary_password()

                # ✅ FIX: Provide all required non-nullable fields with safe defaults
                clinic = Clinic.objects.create(
                    name=serializer.validated_data['company_name'],
                    phone=serializer.validated_data.get('phone', ''),
                    email=serializer.validated_data['email'],  # ✅ use admin email as clinic email
                    address='',        # ✅ blank default — admin fills this in setup
                    city='',           # ✅ blank default
                    province='',       # ✅ blank default
                    postal_code='',    # ✅ blank default
                    is_active=True,
                    is_main_branch=True,
                )

                user = User.objects.create_user(
                    email=serializer.validated_data['email'],
                    password=temp_password,
                    first_name=serializer.validated_data['first_name'],
                    last_name=serializer.validated_data['last_name'],
                    phone=serializer.validated_data.get('phone', ''),
                    role='ADMIN',
                    clinic=clinic,
                    password_changed=False
                )

                # ── Auto-create portal link for the new clinic ───────────────
                from apps.patients.models import PortalLink
                portal_link, _ = PortalLink.get_or_create_for_clinic(clinic)
                logger.info(
                    f"Portal link auto-created for new clinic: {clinic.name} "
                    f"(token: {portal_link.token})"
                )

                email_sent = EmailService.send_welcome_email(
                    user_email=user.email,
                    user_name=user.get_full_name(),
                    password=temp_password,
                    company_name=clinic.name
                )

                if not email_sent:
                    logger.warning(f"Email failed to send for {user.email}")

                return Response({
                    'message': 'Account created successfully! Check your email for login credentials.',
                    'email_sent': email_sent,
                    'clinic': {'id': clinic.id, 'name': clinic.name},
                    'portal_token': portal_link.token,
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Admin registration failed: {str(e)}", exc_info=True)
            import traceback
            traceback.print_exc()
            return Response(
                {'detail': f'Registration failed: {str(e)}'},  # ✅ expose actual error in dev
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        """User login."""
        email    = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'detail': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(request=request, email=email, password=password)
        
        if not user:
            logger.warning(f"Failed login attempt for: {email}")
            return Response(
                {'detail': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            return Response(
                {'detail': 'Account is inactive. Please contact support.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        refresh = RefreshToken.for_user(user)
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            },
            'needs_password_change': user.needs_password_change
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """Blacklist refresh token."""
        try:
            refresh_token = request.data.get('refresh_token')
            if not refresh_token:
                return Response({'detail': 'Refresh token is required'}, status=status.HTTP_400_BAD_REQUEST)
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'detail': 'Successfully logged out'}, status=status.HTTP_200_OK)
        except TokenError as e:
            return Response({'detail': 'Invalid or expired token'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'detail': 'Logout failed'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], url_path='verify-token', permission_classes=[AllowAny])
    def verify_token(self, request):
        """Verify access token."""
        token = request.data.get('token')
        if not token:
            return Response({'valid': False, 'detail': 'Token is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from rest_framework_simplejwt.tokens import AccessToken
            AccessToken(token)
            return Response({'valid': True, 'detail': 'Token is valid'}, status=status.HTTP_200_OK)
        except TokenError:
            return Response({'valid': False, 'detail': 'Token is invalid or expired'}, status=status.HTTP_401_UNAUTHORIZED)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.password_changed = True
            user.save()
            return Response({'detail': 'Password changed successfully. Please login again.'}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ModelViewSet):
    """CRUD operations for users / staff management"""
    
    queryset = User.objects.filter(is_deleted=False).select_related('clinic', 'clinic_branch')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        qs   = self.queryset

        if user.is_admin:
            # Admin sees all users in their clinic family
            base_qs = qs.filter(clinic=user.clinic)
        else:
            base_qs = qs.filter(clinic=user.clinic) if user.clinic else qs.none()

        # ✅ Optional filter: ?clinic_branch=<id>
        branch_id = self.request.query_params.get('clinic_branch')
        if branch_id:
            base_qs = base_qs.filter(clinic_branch_id=branch_id)

        # ✅ Optional filter: ?role=STAFF or ?role=PRACTITIONER
        role = self.request.query_params.get('role')
        if role:
            base_qs = base_qs.filter(role=role)

        return base_qs

    def _validate_branch(self, request, branch_id):
        """
        Helper: verify the branch belongs to the requesting admin's clinic family.
        Returns the Clinic branch instance or raises a validation error dict.
        """
        if not branch_id:
            return None

        main_clinic = request.user.clinic.main_clinic if request.user.clinic else None
        if not main_clinic:
            return None

        try:
            branch = Clinic.objects.get(pk=branch_id, is_deleted=False)
        except Clinic.DoesNotExist:
            return {'error': 'Selected branch does not exist.'}

        # Must be main clinic or a direct branch of it
        if branch.id != main_clinic.id and branch.parent_clinic_id != main_clinic.id:
            return {'error': 'The selected branch does not belong to your clinic.'}

        return branch

    def create(self, request, *args, **kwargs):
        """
        Create new staff / practitioner account.
        ✅ Now accepts clinic_branch in the request body.
        Auto-generates password and sends via email.
        Only admins can create users.
        """
        if not request.user.is_admin:
            return Response(
                {'detail': 'Only administrators can create staff accounts.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # ── Validate branch before touching the serializer ──────────────────
        branch_id    = request.data.get('clinic_branch')
        branch_result = self._validate_branch(request, branch_id)

        if isinstance(branch_result, dict) and 'error' in branch_result:
            return Response({'clinic_branch': branch_result['error']}, status=status.HTTP_400_BAD_REQUEST)

        branch = branch_result  # Clinic instance or None

        # ── Validate remaining fields ────────────────────────────────────────
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                temp_password = PasswordService.generate_temporary_password()
                role          = serializer.validated_data.get('role', 'STAFF')
                
                user = User.objects.create_user(
                    email=serializer.validated_data['email'],
                    password=temp_password,
                    first_name=serializer.validated_data['first_name'],
                    last_name=serializer.validated_data['last_name'],
                    phone=serializer.validated_data.get('phone', ''),
                    role=role,
                    clinic=request.user.clinic,
                    clinic_branch=branch,          # ✅ assign branch
                    password_changed=False
                )
                
                # ── Create Practitioner profile if needed ────────────────────
                practitioner_created = False
                if role == 'PRACTITIONER':
                    if not Practitioner.objects.filter(user=user).exists():
                        Practitioner.objects.create(
                            user=user,
                            clinic=request.user.clinic,
                            license_number='',
                            specialization='',
                            consultation_fee=0,
                            is_accepting_patients=True
                        )
                        practitioner_created = True
                        logger.info(f"Practitioner profile created for: {user.email}")
                
                company_name = request.user.clinic.name if request.user.clinic else 'Your Organization'
                email_sent   = EmailService.send_welcome_email(
                    user_email=user.email,
                    user_name=user.get_full_name(),
                    password=temp_password,
                    company_name=company_name
                )
                
                if not email_sent:
                    logger.warning(f"Email failed to send for {user.email}")
                
                logger.info(
                    f"Staff account created: {user.email} "
                    f"(Role: {role}, Branch: {branch.name if branch else 'All'}) "
                    f"by {request.user.email}"
                )
                
                response_data = self.get_serializer(user).data
                return Response({
                    **response_data,
                    'message': (
                        f'{"Practitioner" if role == "PRACTITIONER" else "Staff"} account created successfully! '
                        f'Login credentials sent to email.'
                    ),
                    'email_sent': email_sent,
                    'practitioner_profile_created': practitioner_created,
                }, status=status.HTTP_201_CREATED, headers=self.get_success_headers(response_data))
                
        except Exception as e:
            logger.error(f"Staff creation failed: {str(e)}")
            return Response(
                {'detail': f'Failed to create staff account: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, *args, **kwargs):
        """
        Update staff / practitioner.
        ✅ Validates clinic_branch belongs to the same clinic family on update too.
        """
        if not request.user.is_admin:
            return Response(
                {'detail': 'Only administrators can update staff accounts.'},
                status=status.HTTP_403_FORBIDDEN
            )

        partial     = kwargs.pop('partial', False)
        instance    = self.get_object()
        branch_id   = request.data.get('clinic_branch')

        # Only validate branch when it is explicitly included in payload
        if 'clinic_branch' in request.data:
            branch_result = self._validate_branch(request, branch_id)
            if isinstance(branch_result, dict) and 'error' in branch_result:
                return Response({'clinic_branch': branch_result['error']}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        self.perform_update(serializer)

        logger.info(
            f"Staff account updated: {instance.email} by {request.user.email}"
        )
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Soft delete user."""
        instance = self.get_object()
        
        if instance.id == request.user.id:
            return Response(
                {'detail': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        instance.is_deleted = True
        instance.is_active  = False
        instance.save()
        
        logger.info(f"User soft deleted: {instance.email} by {request.user.email}")
        
        return Response(
            {'detail': 'Staff member removed successfully.'},
            status=status.HTTP_204_NO_CONTENT
        )
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        return Response(self.get_serializer(request.user).data)


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated]