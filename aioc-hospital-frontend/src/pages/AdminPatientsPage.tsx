import { useEffect, useState, useCallback } from 'react';
import {
  Search, X, UserRound, Loader2, AlertCircle, UserMinus, ToggleRight,
} from 'lucide-react';
import { patientApi, type Patient } from '../services/management';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const input =
  'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all';

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function matches(typed: string, expected: string) {
  return normalize(typed) === normalize(expected);
}

interface DeactivateConfirmModalProps {
  patient: Patient;
  onClose: () => void;
  onDeactivated: () => void;
}

function DeactivateConfirmModal({ patient, onClose, onDeactivated }: DeactivateConfirmModalProps) {
  const [first_name, setFirst_name] = useState('');
  const [last_name, setLast_name] = useState('');
  const [mrn, setMrn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const firstOk = matches(first_name, patient.first_name);
  const lastOk = matches(last_name, patient.last_name);
  const mrnOk = matches(mrn, patient.medical_record_number);
  const canConfirm = firstOk && lastOk && mrnOk;

  const handleDeactivate = async () => {
    if (!canConfirm) return;
    setError('');
    setLoading(true);
    try {
      await patientApi.deactivate(patient.id);
      onDeactivated();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { detail?: string } } })?.response?.data;
      setError(typeof res?.detail === 'string' ? res.detail : 'Failed to deactivate patient.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: 'linear-gradient(135deg, #0f2d4f, #0d7377)' }}
        >
          <h2 className="text-white font-semibold">Confirm deactivate patient</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <p className="text-sm text-gray-600">
            To deactivate <span className="font-semibold text-gray-800">{patient.first_name} {patient.last_name}</span>
            {' '}(MRN: <span className="font-mono text-gray-700">{patient.medical_record_number}</span>), type their
            first name, last name, and Medical Record Number below. The patient will remain visible everywhere with status Inactive.
          </p>
        </div>

        <form onSubmit={e => { e.preventDefault(); handleDeactivate(); }} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          <Field label="First name" required>
            <input
              className={input}
              value={first_name}
              onChange={e => setFirst_name(e.target.value)}
              placeholder="As shown in the patient record"
              autoComplete="off"
            />
            {first_name && !firstOk && (
              <p className="text-xs text-amber-600 mt-1">Must match patient&apos;s first name</p>
            )}
          </Field>
          <Field label="Last name" required>
            <input
              className={input}
              value={last_name}
              onChange={e => setLast_name(e.target.value)}
              placeholder="As shown in the patient record"
              autoComplete="off"
            />
            {last_name && !lastOk && (
              <p className="text-xs text-amber-600 mt-1">Must match patient&apos;s last name</p>
            )}
          </Field>
          <Field label="Medical Record Number (MRN)" required>
            <input
              className={input}
              value={mrn}
              onChange={e => setMrn(e.target.value)}
              placeholder="As shown in the patient record"
              autoComplete="off"
            />
            {mrn && !mrnOk && (
              <p className="text-xs text-amber-600 mt-1">Must match patient&apos;s MRN</p>
            )}
          </Field>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canConfirm || loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <UserMinus size={15} />}
              {loading ? 'Deactivating…' : 'Deactivate patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AdminPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deactivatePatient, setDeactivatePatient] = useState<Patient | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await patientApi.list({
        search: search || undefined,
        limit: 200,
      });
      setPatients(res.items);
      setTotal(res.total);
    } catch {
      // auth handled by parent
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleActivate = async (p: Patient) => {
    setActionId(p.id);
    try {
      await patientApi.update(p.id, { is_active: true });
      await load();
    } catch {
      // ignore
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Patients</h1>
        <p className="text-gray-500 text-sm mt-1">{total} patient{total !== 1 ? 's' : ''} total</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-5">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or MRN…"
            className="w-full pl-8 pr-8 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-24 text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <UserRound size={48} className="opacity-20 mb-3" />
            <p className="text-sm font-medium">No patients found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">MRN</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">DOB</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {patients.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center rounded-full text-white text-xs font-bold shrink-0"
                        style={{ width: 34, height: 34, background: 'linear-gradient(135deg, #1a4a7a, #0d7377)' }}
                      >
                        {(p.first_name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{p.first_name} {p.last_name}</p>
                        {p.email && <p className="text-xs text-gray-400">{p.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-gray-700">{p.medical_record_number}</td>
                  <td className="px-5 py-3.5 text-gray-600">{p.date_of_birth}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {p.is_active ? (
                      <button
                        onClick={() => setDeactivatePatient(p)}
                        title="Deactivate patient"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-amber-200 text-amber-700 hover:bg-amber-50 transition-all"
                      >
                        <UserMinus size={13} />
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(p)}
                        disabled={actionId === p.id}
                        title="Activate patient"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-green-200 text-green-700 hover:bg-green-50 transition-all disabled:opacity-50"
                      >
                        {actionId === p.id ? <Loader2 size={13} className="animate-spin" /> : <ToggleRight size={13} />}
                        Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deactivatePatient && (
        <DeactivateConfirmModal
          patient={deactivatePatient}
          onClose={() => setDeactivatePatient(null)}
          onDeactivated={() => { setDeactivatePatient(null); load(); }}
        />
      )}
    </div>
  );
}
