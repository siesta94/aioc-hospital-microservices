import axios from 'axios';

// In local dev the Vite proxy forwards /api/* to localhost:8000, so base URL is ''.
// In Docker (or any deployed env) VITE_API_URL is set at build time to the backend origin.
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export type UserRole = 'user' | 'admin';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  username: string;
  full_name: string | null;
}

export interface UserInfo {
  id: number;
  username: string;
  role: UserRole;
  is_active: boolean;
  full_name: string | null;
}

const USER_TOKEN_KEY = 'hospital_user_token';
const ADMIN_TOKEN_KEY = 'hospital_admin_token';

export const authService = {
  async loginUser(username: string, password: string): Promise<TokenResponse> {
    const { data } = await axios.post<TokenResponse>(`${API_BASE}/api/auth/login`, { username, password });
    localStorage.setItem(USER_TOKEN_KEY, data.access_token);
    return data;
  },

  async loginAdmin(username: string, password: string): Promise<TokenResponse> {
    const { data } = await axios.post<TokenResponse>(`${API_BASE}/api/auth/admin/login`, { username, password });
    localStorage.setItem(ADMIN_TOKEN_KEY, data.access_token);
    return data;
  },

  getUserToken(): string | null {
    return localStorage.getItem(USER_TOKEN_KEY);
  },

  getAdminToken(): string | null {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  },

  logoutUser() {
    localStorage.removeItem(USER_TOKEN_KEY);
  },

  logoutAdmin() {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  },

  async fetchUserInfo(): Promise<UserInfo> {
    const token = authService.getUserToken();
    const { data } = await axios.get<UserInfo>(`${API_BASE}/api/dashboard/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  },

  async fetchAdminInfo(): Promise<UserInfo> {
    const token = authService.getAdminToken();
    const { data } = await axios.get<UserInfo>(`${API_BASE}/api/admin/dashboard/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  },
};
