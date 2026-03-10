from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from apps.accounts.utils.generators import generate_secure_password


class PasswordService:
    """Service for password-related operations"""
    
    @staticmethod
    def generate_temporary_password() -> str:
        """
        Generate a temporary password for new users.
        
        Returns:
            str: Generated secure password
        """
        return generate_secure_password(length=12)
    
    @staticmethod
    def validate_password_strength(password: str) -> tuple[bool, str]:
        """
        Validate password strength using Django validators.
        
        Args:
            password: Password to validate
            
        Returns:
            tuple: (is_valid, error_message)
        """
        try:
            validate_password(password)
            return True, ""
        except ValidationError as e:
            return False, ", ".join(e.messages)
    
    @staticmethod
    def hash_password(user, password: str):
        """
        Hash and set password for user.
        
        Args:
            user: User instance
            password: Plain text password
        """
        user.set_password(password)
        user.save(update_fields=['password'])

    
    @staticmethod
    def reset_password(user) -> str:
        """
        Generate a new temporary password, set it on the user,
        mark password_changed=False so they are prompted to change it,
        and blacklist all existing refresh tokens.
        Returns the new plain-text password.
        """
        new_password = PasswordService.generate_temporary_password()
        user.set_password(new_password)
        user.password_changed = False
        user.save(update_fields=['password', 'password_changed'])
        return new_password