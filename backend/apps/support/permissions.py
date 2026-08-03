from rest_framework.permissions import BasePermission

class IsOwnerOrAdmin(BasePermission):
    """
    Normal users can only see and edit their own feedback.
    Admins (with OWNER/MANAGER role) can see and manage all feedback.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        # Admins and Managers have full access
        effective = request.user.get_effective_roles()
        if 'OWNER' in effective or 'MANAGER' in effective:
            return True
            
        # For attachments/comments, check the parent feedback object
        if hasattr(obj, 'feedback'):
            return obj.feedback.submitted_by == request.user
            
        return obj.submitted_by == request.user
