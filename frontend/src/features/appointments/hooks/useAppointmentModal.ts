import { useState } from 'react';

interface AppointmentSlot {
  date: Date;
  time: string;
  hour: number;
  minutes: number;
}

export const useAppointmentModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);

  const openModal = (slot: AppointmentSlot) => {
    setSelectedSlot(slot);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedSlot(null);
  };

  return {
    isOpen,
    selectedSlot,
    openModal,
    closeModal,
  };
};