import axios from 'axios';
import type { PortalData, BookingPayload, BookingConfirmation, SlotsResponse } from '@/types/portal';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api';

const publicApi = axios.create({ baseURL: BASE });

export const fetchPortal = async (token: string): Promise<PortalData> => {
  const res = await publicApi.get<PortalData>(`/public/portal/${token}/`);
  return res.data;
};

export const fetchAvailableSlots = async (
  token: string,
  serviceId: number,
  date: string,
  practitionerId?: number | null,
): Promise<SlotsResponse> => {
  const params: Record<string, any> = { service: serviceId, date };
  if (practitionerId) params.practitioner = practitionerId;
  const res = await publicApi.get<SlotsResponse>(`/public/portal/${token}/slots/`, { params });
  return res.data;
};

export const submitBooking = async (
  token: string,
  payload: BookingPayload,
): Promise<BookingConfirmation> => {
  const res = await publicApi.post<BookingConfirmation>(
    `/public/portal/${token}/book/`,
    payload,
  );
  return res.data;
};