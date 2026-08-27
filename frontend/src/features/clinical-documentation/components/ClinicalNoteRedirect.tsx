import { Navigate, useParams } from 'react-router-dom';
import { usePatientProfileContext } from '@/features/patients/context/PatientProfileContext';

export const ClinicalNoteRedirect = () => {
  const { cases } = usePatientProfileContext();
  const { patientId } = useParams();

  // Find the first active case, or fallback to the first case, or null
  const activeCase = cases.find(c => c.status === 'OPEN') || cases[0];

  if (activeCase) {
    return <Navigate to={`/patients/${patientId}/cases/${activeCase.id}/clinical-documentation`} replace />;
  }

  // If no cases exist, just redirect to cases page
  return <Navigate to={`/patients/${patientId}/cases`} replace />;
};
