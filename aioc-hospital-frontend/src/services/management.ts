import axios from 'axios';
import { authService } from './auth';

/** Base URL for the management service (patients, users). Used by the browser to load patient list etc. */
export const MANAGEMENT_API_BASE = (import.meta.env.VITE_MANAGEMENT_API_URL as string | undefined) ?? '';
const BASE = MANAGEMENT_API_BASE;

export type Gender = 'male' | 'female' | 'other';
export type UserRole = 'user' | 'admin';

// ── Patient types ────────────────────────────────────────────────────────────

export interface Patient {
  id: number;
  medical_record_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: Gender;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_id: number | null;
}

export interface PatientListResponse {
  items: Patient[];
  total: number;
}

export interface PatientCreate {
  medical_record_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: Gender;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface PatientUpdate {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: Gender;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  is_active?: boolean;
}

// ── User types ───────────────────────────────────────────────────────────────

export interface ManagedUser {
  id: number;
  username: string;
  role: UserRole;
  is_active: boolean;
  full_name: string | null;
}

export interface UserListResponse {
  items: ManagedUser[];
  total: number;
}

export interface UserCreate {
  username: string;
  password: string;
  role: UserRole;
  full_name?: string;
}

export interface UserUpdate {
  full_name?: string;
  is_active?: boolean;
  role?: UserRole;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function userHeaders() {
  return { Authorization: `Bearer ${authService.getUserToken()}` };
}

function adminHeaders() {
  return { Authorization: `Bearer ${authService.getAdminToken()}` };
}

// ── Patient API ──────────────────────────────────────────────────────────────

export const patientApi = {
  async list(params?: { search?: string; is_active?: boolean; skip?: number; limit?: number }): Promise<PatientListResponse> {
    const { data } = await axios.get(`${BASE}/api/patients`, {
      params,
      headers: userHeaders(),
    });
    return data;
  },

  async create(body: PatientCreate): Promise<Patient> {
    const { data } = await axios.post(`${BASE}/api/patients`, body, {
      headers: userHeaders(),
    });
    return data;
  },

  async get(id: number): Promise<Patient> {
    const { data } = await axios.get(`${BASE}/api/patients/${id}`, {
      headers: userHeaders(),
    });
    return data;
  },

  async update(id: number, body: PatientUpdate): Promise<Patient> {
    const { data } = await axios.put(`${BASE}/api/patients/${id}`, body, {
      headers: userHeaders(),
    });
    return data;
  },

  async deactivate(id: number): Promise<void> {
    await axios.delete(`${BASE}/api/patients/${id}`, {
      headers: userHeaders(),
    });
  },
};

// ── User management API (admin only) ─────────────────────────────────────────

export const userManagementApi = {
  async list(params?: { search?: string; skip?: number; limit?: number }): Promise<UserListResponse> {
    const { data } = await axios.get(`${BASE}/api/users`, {
      params,
      headers: adminHeaders(),
    });
    return data;
  },

  async create(body: UserCreate): Promise<ManagedUser> {
    const { data } = await axios.post(`${BASE}/api/users`, body, {
      headers: adminHeaders(),
    });
    return data;
  },

  async update(id: number, body: UserUpdate): Promise<ManagedUser> {
    const { data } = await axios.put(`${BASE}/api/users/${id}`, body, {
      headers: adminHeaders(),
    });
    return data;
  },

  async deactivate(id: number): Promise<void> {
    await axios.delete(`${BASE}/api/users/${id}`, {
      headers: adminHeaders(),
    });
  },
};
