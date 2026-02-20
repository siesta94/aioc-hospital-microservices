import axios from 'axios';
import { authService } from './auth';

const BASE = (import.meta.env.VITE_REPORTS_API_URL as string | undefined) ?? '';

function authHeaders() {
  const token = authService.getAdminToken() ?? authService.getUserToken();
  return { Authorization: `Bearer ${token}` };
}

export interface Report {
  id: number;
  patient_id: number;
  diagnosis_code: string | null;
  content: string;
  therapy: string | null;
  lab_exams: string | null;
  referral_specialty: string | null;
  created_at: string;
  updated_at: string;
  created_by_id: number | null;
}

export interface ReportCreate {
  diagnosis_code?: string;
  content: string;
  therapy?: string;
  lab_exams?: string;
  referral_specialty?: string;
}

export interface ReportUpdate {
  diagnosis_code?: string;
  content?: string;
  therapy?: string;
  lab_exams?: string;
  referral_specialty?: string;
}

export const reportsApi = {
  async list(patientId: number, params?: { skip?: number; limit?: number }): Promise<{ items: Report[]; total: number }> {
    const { data } = await axios.get(`${BASE}/api/patients/${patientId}/reports`, {
      params: params ?? {},
      headers: authHeaders(),
    });
    return data;
  },

  async create(patientId: number, body: ReportCreate): Promise<Report> {
    const { data } = await axios.post(`${BASE}/api/patients/${patientId}/reports`, body, {
      headers: authHeaders(),
    });
    return data;
  },

  async get(patientId: number, reportId: number): Promise<Report> {
    const { data } = await axios.get(`${BASE}/api/patients/${patientId}/reports/${reportId}`, {
      headers: authHeaders(),
    });
    return data;
  },

  async update(patientId: number, reportId: number, body: ReportUpdate): Promise<Report> {
    const { data } = await axios.patch(`${BASE}/api/patients/${patientId}/reports/${reportId}`, body, {
      headers: authHeaders(),
    });
    return data;
  },

  async delete(patientId: number, reportId: number): Promise<void> {
    await axios.delete(`${BASE}/api/patients/${patientId}/reports/${reportId}`, {
      headers: authHeaders(),
    });
  },

  /** Download report as PDF; triggers browser download. */
  async downloadPdf(patientId: number, reportId: number): Promise<void> {
    const { data } = await axios.get(`${BASE}/api/patients/${patientId}/reports/${reportId}/pdf`, {
      headers: authHeaders(),
      responseType: 'blob',
    });
    const url = URL.createObjectURL(data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${reportId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
