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
from apps.clinics.models import Clinic
import logging

logger = logging.getLogger(__name__)


class AuthViewSet(viewsets.GenericViewSet):
    """Authentication endpoints with enhanced security"""
    
    permission_classes = [AllowAny]
    
    def get_permissions(self):
        """Set permissions based on action"""
        if self.action in ['register_admin', 'register', 'login', 'verify_token']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    @action(detail=False, methods=['post'], url_path='register-admin', permission_classes=[AllowAny])
    def register_admin(self, request):
        """
        Register admin - Auto-generates password and emails credentials.
        Security: No tokens returned, user must login manually.
        """
        serializer = AdminRegistrationSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                temp_password = PasswordService.generate_temporary_password()
                
                clinic = Clinic.objects.create(
                    name=serializer.validated_data['company_name'],
                    phone=serializer.validated_data.get('phone', ''),
                    is_active=True
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
                
                email_sent = EmailService.send_welcome_email(
                    user_email=user.email,
                    user_name=user.get_full_name(),
                    password=temp_password,
                    company_name=clinic.name
                )
                
                if not email_sent:
                    logger.warning(f"Email failed to send for {user.email}")
                
                logger.info(f"Admin account created: {user.email}")
                
                return Response({
                    'message': 'Account created successfully! Check your email for login credentials.',
                    'email_sent': email_sent,
                    'clinic': {
                        'id': clinic.id,
                        'name': clinic.name
                    }
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Admin registration failed: {str(e)}")
            return Response(
                {'detail': 'Registration failed. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        """
        User login with enhanced security.
        Security: 
        - Updates last_login timestamp
        - Logs authentication attempts
        - Returns user data with tokens
        """
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'detail': 'Email and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Authenticate user
        user = authenticate(request=request, email=email, password=password)
        
        if not user:
            logger.warning(f"Failed login attempt for: {email}")
            return Response(
                {'detail': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            logger.warning(f"Inactive account login attempt: {email}")
            return Response(
                {'detail': 'Account is inactive. Please contact support.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        logger.info(f"Successful login: {email}")
        
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
        """
        User logout - Blacklists refresh token.
        Security: Ensures token cannot be reused.
        """
        try:
            refresh_token = request.data.get('refresh_token')
            
            if not refresh_token:
                return Response(
                    {'detail': 'Refresh token is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Blacklist the refresh token
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            logger.info(f"User logged out: {request.user.email}")
            
            return Response(
                {'detail': 'Successfully logged out'},
                status=status.HTTP_200_OK
            )
            
        except TokenError as e:
            logger.error(f"Token blacklist error: {str(e)}")
            return Response(
                {'detail': 'Invalid or expired token'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Logout failed: {str(e)}")
            return Response(
                {'detail': 'Logout failed'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], url_path='verify-token', permission_classes=[AllowAny])
    def verify_token(self, request):
        """
        Verify if access token is valid.
        Security: Used for route protection on frontend.
        """
        token = request.data.get('token')
        
        if not token:
            return Response(
                {'valid': False, 'detail': 'Token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Try to decode the token
            from rest_framework_simplejwt.tokens import AccessToken
            AccessToken(token)
            
            return Response({
                'valid': True,
                'detail': 'Token is valid'
            }, status=status.HTTP_200_OK)
            
        except TokenError:
            return Response({
                'valid': False,
                'detail': 'Token is invalid or expired'
            }, status=status.HTTP_401_UNAUTHORIZED)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Get current authenticated user.
        Security: Only returns data for authenticated users.
        """
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """
        Change user password.
        Security: Requires old password verification.
        """
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.password_changed = True
            user.save()
            
            logger.info(f"Password changed for user: {user.email}")
            
            return Response({
                'detail': 'Password changed successfully. Please login again.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserViewSet(viewsets.ModelViewSet):
    """CRUD operations for users"""
    
    queryset = User.objects.filter(is_deleted=False)
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter users by clinic for non-admin users"""
        user = self.request.user
        if user.is_admin:
            return self.queryset
        return self.queryset.filter(clinic=user.clinic)
    
    def create(self, request, *args, **kwargs):
        """
        Create new staff/practitioner account.
        Auto-generates password and sends via email.
        Only admins can create users.
        """
        # Check if user is admin
        if not request.user.is_admin:
            return Response(
                {'detail': 'Only administrators can create staff accounts.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                # Generate temporary password
                temp_password = PasswordService.generate_temporary_password()
                
                # Create user with validated data
                user = User.objects.create_user(
                    email=serializer.validated_data['email'],
                    password=temp_password,
                    first_name=serializer.validated_data['first_name'],
                    last_name=serializer.validated_data['last_name'],
                    phone=serializer.validated_data.get('phone', ''),
                    role=serializer.validated_data.get('role', 'STAFF'),
                    clinic=request.user.clinic,
                    password_changed=False
                )
                
                # Send welcome email with credentials
                company_name = request.user.clinic.name if request.user.clinic else 'Your Organization'
                email_sent = EmailService.send_welcome_email(
                    user_email=user.email,
                    user_name=user.get_full_name(),
                    password=temp_password,
                    company_name=company_name
                )
                
                if not email_sent:
                    logger.warning(f"Email failed to send for {user.email}")
                
                logger.info(f"Staff account created: {user.email} by {request.user.email}")
                
                # Return created user data
                response_serializer = self.get_serializer(user)
                headers = self.get_success_headers(response_serializer.data)
                
                return Response({
                    **response_serializer.data,
                    'message': 'Staff account created successfully! Login credentials sent to email.',
                    'email_sent': email_sent
                }, status=status.HTTP_201_CREATED, headers=headers)
                
        except Exception as e:
            logger.error(f"Staff creation failed: {str(e)}")
            return Response(
                {'detail': f'Failed to create staff account: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, *args, **kwargs):
        """Update user - prevents password changes through this endpoint"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Remove password from data if present
        data = request.data.copy()
        if 'password' in data:
            data.pop('password')
        
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete user"""
        instance = self.get_object()
        
        # Prevent deleting yourself
        if instance.id == request.user.id:
            return Response(
                {'detail': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Soft delete
        instance.is_deleted = True
        instance.is_active = False
        instance.save()
        
        logger.info(f"User soft deleted: {instance.email} by {request.user.email}")
        
        return Response(
            {'detail': 'Staff member removed successfully.'},
            status=status.HTTP_204_NO_CONTENT
        )
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]


class PermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    permission_classes = [IsAuthenticated] 