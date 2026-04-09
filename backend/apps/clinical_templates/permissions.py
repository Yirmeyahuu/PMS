from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    All authenticated users can create and read templates.
    Only admins can delete templates.
    """
    
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        
        # Allow read and create for all authenticated users
        if request.method in permissions.SAFE_METHODS or request.method == 'POST':
            return True
        
        # Allow update for all authenticated users
        if request.method in ('PUT', 'PATCH'):
            return True
        
        # Only admins can delete
        return request.user.is_admin


class IsSameClinic(permissions.BasePermission):
    """
    User can only access resources from their own clinic.
    """
    
    def has_object_permission(self, request, view, obj):
        return obj.clinic == request.user.clinic


class IsPractitionerOrAdmin(permissions.BasePermission):
    """
    Only practitioners, admins, or staff can create clinical notes.
    """
    
    def has_permission(self, request, view):
        return (request.user and 
                (request.user.is_practitioner or request.user.is_admin or request.user.role == 'STAFF'))


class CanEditClinicalNote(permissions.BasePermission):
    """
    Only the assigned practitioner can edit their own notes.
    Admins and Staff can edit any note.
    Signed notes can be edited by the practitioner, admin, or staff.
    """
    
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Read access: Same clinic (main clinic or branch)
        if request.method in permissions.SAFE_METHODS:
            user_clinic = user.clinic
            obj_clinic = obj.clinic
            
            # User's clinic is main clinic
            if user_clinic and not user_clinic.parent_clinic:
                return obj_clinic == user_clinic or obj_clinic.parent_clinic == user_clinic
            # User's clinic is a branch
            elif user_clinic and user_clinic.parent_clinic:
                return obj_clinic == user_clinic or obj_clinic == user_clinic.parent_clinic
            return False
        
        # Edit/Delete: Admin or Staff can edit any note, or practitioner can edit their own note
        # Admin can edit any note
        if user.is_admin:
            return True
        
        # Staff can edit any note
        if user.role == 'STAFF':
            return True
        
        # Practitioner can edit their own note (even if signed)
        if hasattr(obj, 'practitioner') and obj.practitioner and hasattr(obj.practitioner, 'user'):
            return obj.practitioner.user == user
        
        return False