from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

# Import all viewsets
from apps.accounts.views import AuthViewSet, UserViewSet, RoleViewSet, PermissionViewSet
from apps.clinics.views import ClinicViewSet, PractitionerViewSet, LocationViewSet
from apps.patients.views import PatientViewSet, IntakeFormViewSet
from apps.appointments.views import AppointmentViewSet, PractitionerScheduleViewSet, AppointmentReminderViewSet
from apps.records.views import ClinicalNoteViewSet, NoteTemplateViewSet, OutcomeMeasureViewSet, AttachmentViewSet
from apps.billing.views import InvoiceViewSet, InvoiceItemViewSet, PaymentViewSet, ServiceViewSet
from apps.reports.views import ReportViewSet
from apps.notifications.views import NotificationViewSet, EmailLogViewSet, SMSLogViewSet
from apps.integrations.views import PhilHealthClaimViewSet, HMOClaimViewSet
from apps.contacts.views import ContactViewSet

# Create router
router = DefaultRouter()

# Accounts routes
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'users', UserViewSet, basename='users')
router.register(r'roles', RoleViewSet, basename='roles')
router.register(r'permissions', PermissionViewSet, basename='permissions')

# Clinics routes
router.register(r'clinics', ClinicViewSet, basename='clinics')
router.register(r'practitioners', PractitionerViewSet, basename='practitioners')
router.register(r'locations', LocationViewSet, basename='locations')

# Patients routes
router.register(r'patients', PatientViewSet, basename='patients')
router.register(r'intake-forms', IntakeFormViewSet, basename='intake-forms')


router.register(r'contacts', ContactViewSet, basename='contacts')

# Appointments routes
router.register(r'appointments', AppointmentViewSet, basename='appointments')
router.register(r'practitioner-schedules', PractitionerScheduleViewSet, basename='practitioner-schedules')
router.register(r'appointment-reminders', AppointmentReminderViewSet, basename='appointment-reminders')

# Records routes
router.register(r'clinical-notes', ClinicalNoteViewSet, basename='clinical-notes')
router.register(r'note-templates', NoteTemplateViewSet, basename='note-templates')
router.register(r'outcome-measures', OutcomeMeasureViewSet, basename='outcome-measures')
router.register(r'attachments', AttachmentViewSet, basename='attachments')

# Billing routes
router.register(r'invoices', InvoiceViewSet, basename='invoices')
router.register(r'invoice-items', InvoiceItemViewSet, basename='invoice-items')
router.register(r'payments', PaymentViewSet, basename='payments')
router.register(r'services', ServiceViewSet, basename='services')

# Reports routes
router.register(r'reports', ReportViewSet, basename='reports')

# Notifications routes
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r'email-logs', EmailLogViewSet, basename='email-logs')
router.register(r'sms-logs', SMSLogViewSet, basename='sms-logs')

# Integrations routes
router.register(r'philhealth-claims', PhilHealthClaimViewSet, basename='philhealth-claims')
router.register(r'hmo-claims', HMOClaimViewSet, basename='hmo-claims')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    
    # Add explicit auth endpoints
    path('api/auth/verify-token/', AuthViewSet.as_view({'post': 'verify_token'}), name='verify-token'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)