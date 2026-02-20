import axios from 'axios';
import { authService } from './auth';

const BASE = (import.meta.env.VITE_SCHEDULING_API_URL as string | undefined) ?? '';

function userHeaders() {
  return { Authorization: `Bearer ${authService.getUserToken()}` };
}

function adminHeaders() {
  return { Authorization: `Bearer ${authService.getAdminToken()}` };
}

/** Use admin token if present (admin dashboard), else user token (staff). So both staff and admin can call scheduling APIs. */
function authHeaders() {
  const token = authService.getAdminToken() ?? authService.getUserToken();
  return { Authorization: `Bearer ${token}` };
}

// ── Types ───────────────────────────────────────────────────────────────────

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface Doctor {
  id: number;
  user_id: number;
  display_name: string;
  specialty: string | null;
  sub_specialty: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  scheduled_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by_id: number | null;
}

export interface AppointmentWithDetails extends Appointment {
  doctor_display_name: string | null;
  patient_name: string | null;
}

export interface AppointmentCreate {
  patient_id: number;
  doctor_id: number;
  scheduled_at: string; // ISO datetime
  duration_minutes?: number;
  notes?: string;
}

export interface AppointmentUpdate {
  scheduled_at?: string;
  duration_minutes?: number;
  status?: AppointmentStatus;
  notes?: string;
}

// ── Doctors (staff can list; admin can create/update/deactivate) ──────────────

export const doctorApi = {
  async list(params?: { is_active?: boolean; skip?: number; limit?: number }): Promise<{ items: Doctor[]; total: number }> {
    const { data } = await axios.get(`${BASE}/api/doctors`, { params, headers: authHeaders() });
    return data;
  },

  async create(body: { user_id: number; display_name: string; specialty: string; sub_specialty?: string }): Promise<Doctor> {
    const { data } = await axios.post(`${BASE}/api/doctors`, body, { headers: adminHeaders() });
    return data;
  },

  async get(id: number): Promise<Doctor> {
    const { data } = await axios.get(`${BASE}/api/doctors/${id}`, { headers: authHeaders() });
    return data;
  },

  /** Current user's doctor profile (for staff). 404 if user is not a doctor. */
  async getMe(): Promise<Doctor> {
    const { data } = await axios.get(`${BASE}/api/doctors/me`, { headers: userHeaders() });
    return data;
  },

  async update(id: number, body: { display_name?: string; specialty?: string; sub_specialty?: string; is_active?: boolean }): Promise<Doctor> {
    const { data } = await axios.put(`${BASE}/api/doctors/${id}`, body, { headers: adminHeaders() });
    return data;
  },
};

// ── Appointments ────────────────────────────────────────────────────────────

export const appointmentApi = {
  async list(params?: {
    patient_id?: number;
    doctor_id?: number;
    from?: string;
    to?: string;
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ items: Appointment[]; total: number }> {
    const { data } = await axios.get(`${BASE}/api/appointments`, { params, headers: userHeaders() });
    return data;
  },

  async calendar(params: { from: string; to: string; doctor_id?: number; patient_id?: number }): Promise<{
    items: AppointmentWithDetails[];
    total: number;
  }> {
    const { data } = await axios.get(`${BASE}/api/appointments/calendar`, { params, headers: userHeaders() });
    return data;
  },

  async recent(params?: { limit?: number }): Promise<{ items: AppointmentWithDetails[]; total: number }> {
    const { data } = await axios.get(`${BASE}/api/appointments/recent`, { params: params ?? {}, headers: userHeaders() });
    return data;
  },

  async create(body: AppointmentCreate): Promise<Appointment> {
    const { data } = await axios.post(`${BASE}/api/appointments`, body, { headers: userHeaders() });
    return data;
  },

  async get(id: number): Promise<Appointment> {
    const { data } = await axios.get(`${BASE}/api/appointments/${id}`, { headers: userHeaders() });
    return data;
  },

  async update(id: number, body: AppointmentUpdate): Promise<Appointment> {
    const { data } = await axios.put(`${BASE}/api/appointments/${id}`, body, { headers: userHeaders() });
    return data;
  },

  async cancel(id: number): Promise<void> {
    await axios.delete(`${BASE}/api/appointments/${id}`, { headers: userHeaders() });
  },
};
