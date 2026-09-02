import type { ReactNode } from 'react';
import { Calendar, FolderKanban, MessageSquare, Settings, UserCircle2, Receipt, Files } from 'lucide-react';
import { Navigate, NavLink, Outlet, useParams, useLocation } from 'react-router-dom';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { ClinicalNoteNavItem } from './components/ClinicalNoteNavItem';
import { PatientProfileProvider, usePatientProfileContext } from './context/PatientProfileContext';
import { PatientAvatar } from './components/PatientAvatar';

interface NavItemProps {
  label: string;
  to: string;
  icon: ReactNode;
  activePathPattern?: string;
  end?: boolean;
}

const NavItem = ({ label, to, icon, activePathPattern, end }: NavItemProps) => {
  const location = useLocation();
  const isCustomActive = activePathPattern ? new RegExp(activePathPattern).test(location.pathname) : undefined;

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => {
        const active = isCustomActive !== undefined ? isCustomActive : isActive;
        return `flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
          active
            ? 'bg-sky-700 text-white shadow-sm'
            : 'text-sky-50 hover:bg-sky-300 hover:text-sky-900'
        }`;
      }}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
};

const PatientProfileShell = ({ patientId }: { patientId: number }) => {
  const { patient, loadingPatient } = usePatientProfileContext();

  return (
    <DashboardLayout>
      {/* FIXED SIDEBAR */}
      <aside className="fixed left-0 top-0 bottom-0 h-screen w-56 xl:w-64 bg-sky-600 border-r border-sky-700 overflow-y-auto z-40 pt-14 flex flex-col">
        <div className="p-4 flex-1">
          <div className="text-center border-b border-sky-500 pb-4 mb-4">
            <div className="mx-auto flex justify-center mb-3">
              {loadingPatient || !patient ? (
                <div className="w-16 h-16 rounded-full bg-sky-500 animate-pulse" />
              ) : (
                <PatientAvatar
                  avatarUrl={patient.avatar}
                  name={patient.full_name}
                  className="w-16 h-16 border-2 border-white/20 shadow-sm"
                />
              )}
            </div>
            <h2 className="mt-3 font-heading text-sm text-white">
              {loadingPatient ? 'Loading...' : patient?.full_name ?? 'Unknown Patient'}
            </h2>
            <p className="text-[11px] text-sky-200 mt-1">
              Client ID: {loadingPatient ? '...' : patient?.patient_number ?? 'N/A'}
            </p>
            {patient?.is_archived && !patient?.is_merged && (
              <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                Archived
              </span>
            )}
            {patient?.is_merged && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-left">
                <p className="text-xs font-medium text-red-800 flex items-center gap-1 mb-1">
                  <Settings className="w-3 h-3" /> Merged Profile
                </p>
                <p className="text-[11px] text-red-600 mb-2">
                  This profile is archived and merged into another patient record.
                </p>
                {patient.merged_into && (
                  <NavLink
                    to={`/patients/${patient.merged_into}/profile`}
                    className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1"
                  >
                    Open Primary Patient &rarr;
                  </NavLink>
                )}
              </div>
            )}
          </div>

          <nav className="space-y-1">
            <NavItem
              label="Profile"
              to={`/patients/${patientId}/profile`}
              icon={<UserCircle2 className="w-4 h-4" />}
            />
            <NavItem
              label="Appointments"
              to={`/patients/${patientId}/appointments`}
              icon={<Calendar className="w-4 h-4" />}
            />
            <NavItem
              label="Cases"
              to={`/patients/${patientId}/cases`}
              icon={<FolderKanban className="w-4 h-4" />}
              end={true}
            />
            <NavItem
              label="Documents"
              to={`/patients/${patientId}/documents`}
              icon={<Files className="w-4 h-4" />}
            />
            <ClinicalNoteNavItem />
            <NavItem
              label="Invoices"
              to={`/patients/${patientId}/invoices`}
              icon={<Receipt className="w-4 h-4" />}
            />
            <NavItem
              label="Communication History"
              to={`/patients/${patientId}/communications`}
              icon={<MessageSquare className="w-4 h-4" />}
            />
            <NavItem
              label="Settings"
              to={`/patients/${patientId}/settings`}
              icon={<Settings className="w-4 h-4" />}
            />
          </nav>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="ml-56 xl:ml-64 flex-1 h-full overflow-y-auto flex flex-col relative bg-clinical-cloud p-4 lg:p-6">
        <Outlet />
      </main>
    </DashboardLayout>
  );
};

export default function PatientProfileLayout() {
  const { patientId: patientIdParam } = useParams<{ patientId: string }>();

  if (!patientIdParam) {
    return <Navigate to="/clients" replace />;
  }

  const parsedPatientId = Number(patientIdParam);
  if (Number.isNaN(parsedPatientId) || parsedPatientId <= 0) {
    return <Navigate to="/clients" replace />;
  }

  return (
    <PatientProfileProvider patientId={parsedPatientId}>
      <PatientProfileShell patientId={parsedPatientId} />
    </PatientProfileProvider>
  );
}
