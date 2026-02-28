from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Admin can create/edit/delete templates.
    All authenticated users can read templates.
    """
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        return request.user and request.user.is_admin


class IsSameClinic(permissions.BasePermission):
    """
    User can only access resources from their own clinic.
    """
    
    def has_object_permission(self, request, view, obj):
        return obj.clinic == request.user.clinic


class IsPractitionerOrAdmin(permissions.BasePermission):
    """
    Only practitioners or admins can create clinical notes.
    """
    
    def has_permission(self, request, view):
        return (request.user and 
                (request.user.is_practitioner or request.user.is_admin))


class CanEditClinicalNote(permissions.BasePermission):
    """
    Only the assigned practitioner can edit their own notes.
    Signed notes cannot be edited.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read access: Same clinic
        if request.method in permissions.SAFE_METHODS:
            return obj.clinic == request.user.clinic
        
        # Edit/Delete: Only assigned practitioner, and note must not be signed
        return (obj.practitioner.user == request.user and 
                not obj.is_signed)