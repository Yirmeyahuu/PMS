from cryptography.fernet import Fernet
from django.conf import settings
import json
import logging

logger = logging.getLogger(__name__)


class FieldEncryptor:
    """
    AES encryption for sensitive clinical data.
    
    Architecture Decision:
    - Uses Fernet (symmetric encryption) for performance
    - Key stored in environment variable (not in code)
    - Can be swapped with AWS KMS, HashiCorp Vault, etc.
    """
    
    @staticmethod
    def get_encryption_key():
        """Get encryption key from settings"""
        key = getattr(settings, 'FIELD_ENCRYPTION_KEY', None)
        if not key:
            raise ValueError('FIELD_ENCRYPTION_KEY not configured in settings')
        
        # Ensure key is bytes
        if isinstance(key, str):
            key = key.encode()
        
        return key
    
    @classmethod
    def encrypt(cls, data):
        """
        Encrypt Python dict/list to encrypted string.
        
        Args:
            data: Python object (dict/list) to encrypt
        
        Returns:
            str: Base64 encoded encrypted string
        """
        if data is None:
            return ""
        
        try:
            # Convert to JSON string
            json_str = json.dumps(data)
            
            # Encrypt
            fernet = Fernet(cls.get_encryption_key())
            encrypted_bytes = fernet.encrypt(json_str.encode())
            
            # Return as string
            return encrypted_bytes.decode()
        except Exception as e:
            logger.error(f"Encryption failed: {str(e)}")
            raise
    
    @classmethod
    def decrypt(cls, encrypted_str):
        """
        Decrypt string back to Python dict/list.
        
        Args:
            encrypted_str: Base64 encoded encrypted string
        
        Returns:
            dict/list: Decrypted Python object
        """
        if not encrypted_str:
            return {}
        
        try:
            # Decrypt
            fernet = Fernet(cls.get_encryption_key())
            decrypted_bytes = fernet.decrypt(encrypted_str.encode())
            
            # Parse JSON
            json_str = decrypted_bytes.decode()
            return json.loads(json_str)
        except Exception as e:
            # Log error but don't expose details
            logger.error(f"Decryption failed: {str(e)}")
            return {}