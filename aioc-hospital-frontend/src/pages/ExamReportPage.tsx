import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Loader2, AlertCircle, Save, Stethoscope,
} from 'lucide-react';
import { patientApi, type Patient } from '../services/management';
import { reportsApi } from '../services/reports';
import { appointmentApi, type Appointment } from '../services/scheduling';
import { SPECIALTIES } from '../constants/specialties';

const DIAGNOSIS_CODES = [
  { value: '', label: '— Select diagnosis code —' },
  { value: 'Z00.00', label: 'Z00.00 - Encounter for general adult medical examination' },
  { value: 'Z00.121', label: 'Z00.121 - Encounter for routine child health examination' },
  { value: 'I10', label: 'I10 - Essential (primary) hypertension' },
  { value: 'E11.9', label: 'E11.9 - Type 2 diabetes mellitus without complications' },
  { value: 'J06.9', label: 'J06.9 - Acute upper respiratory infection, unspecified' },
  { value: 'M54.5', label: 'M54.5 - Low back pain' },
  { value: 'R51', label: 'R51 - Headache' },
  { value: 'K21.9', label: 'K21.9 - Gastroesophageal reflux disease without esophagitis' },
  { value: 'F32.9', label: 'F32.9 - Major depressive disorder, single episode, unspecified' },
  { value: 'G47.33', label: 'G47.33 - Obstructive sleep apnea' },
  { value: 'J45.20', label: 'J45.20 - Mild intermittent asthma, uncomplicated' },
  { value: 'M17.11', label: 'M17.11 - Unilateral primary osteoarthritis, right knee' },
  { value: 'Other', label: 'Other' },
];

export function ExamReportPage() {
  const { patientId, appointmentId } = useParams<{ patientId: string; appointmentId: string }>();
  const navigate = useNavigate();
  const pid = patientId ? parseInt(patientId, 10) : NaN;
  const aid = appointmentId ? parseInt(appointmentId, 10) : NaN;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentDiagnosis, setCurrentDiagnosis] = useState('');
  const [currentContent, setCurrentContent] = useState('');
  const [currentTherapy, setCurrentTherapy] = useState('');
  const [currentLabExams, setCurrentLabExams] = useState('');
  const [currentReferralSpecialty, setCurrentReferralSpecialty] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!Number.isInteger(pid) || pid < 1 || !Number.isInteger(aid) || aid < 1) {
      setError('Invalid patient or appointment');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      patientApi.get(pid).then(p => p),
      appointmentApi.get(aid),
    ])
      .then(([p, a]) => {
        if (!cancelled) {
          if (a.patient_id !== p.id) {
            setError('Appointment does not belong to this patient.');
            setPatient(null);
            setAppointment(null);
            return;
          }
          if (!p.is_active) {
            setError('Cannot start an exam for an inactive patient.');
            setPatient(p);
            setAppointment(a);
            return;
          }
          if (a.status !== 'scheduled') {
            setError('This appointment is not scheduled for an exam.');
            setPatient(p);
            setAppointment(a);
            return;
          }
          setPatient(p);
          setAppointment(a);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Patient or appointment not found.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [pid, aid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient || !currentContent.trim()) return;
    setSaveError('');
    setSaving(true);
    try {
      await reportsApi.create(patient.id, {
        content: currentContent.trim(),
        diagnosis_code: currentDiagnosis || undefined,
        therapy: currentTherapy.trim() || undefined,
        lab_exams: currentLabExams.trim() || undefined,
        referral_specialty: currentReferralSpecialty || undefined,
      });
      await appointmentApi.update(aid, { status: 'completed' });
      navigate(`/dashboard/patients/${patient.id}`, { replace: true });
    } catch {
      setSaveError('Failed to save report or update appointment.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto flex justify-center py-24">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !patient || !appointment) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <AlertCircle size={20} />
          {error || 'Not found'}
        </div>
        <Link
          to={Number.isInteger(pid) && pid > 0 ? `/dashboard/patients/${pid}` : '/dashboard/patients'}
          className="inline-flex items-center gap-2 mt-4 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft size={16} /> Back to patient
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link
        to={`/dashboard/patients/${patient.id}`}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={16} /> Back to {patient.first_name} {patient.last_name}
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Stethoscope size={20} className="text-gray-500" />
          <h1 className="text-xl font-semibold text-gray-800">File report — Start exam</h1>
        </div>
        <p className="px-5 py-2 text-sm text-gray-500">
          Appointment: {new Date(appointment.scheduled_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {saveError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={15} />{saveError}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Diagnosis code</label>
            <select
              value={currentDiagnosis}
              onChange={e => setCurrentDiagnosis(e.target.value)}
              className="w-full max-w-xs px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
            >
              {DIAGNOSIS_CODES.map(opt => (
                <option key={opt.value || 'empty'} value={opt.value === '' ? '' : opt.label}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Report content</label>
            <textarea
              value={currentContent}
              onChange={e => setCurrentContent(e.target.value)}
              placeholder="Type the report here…"
              rows={14}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm placeholder-gray-400 resize-y"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Therapy</label>
            <textarea
              value={currentTherapy}
              onChange={e => setCurrentTherapy(e.target.value)}
              placeholder="Suggested medications…"
              rows={4}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm placeholder-gray-400 resize-y"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lab exams</label>
            <textarea
              value={currentLabExams}
              onChange={e => setCurrentLabExams(e.target.value)}
              placeholder="Suggested lab exams…"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm placeholder-gray-400 resize-y"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Referral (directive)</label>
            <select
              value={currentReferralSpecialty}
              onChange={e => setCurrentReferralSpecialty(e.target.value)}
              className="w-full max-w-md px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
            >
              <option value="">— No referral —</option>
              {SPECIALTIES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving || !currentContent.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #1a4a7a, #0d7377)' }}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            <Save size={14} />
            Save report & complete appointment
          </button>
        </form>
      </div>
    </div>
  );
}
