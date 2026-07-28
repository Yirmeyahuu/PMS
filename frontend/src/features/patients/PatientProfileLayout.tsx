import type { ReactNode } from 'react';
import { Calendar, FileText, FolderKanban, MessageSquare, Settings, UserCircle2, ClipboardList } from 'lucide-react';
import { Navigate, NavLink, Outlet, useParams } from 'react-router-dom';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { PatientProfileProvider, usePatientProfileContext } from './context/PatientProfileContext';

interface NavItemProps {
  label: string;
  to: string;
  icon: ReactNode;
}

const NavItem = ({ label, to, icon }: NavItemProps) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => (
        `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-sky-600 text-white shadow-sm'
            : 'text-gray-600 hover:bg-sky-50 hover:text-sky-700'
        }`
      )}
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
      <div className="h-[calc(100vh-80px)] p-4 md:p-6 overflow-hidden flex flex-col">
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          <aside className="w-full lg:w-70 xl:w-75 flex-shrink-0 overflow-y-auto">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
              <div className="text-center border-b border-gray-100 pb-5 mb-5">
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-sky-500 to-sky-700 text-white flex items-center justify-center text-2xl font-bold shadow-sm">
                  {loadingPatient || !patient
                    ? '...'
                    : `${patient.first_name.charAt(0)}${patient.last_name.charAt(0)}`
                  }
                </div>
                <h2 className="mt-3 font-heading text-base text-gray-900">
                  {loadingPatient ? 'Loading...' : patient?.full_name ?? 'Unknown Patient'}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
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

              <nav className="space-y-2">
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
                />
                <NavItem
                  label="Clinical Documentation"
                  to={`/patients/${patientId}/clinical`}
                  icon={<ClipboardList className="w-4 h-4" />}
                />
                <NavItem
                  label="Unassigned Notes"
                  to={`/patients/${patientId}/unassigned-notes`}
                  icon={<FileText className="w-4 h-4" />}
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

          <section className="flex-1 min-h-0 overflow-y-auto flex flex-col relative">
            <Outlet />
          </section>
        </div>
      </div>
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
