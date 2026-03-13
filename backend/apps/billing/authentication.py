from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed


class QueryParamJWTAuthentication(JWTAuthentication):
    """
    Accepts JWT token from ?token= query parameter.
    Used for endpoints that are opened via window.open() (e.g., print views).
    Falls back to standard header-based auth.
    """

    def authenticate(self, request):
        # Try standard header first
        result = super().authenticate(request)
        if result is not None:
            return result

        # Fall back to query parameter
        token = request.query_params.get('token')
        if not token:
            return None

        try:
            validated_token = self.get_validated_token(token)
            user = self.get_user(validated_token)
            return (user, validated_token)
        except AuthenticationFailed:
            return None
        except Exception:
            return None