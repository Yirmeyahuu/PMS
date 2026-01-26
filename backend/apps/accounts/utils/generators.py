import secrets
import string
import random


def generate_secure_password(length: int = 12) -> str:
    """
    Generate a secure random password.
    
    Requirements:
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    - Minimum length of 12 characters
    
    Args:
        length: Password length (default: 12)
        
    Returns:
        str: Generated secure password
    """
    if length < 8:
        length = 8  # Minimum secure length
    
    # Define character sets
    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    digits = string.digits
    special = "!@#$%^&*"
    
    # Ensure at least one character from each set
    password = [
        secrets.choice(uppercase),
        secrets.choice(lowercase),
        secrets.choice(digits),
        secrets.choice(special),
    ]
    
    # Fill the rest with random choices from all sets
    all_chars = uppercase + lowercase + digits + special
    password += [secrets.choice(all_chars) for _ in range(length - 4)]
    
    # Shuffle to avoid predictable patterns
    random.shuffle(password)
    
    return ''.join(password)


def generate_verification_code(length: int = 6) -> str:
    """
    Generate a numeric verification code.
    
    Args:
        length: Code length (default: 6)
        
    Returns:
        str: Generated verification code
    """
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def generate_token(length: int = 32) -> str:
    """
    Generate a secure random token.
    
    Args:
        length: Token length in bytes (default: 32)
        
    Returns:
        str: Hex-encoded token
    """
    return secrets.token_hex(length)