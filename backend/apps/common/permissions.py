from rest_framework.permissions import BasePermission


class IsAdminOrStaffOnly(BasePermission):
    """
    Denies access to users with the PRACTITIONER role.
    Allows ADMIN and STAFF full access.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ('ADMIN', 'STAFF')
