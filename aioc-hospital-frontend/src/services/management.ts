import axios from 'axios';
import { authService } from './auth';

/** Base URL for the management service (patients only). */
export const MANAGEMENT_API_BASE = (import.meta.env.VITE_MANAGEMENT_API_URL as string | undefined) ?? '';
/** Base URL for the login service (auth + user management). */
const LOGIN_API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
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

function adminHeaders() {
  return { Authorization: `Bearer ${authService.getAdminToken()}` };
}

/** Admin or user token so both staff and admin dashboards can call patient API. */
function patientAuthHeaders() {
  const token = authService.getAdminToken() ?? authService.getUserToken();
  return { Authorization: `Bearer ${token}` };
}

// ── Patient API ──────────────────────────────────────────────────────────────

export const patientApi = {
  async list(params?: { search?: string; is_active?: boolean; skip?: number; limit?: number }): Promise<PatientListResponse> {
    const { data } = await axios.get(`${BASE}/api/patients`, {
      params,
      headers: patientAuthHeaders(),
    });
    return data;
  },

  async create(body: PatientCreate): Promise<Patient> {
    const { data } = await axios.post(`${BASE}/api/patients`, body, {
      headers: patientAuthHeaders(),
    });
    return data;
  },

  async get(id: number): Promise<Patient> {
    const { data } = await axios.get(`${BASE}/api/patients/${id}`, {
      headers: patientAuthHeaders(),
    });
    return data;
  },

  async update(id: number, body: PatientUpdate): Promise<Patient> {
    const { data } = await axios.put(`${BASE}/api/patients/${id}`, body, {
      headers: patientAuthHeaders(),
    });
    return data;
  },

  async deactivate(id: number): Promise<void> {
    await axios.delete(`${BASE}/api/patients/${id}`, {
      headers: patientAuthHeaders(),
    });
  },
};

// ── User management API (admin only; login service) ──────────────────────────

export const userManagementApi = {
  async list(params?: { search?: string; skip?: number; limit?: number }): Promise<UserListResponse> {
    const { data } = await axios.get(`${LOGIN_API_BASE}/api/users`, {
      params,
      headers: adminHeaders(),
    });
    return data;
  },

  async create(body: UserCreate): Promise<ManagedUser> {
    const { data } = await axios.post(`${LOGIN_API_BASE}/api/users`, body, {
      headers: adminHeaders(),
    });
    return data;
  },

  async update(id: number, body: UserUpdate): Promise<ManagedUser> {
    const { data } = await axios.put(`${LOGIN_API_BASE}/api/users/${id}`, body, {
      headers: adminHeaders(),
    });
    return data;
  },

  async deactivate(id: number): Promise<void> {
    await axios.delete(`${LOGIN_API_BASE}/api/users/${id}`, {
      headers: adminHeaders(),
    });
  },

  /** Permanently remove user from the database. Cannot delete yourself. */
  async deletePermanent(id: number): Promise<void> {
    await axios.delete(`${LOGIN_API_BASE}/api/users/${id}/permanent`, {
      headers: adminHeaders(),
    });
  },
};
