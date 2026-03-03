import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

import { fetchPortal, fetchAvailableSlots, submitBooking } from '../portal.api';
import { PortalSidebar }       from '../components/PortalSidebar';
import { ServiceList }         from '../components/ServiceList';
import { DateTimeStep }        from '../components/DateTimeStep';
import { PatientDetailsForm }  from '../components/PatientDetailsForm';
import { PortalFooterActions } from '../components/PortalFooterActions';

import type {
  PortalData,
  PortalService,
  BookingPayload,
} from '@/types/portal';
import type { PatientFormData } from '../components/PatientDetailsForm';

type Step = 'services' | 'datetime' | 'details';

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

  // Portal data
  const [portal,  setPortal]  = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // Service selection
  const [search,          setSearch]          = useState('');
  const [activeTab,       setActiveTab]        = useState<'Appointments' | 'Classes'>('Appointments');
  const [selectedService, setSelectedService]  = useState<PortalService | null>(null);

  // Date / time
  const [selectedDate,   setSelectedDate]   = useState('');
  const [selectedSlot,   setSelectedSlot]   = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading,   setSlotsLoading]   = useState(false);

  // Patient form
  const [step,       setStep]       = useState<Step>('services');
  const [formData,   setFormData]   = useState<PatientFormData>(EMPTY_FORM);
  const [formError,  setFormError]  = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // ── Load portal ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchPortal(token)
      .then(setPortal)
      .catch(() => setError('This booking page is unavailable or the link has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  // ── Fetch slots ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token || !selectedService || !selectedDate) return;
    setSlotsLoading(true);
    fetchAvailableSlots(token, selectedService.id, selectedDate)
      .then((r) => setAvailableSlots(r.slots))
      .catch(() => setAvailableSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [token, selectedService, selectedDate]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectService = (svc: PortalService) => {
    setSelectedService(svc);
    setSelectedDate('');
    setSelectedSlot('');
    setAvailableSlots([]);
    setStep('datetime');
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot('');
  };

  const handleBack = () => {
    if (step === 'details') { setStep('datetime'); return; }
    if (step === 'datetime') {
      setSelectedService(null);
      setSelectedDate('');
      setSelectedSlot('');
      setStep('services');
    }
  };

  const handleContinue = () => {
    if (selectedDate && selectedSlot) setStep('details');
  };

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
        err.response?.data?.detail || 'Failed to submit booking. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

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

  // ── Filter services by search query ──────────────────────────────────────
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
    <div className="min-h-screen bg-gray-100 flex">

      {/* Sidebar */}
      <PortalSidebar
        portal={portal}
        selectedService={selectedService}
        selectedDate={selectedDate}
        selectedSlot={selectedSlot}
      />

      {/* Main */}
      <main className="flex-1 p-6 flex flex-col">

        {/* Heading */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">
            {portal.heading || portal.clinic_name}
          </h1>
          {portal.description && (
            <p className="text-gray-500 mt-1">{portal.description}</p>
          )}
        </div>

        {/* Search + tab bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2.5 bg-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          {(['Appointments', 'Classes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto">
          {step === 'services' && (
            <ServiceList
              categories={filteredCategories}
              selectedService={selectedService}
              onSelectService={handleSelectService}
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

        {/* Footer */}
        <PortalFooterActions
          step={step}
          canContinue={!!(selectedDate && selectedSlot)}
          submitting={submitting}
          onBack={handleBack}
          onContinue={handleContinue}
          onSubmit={handleSubmit}
        />
      </main>
    </div>
  );
};