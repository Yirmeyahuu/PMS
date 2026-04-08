import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

import { fetchPortal, submitBooking }  from '../portal.api';
import { PortalSidebar }              from '../components/PortalSidebar';
import { BranchStep }                 from '../components/BranchStep';
import { PractitionerStep }           from '../components/PractitionerStep';
import { ServiceList }                from '../components/ServiceList';
import { PatientDetailsForm }         from '../components/PatientDetailsForm';
import { PortalFooterActions }        from '../components/PortalFooterActions';

import type {
  PortalData,
  PortalBranch,
  PortalPractitioner,
  PortalService,
  PortalCategory,
  BookingPayload,
} from '../types/portal';
import type { PatientFormData } from '../components/PatientDetailsForm';

// ── After branch is picked, 3-step inner flow ─────────────────────────────────
type InnerStep = 'practitioner' | 'services' | 'details';

const INNER_STEP_NUMBER: Record<InnerStep, number> = {
  practitioner: 2,
  services:     3,
  details:      4,
};

const EMPTY_FORM: PatientFormData = {
  first_name:   '',
  last_name:    '',
  email:        '',
  phone:        '',
  notes:        '',
  date_of_birth: '',
};

export const PortalHome: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate  = useNavigate();

  // ── Portal data ──────────────────────────────────────────────────────────
  const [portal,  setPortal]  = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // ── Branch gate ──────────────────────────────────────────────────────────
  const [selectedBranch, setSelectedBranch] = useState<PortalBranch | null>(null);

  // ── Inner step (only active after branch is chosen) ──────────────────────
  const [innerStep,            setInnerStep]            = useState<InnerStep>('practitioner');
  const [selectedPractitioner, setSelectedPractitioner] = useState<PortalPractitioner | null>(null);
  const [selectedService,      setSelectedService]      = useState<PortalService | null>(null);
  const [search,               setSearch]               = useState('');

  // ── Date / time ──────────────────────────────────────────────────────────
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');

  // ── Patient form ─────────────────────────────────────────────────────────
  const [formData,   setFormData]   = useState<PatientFormData>(EMPTY_FORM);
  const [formError,  setFormError]  = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Load portal ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetchPortal(token)
      .then(setPortal)
      .catch(() => setError('This booking page is unavailable or the link has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  // ── Branch selected → enter inner flow ───────────────────────────────────
  const handleSelectBranch = (branch: PortalBranch) => {
    setSelectedBranch(branch);
    // Reset downstream when re-choosing branch
    setSelectedPractitioner(null);
    setSelectedService(null);
    setSelectedDate('');
    setSelectedSlot('');
    setInnerStep('practitioner');
  };

  // ── Inner navigation ─────────────────────────────────────────────────────
  const handleSelectPractitioner = (p: PortalPractitioner) => setSelectedPractitioner(p);

  const handleSelectService = (svc: PortalService) => {
    setSelectedService(svc);
    setSelectedDate('');
    setSelectedSlot('');
  };

  const handleInlineDateTimeConfirm = (date: string, slot: string) => {
    setSelectedDate(date);
    setSelectedSlot(slot);
    setInnerStep('details');
  };

  const handleContinue = () => {
    if (innerStep === 'practitioner' && selectedPractitioner) setInnerStep('services');
  };

  const handleBack = () => {
    if (innerStep === 'details')      { setInnerStep('services');     return; }
    if (innerStep === 'services')     { setInnerStep('practitioner'); return; }
    // Back from first inner step → return to branch selection
    if (innerStep === 'practitioner') { setSelectedBranch(null);      return; }
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!token || !selectedService || !selectedDate || !selectedSlot) return;
    setFormError(null);

    if (!formData.first_name.trim() || !formData.last_name.trim()) {
      setFormError('First and last name are required.'); return;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setFormError('A valid email address is required.'); return;
    }
    if (!formData.phone.trim()) {
      setFormError('Phone number is required.'); return;
    }

    const payload: BookingPayload = {
      service:            selectedService.id,
      branch:             selectedBranch?.id ?? null,
      practitioner:       selectedPractitioner?.id ?? null,
      patient_first_name: formData.first_name,
      patient_last_name:  formData.last_name,
      patient_email:      formData.email,
      patient_phone:      formData.phone,
      notes:              formData.notes,
      appointment_date:   selectedDate,
      appointment_time:   selectedSlot,
    };

    setSubmitting(true);
    try {
      const confirmation = await submitBooking(token, payload);
      navigate(`/portal/${token}/success`, { state: { confirmation } });
    } catch (err: any) {
      setFormError(
        err.response?.data?.detail ?? 'Failed to submit booking. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const canContinue = innerStep === 'practitioner' && !!selectedPractitioner;

  // ── Filter practitioners by selected branch ───────────────────────────────
  const branchPractitioners = React.useMemo(() => {
    const all = portal?.practitioners ?? [];

    // ── DEV: log to confirm branch_id values are present ────────────────
    if (import.meta.env.DEV && selectedBranch) {
      console.debug(
        '[Portal] Selected branch id:', selectedBranch.id,
        '\n[Portal] All practitioners:',
        all.map((p: PortalPractitioner) => ({ id: p.id, name: p.full_name, branch_id: p.branch_id })),
      );
    }

    return all.filter((p: PortalPractitioner) => {
      if (p.id === null) return true;               // "Any Available" — always show
      return p.branch_id === selectedBranch?.id;    // strict number equality
    });
  }, [portal?.practitioners, selectedBranch]);

  // ── Filter services for search ────────────────────────────────────────────
  const filteredCategories = (portal?.categories ?? [])
    .map((cat: PortalCategory) => ({
      ...cat,
      services: cat.services.filter(
        (s: PortalService) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.description.toLowerCase().includes(search.toLowerCase()),
      ),
    }))
    .filter((cat: PortalCategory) => cat.services.length > 0);

  // ── Loading / error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (error || !portal) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-gray-600 text-lg">{error ?? 'Portal not found.'}</p>
        </div>
      </div>
    );
  }

  // ── GATE: Branch not yet selected → full-screen branch picker ────────────
  if (!selectedBranch) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">

        {/* Top header */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center gap-4">
          {portal.clinic_logo ? (
            <img
              src={portal.clinic_logo}
              alt={portal.clinic_name}
              className="w-10 h-10 rounded-xl object-cover border border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
              {portal.clinic_name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {portal.heading || portal.clinic_name}
            </h1>
            {portal.description && (
              <p className="text-sm text-gray-500">{portal.description}</p>
            )}
          </div>
        </div>

        {/* Branch picker */}
        <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full">
          <BranchStep
            branches={portal.branches ?? []}
            selectedBranch={null}
            onSelect={handleSelectBranch}
          />
        </div>
      </div>
    );
  }

  // ── MAIN: Branch selected → sidebar + inner steps ─────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Sidebar */}
      <PortalSidebar
        portal={portal}
        selectedBranch={selectedBranch}
        selectedPractitioner={selectedPractitioner}
        selectedService={selectedService}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        currentStep={INNER_STEP_NUMBER[innerStep]}
        onChangeBranch={() => setSelectedBranch(null)}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {portal.heading || portal.clinic_name}
            </h1>
            {portal.description && (
              <p className="text-sm text-gray-500">{portal.description}</p>
            )}
          </div>

          {innerStep === 'services' && (
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services..."
                className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-8">

          {innerStep === 'practitioner' && (
            <PractitionerStep
              practitioners={branchPractitioners}
              selectedPractitioner={selectedPractitioner}
              onSelect={handleSelectPractitioner}
            />
          )}

          {innerStep === 'services' && (
            <ServiceList
              categories={filteredCategories}
              selectedService={selectedService}
              onSelectService={handleSelectService}
              token={token}
              selectedPractitioner={selectedPractitioner}
              onDateTimeConfirm={handleInlineDateTimeConfirm}
              selectedBranch={selectedBranch}
            />
          )}

          {innerStep === 'details' && (
            <PatientDetailsForm
              formData={formData}
              formError={formError}
              onChange={setFormData}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-6">
          <PortalFooterActions
            step={innerStep}
            canContinue={canContinue}
            submitting={submitting}
            onBack={handleBack}
            onContinue={handleContinue}
            onSubmit={handleSubmit}
          />
        </div>
      </main>
    </div>
  );
};