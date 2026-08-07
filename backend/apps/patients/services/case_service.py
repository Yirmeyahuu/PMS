from apps.patients.models import PatientCase, SessionConsumptionLog
from django.db import transaction

def auto_populate_package_case(appointment):
    """
    If the appointment uses a Package Service, ensure it is linked to a PatientCase.
    If it is already linked to a PatientCase, we just use it (no creation).
    If it has no Case, we automatically create a new one, link it to the appointment,
    and populate the Approved Sessions.
    """
    if not appointment.service or not appointment.service.is_package:
        return

    if appointment.patient_case:
        # Already linked. Check if we need to initialize session allocation.
        case = appointment.patient_case
        if case.approved_sessions is None or case.approved_sessions == 0:
            case.approved_sessions = appointment.service.session_allocation or 0
            case.completed_sessions = 0
            case.session_source = 'PACKAGE'
            case.is_unlimited = False
            if not case.package_cost or case.package_cost == 0:
                case.package_cost = appointment.service.price
            case.save(update_fields=['approved_sessions', 'completed_sessions', 'session_source', 'is_unlimited', 'package_cost'])
        return

    # No Case assigned. Create a new one.
    service = appointment.service
    patient = appointment.patient

    # Default name format: "Physiotherapy Package - 6 Sessions"
    case_title = f"{service.name} - {service.session_allocation} Sessions"

    # Create Case
    case = PatientCase.objects.create(
        patient=patient,
        title=case_title,
        description=f"Auto-generated case for {service.name} package.",
        status='OPEN',
        primary_practitioner=appointment.practitioner,
        payer='PRIVATE',  # Default to private pay for packages
        approved_sessions=service.session_allocation,
        package_cost=service.price,
    )

    # Update Case fields directly
    case.session_source = 'PACKAGE'
    case.completed_sessions = 0
    case.is_unlimited = False
    case.save(update_fields=['session_source', 'completed_sessions', 'is_unlimited'])

    # Link Case to Appointment
    appointment.patient_case = case
    appointment.save(update_fields=['patient_case'])
