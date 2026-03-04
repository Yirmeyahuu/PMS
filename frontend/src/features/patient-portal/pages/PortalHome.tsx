import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

import { fetchPortal, submitBooking } from '../portal.api';
import { PortalSidebar }       from '../components/PortalSidebar';
import { PractitionerStep }    from '../components/PractitionerStep';
import { ServiceList }         from '../components/ServiceList';
import { PatientDetailsForm }  from '../components/PatientDetailsForm';
import { PortalFooterActions } from '../components/PortalFooterActions';

import type {
  PortalData,
  PortalPractitioner,
  PortalService,
  BookingPayload,
} from '@/types/portal';
import type { PatientFormData } from '../components/PatientDetailsForm';

type Step = 'practitioner' | 'services' | 'datetime' | 'details';

const STEP_NUMBER: Record<Step, number> = {
  practitioner: 1,
  services:     2,
  datetime:     3,
  details:      4,
};

const EMPTY_FORM: PatientFormData = {
  first_name: '',
  last_name:  '',
  email:      '',
  phone:      '',
  notes:      '',
};

export const PortalHome: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate  = useNavigate();

  // ── Portal data ──────────────────────────────────────────────────────────
  const [portal,  setPortal]  = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // ── Selections ───────────────────────────────────────────────────────────
  const [step,                 setStep]                 = useState<Step>('practitioner');
  const [selectedPractitioner, setSelectedPractitioner] = useState<PortalPractitioner | null>(null);
  const [selectedService,      setSelectedService]      = useState<PortalService | null>(null);
  const [search,               setSearch]               = useState('');

  // ── Date / time ──────────────────────────────────────────────────────────
  const [selectedDate,   setSelectedDate]   = useState('');
  const [selectedSlot,   setSelectedSlot]   = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading,   setSlotsLoading]   = useState(false);

  // ── Patient form ─────────────────────────────────────────────────────────
  const [formData,   setFormData]   = useState<PatientFormData>(EMPTY_FORM);
  const [formError,  setFormError]  = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Load portal on mount ─────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetchPortal(token)
      .then(setPortal)
      .catch(() => setError('This booking page is unavailable or the link has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  // ── Fetch slots when service + date are set (datetime step only) ─────────
  useEffect(() => {
    if (step !== 'datetime') return;
    if (!token || !selectedService || !selectedDate) return;
    setSlotsLoading(true);
    import('../portal.api').then(({ fetchAvailableSlots }) =>
      fetchAvailableSlots(
        token,
        selectedService.id,
        selectedDate,
        selectedPractitioner?.id ?? null,
      )
        .then((r) => setAvailableSlots(r.slots))
        .catch(() => setAvailableSlots([]))
        .finally(() => setSlotsLoading(false))
    );
  }, [step, token, selectedService, selectedDate, selectedPractitioner]);

  // ── Navigation handlers ──────────────────────────────────────────────────
  const handleSelectPractitioner = (p: PortalPractitioner) => {
    setSelectedPractitioner(p);
  };

  const handleSelectService = (svc: PortalService) => {
    setSelectedService(svc);
    setSelectedDate('');
    setSelectedSlot('');
    setAvailableSlots([]);
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot('');
  };

  /**
   * Called when the user picks a date + slot directly from the inline
   * PortalAvailabilityCalendar inside ServiceCard.
   * We store the picked values and jump straight to 'details', skipping
   * the separate 'datetime' step entirely.
   */
  const handleInlineDateTimeConfirm = (date: string, slot: string) => {
    setSelectedDate(date);
    setSelectedSlot(slot);
    setStep('details');
  };

  const handleContinue = () => {
    if (step === 'practitioner' && selectedPractitioner) setStep('services');
    if (step === 'services'     && selectedService)      setStep('datetime');
    if (step === 'datetime'     && selectedDate && selectedSlot) setStep('details');
  };

  const handleBack = () => {
    if (step === 'details')  { setStep('datetime');     return; }
    if (step === 'datetime') { setStep('services');     return; }
    if (step === 'services') { setStep('practitioner'); return; }
  };

  // ── Submit booking ───────────────────────────────────────────────────────
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

  // ── canContinue per step ─────────────────────────────────────────────────
  // On 'services' step, the user can either:
  //   a) select a service and click Continue (goes to datetime step), or
  //   b) use the inline calendar to jump directly to details.
  // So Continue is enabled as soon as a service is selected.
  const canContinue =
    (step === 'practitioner' && !!selectedPractitioner) ||
    (step === 'services'     && !!selectedService)       ||
    (step === 'datetime'     && !!(selectedDate && selectedSlot));

  const todayStr = new Date().toISOString().split('T')[0];

  // ── Loading / error states ───────────────────────────────────────────────
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

  // ── Filter services for search ───────────────────────────────────────────
  const filteredCategories = portal.categories
    .map((cat) => ({
      ...cat,
      services: cat.services.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.description.toLowerCase().includes(search.toLowerCase()),
      ),
    }))
    .filter((cat) => cat.services.length > 0);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* Sidebar */}
      <PortalSidebar
        portal={portal}
        selectedPractitioner={selectedPractitioner}
        selectedService={selectedService}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
        currentStep={STEP_NUMBER[step]}
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

          {/* Search bar — only on services step */}
          {step === 'services' && (
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

          {step === 'practitioner' && (
            <PractitionerStep
              practitioners={portal.practitioners}
              selectedPractitioner={selectedPractitioner}
              onSelect={handleSelectPractitioner}
            />
          )}

          {step === 'services' && (
            <ServiceList
              categories={filteredCategories}
              selectedService={selectedService}
              onSelectService={handleSelectService}
              // ── inline calendar props ──
              token={token}
              selectedPractitioner={selectedPractitioner}
              onDateTimeConfirm={handleInlineDateTimeConfirm}
            />
          )}

          {step === 'datetime' && selectedService && (
            <DateTimeStep
              selectedService={selectedService}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              availableSlots={availableSlots}
              slotsLoading={slotsLoading}
              todayStr={todayStr}
              onDateChange={handleDateChange}
              onSlotChange={setSelectedSlot}
            />
          )}

          {step === 'details' && (
            <PatientDetailsForm
              formData={formData}
              formError={formError}
              onChange={setFormData}
            />
          )}
        </div>

        {/* Footer actions */}
        <div className="px-8 pb-6">
          <PortalFooterActions
            step={step}
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