from rest_framework.exceptions import PermissionDenied

def get_allowed_branches(user):
    """
    Returns a list of branch IDs the user is allowed to access.
    If the user is an ADMIN, returns None (meaning access to all branches).
    Otherwise, evaluates UserBranchAccess and User.clinic_branch.
    """
    effective_roles = user.get_effective_roles()
    
    if 'ADMIN' in effective_roles:
        return None
        
    branches = list(user.branch_accesses.values_list('branch_id', flat=True))
    if not branches and user.clinic_branch_id:
        branches = [user.clinic_branch_id]
        
    return branches

def validate_branch_access(user, requested_branch_id=None):
    """
    Validates if the user can access the requested branch.
    If requested_branch_id is not provided, returns the list of allowed branches.
    Raises PermissionDenied if the user attempts to access an unauthorized branch.
    
    Returns: (list_of_allowed_branch_ids_or_None, bool_is_restricted)
    """
    effective_roles = user.get_effective_roles()
    
    if 'ADMIN' in effective_roles:
        return None, False
        
    allowed_branches = get_allowed_branches(user)
    
    if requested_branch_id is not None:
        if requested_branch_id not in allowed_branches:
            raise PermissionDenied("You do not have permission to access this branch.")
            
    return allowed_branches, True
