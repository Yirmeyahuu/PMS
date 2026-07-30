import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAppointment, updateAppointment } from '@/features/appointments/appointment.api';
import { getPatientCases, createPatientCase } from '@/features/patients/patientCases.api';
import { AlertTriangle, Plus, Link as LinkIcon, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { CaseModal } from '@/features/patients/CaseModal';
import toast from 'react-hot-toast';
import { usePractitioners } from '@/features/clinics/hooks/usePractitioners';

export const AppointmentCaseResolution: React.FC = () => {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { practitioners, loading: loadingPractitioners } = usePractitioners({});

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignList, setShowAssignList] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  // Fetch Appointment
  const {
    data: appointment,
    isLoading: loadingAppt,
    error: apptError,
  } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: () => getAppointment(Number(appointmentId)),
    enabled: !!appointmentId,
  });

  // Fetch Cases if needed
  const {
    data: patientCases = [],
    isLoading: loadingCases,
  } = useQuery({
    queryKey: ['patient-cases', appointment?.patient],
    queryFn: () => getPatientCases(appointment!.patient),
    enabled: !!appointment?.patient,
  });

  // Redirect if Case is already assigned
  useEffect(() => {
    if (appointment && appointment.patient_case) {
      navigate(`/patients/${appointment.patient}/cases/${appointment.patient_case}/clinical-documentation`, {
        state: { appointmentId: appointment.id },
        replace: true,
      });
    }
  }, [appointment, navigate]);

  if (loadingAppt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!appointment || apptError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center text-red-500">
          Failed to load appointment details.
        </div>
      </div>
    );
  }

  // We should only render UI if there's NO case assigned
  if (appointment.patient_case) return null;

  const handleCreateCase = async (data: any) => {
    try {
      // 1. Create the case
      const newCase = await createPatientCase({
        patient: appointment.patient,
        title: data.title,
        description: data.description,
        status: data.status,
        primary_practitioner: data.primaryPractitionerId ? Number(data.primaryPractitionerId) : undefined,
        primary_practitioner_name: data.primaryPractitionerName || undefined,
        payer: data.payer || undefined,
        alert_notes: data.alertNotes || undefined,
        approved_sessions: data.approvedSessions, 
        referred_by: data.referredBy || undefined,
        referral_info: data.referralInfo || undefined,
      });

      // 2. Link to appointment
      await updateAppointment(appointment.id, { patient_case: newCase.id });
      
      toast.success('Case created and assigned successfully');
      setShowCreateModal(false);
      
      // 3. Navigate to Clinical Documentation
      navigate(`/patients/${appointment.patient}/cases/${newCase.id}/clinical-documentation`, {
        state: { appointmentId: appointment.id },
        replace: true,
      });
    } catch (err) {
      toast.error('Failed to create case');
      console.error(err);
    }
  };

  const handleAssignExisting = async (caseId: number) => {
    setIsLinking(true);
    try {
      await updateAppointment(appointment.id, { patient_case: caseId });
      toast.success('Case assigned successfully');
      
      // Navigate to Clinical Documentation
      navigate(`/patients/${appointment.patient}/cases/${caseId}/clinical-documentation`, {
        state: { appointmentId: appointment.id },
        replace: true,
      });
    } catch (err) {
      toast.error('Failed to assign case');
      console.error(err);
      setIsLinking(false);
    }
  };

  const activeCases = patientCases.filter(c => c.status !== 'CLOSED');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      <div className="absolute inset-0 bg-slate-100/50 pointer-events-none" />
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-amber-50 border-b border-amber-100 p-6 flex flex-col items-center text-center relative">
            <button 
              onClick={() => {
                if (window.history.length > 2) {
                  navigate(-1);
                } else {
                  navigate('/diary');
                }
              }} 
              className="absolute left-6 top-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-4 text-amber-600 shadow-sm border border-amber-200">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">No Case Assigned</h2>
            <p className="text-slate-600 mb-2">
              This appointment for <strong className="text-slate-800">{appointment.patient_name}</strong> is not yet associated with a clinical case.
            </p>
            <p className="text-sm text-slate-500 max-w-sm">
              Please assign an existing case or create a new one to continue into Clinical Documentation.
            </p>
          </div>

          <div className="p-6 bg-white">
            {!showAssignList ? (
              <div className="grid gap-4">
                <button
                  onClick={() => setShowAssignList(true)}
                  className="flex items-center gap-4 p-5 rounded-xl border-2 border-slate-100 hover:border-sky-500 hover:bg-sky-50 group transition-all text-left shadow-sm hover:shadow"
                >
                  <div className="w-12 h-12 bg-white shadow-sm border border-slate-200 rounded-lg flex items-center justify-center group-hover:bg-sky-500 group-hover:border-sky-500 transition-colors">
                    <LinkIcon className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-sky-900">Assign Existing Case</h3>
                    <p className="text-sm text-slate-500 group-hover:text-sky-700">Select from the patient's existing cases</p>
                  </div>
                </button>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-4 p-5 rounded-xl border-2 border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 group transition-all text-left shadow-sm hover:shadow"
                >
                  <div className="w-12 h-12 bg-white shadow-sm border border-slate-200 rounded-lg flex items-center justify-center group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-colors">
                    <Plus className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-emerald-900">Create New Case</h3>
                    <p className="text-sm text-slate-500 group-hover:text-emerald-700">Start a new episode of care</p>
                  </div>
                </button>
              </div>
            ) : (
              <div className="animate-in slide-in-from-right-4 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900">Select Case for {appointment.patient_name}</h3>
                  <button 
                    onClick={() => setShowAssignList(false)}
                    className="text-sm text-sky-600 hover:text-sky-700 font-medium px-2 py-1 hover:bg-sky-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                
                {loadingCases ? (
                  <div className="py-8 text-center text-slate-500 flex flex-col items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-600 mb-2"></div>
                    Loading cases...
                  </div>
                ) : activeCases.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                    No active cases found for this patient.
                    <div className="mt-4">
                      <button
                        onClick={() => {
                          setShowAssignList(false);
                          setShowCreateModal(true);
                        }}
                        className="text-emerald-600 font-medium hover:underline flex items-center gap-1 mx-auto"
                      >
                        <Plus className="w-4 h-4" /> Create a new case
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {activeCases.map(c => (
                      <button
                        key={c.id}
                        disabled={isLinking}
                        onClick={() => handleAssignExisting(c.id)}
                        className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-sky-500 hover:bg-sky-50 transition-all disabled:opacity-50 text-left group"
                      >
                        <div>
                          <h4 className="font-semibold text-slate-900 group-hover:text-sky-900">{c.title}</h4>
                          <p className="text-xs text-slate-500 mt-1">
                            Opened {new Date(c.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-slate-300 group-hover:text-sky-500 transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <CaseModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          mode="create"
          initialValues={{
            primary_practitioner: appointment.practitioner ?? null,
            primary_practitioner_name: appointment.practitioner_name ?? null,
          }}
          lockPractitioner
          onSave={handleCreateCase}
          practitioners={practitioners}
          loadingPractitioners={loadingPractitioners}
        />
      </div>
    </div>
  );
};

export default AppointmentCaseResolution;
