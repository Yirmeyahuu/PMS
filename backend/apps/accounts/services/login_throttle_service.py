"""
Login Throttling Service

Provides server-side rate limiting for authentication attempts to protect against
brute-force and credential stuffing attacks.

Strategy:
- Max 5 failed attempts per (IP + Email) combination per 15 minutes.
- Max 50 failed attempts globally per IP per 15 minutes (protects against credential stuffing).
- Successful login resets the IP+Email counter immediately.
"""
import hashlib
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Constants
THROTTLE_TIMEOUT = 900  # 15 minutes
MAX_ATTEMPTS_PER_ACCOUNT = 5
MAX_ATTEMPTS_PER_IP = 50

def get_client_ip(request) -> str:
    """Safely extract the client IP from the request, respecting reverse proxies."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')

def _email_hash(email: str) -> str:
    """Hash email to avoid exposing raw PII in cache keys."""
    return hashlib.sha256(email.strip().lower().encode()).hexdigest()[:32]

def _account_key(ip: str, email: str) -> str:
    return f"login_fails:acc:{ip}:{_email_hash(email)}"

def _ip_key(ip: str) -> str:
    return f"login_fails:ip:{ip}"

def is_throttled(ip: str, email: str) -> bool:
    """Check if the given IP/Email combination has exceeded login limits."""
    # Check global IP limits
    ip_count = cache.get(_ip_key(ip), 0)
    if ip_count >= MAX_ATTEMPTS_PER_IP:
        logger.warning(f"Login rate limited: Global IP threshold exceeded for IP: {ip}")
        return True

    # Check specific IP + Email limits
    if email:
        acc_count = cache.get(_account_key(ip, email), 0)
        if acc_count >= MAX_ATTEMPTS_PER_ACCOUNT:
            logger.warning(f"Login rate limited: Account threshold exceeded for IP: {ip}")
            return True

    return False

def record_failed_attempt(ip: str, email: str) -> None:
    """Record a failed login attempt for the given IP and Email."""
    # Increment global IP tracker
    ip_key = _ip_key(ip)
    try:
        cache.incr(ip_key)
    except ValueError:
        cache.set(ip_key, 1, timeout=THROTTLE_TIMEOUT)
    
    # Refresh TTL if we want it rolling, or just let it expire.
    # A simple approach is just touch/expire it when it's new.
    # Django's locmem cache handles incr well, but might need set if missing.

    # Increment specific IP + Email tracker
    if email:
        acc_key = _account_key(ip, email)
        try:
            cache.incr(acc_key)
        except ValueError:
            cache.set(acc_key, 1, timeout=THROTTLE_TIMEOUT)

def reset_failed_attempts(ip: str, email: str) -> None:
    """Reset the failed login counter upon successful authentication."""
    if email:
        cache.delete(_account_key(ip, email))
