import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Plus, X, ChevronDown, UserRound,
  Loader2, AlertCircle, ExternalLink,
} from 'lucide-react';
import { patientApi, type Patient, type PatientCreate, type Gender } from '../services/management';

const GENDERS: Gender[] = ['male', 'female', 'other'];

function Badge({ active }: { active: boolean }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
      active ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-500'
    }`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

interface ModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreatePatientModal({ onClose, onCreated }: ModalProps) {
  const [form, setForm] = useState<PatientCreate>({
    medical_record_number: '',
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'male',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof PatientCreate, v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await patientApi.create(form);
      onCreated();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? 'Failed to create patient. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ background: 'linear-gradient(135deg, #1a4a7a, #0d7377)' }}
        >
          <h2 className="text-white font-semibold">New Patient</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" required>
              <input className={input} value={form.first_name} onChange={e => set('first_name', e.target.value)} required />
            </Field>
            <Field label="Last Name" required>
              <input className={input} value={form.last_name} onChange={e => set('last_name', e.target.value)} required />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date of Birth" required>
              <input type="date" className={input} value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} required />
            </Field>
            <Field label="Gender" required>
              <div className="relative">
                <select className={input + ' appearance-none pr-8'} value={form.gender} onChange={e => set('gender', e.target.value as Gender)} required>
                  {GENDERS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </Field>
          </div>

          <Field label="Medical Record Number" required>
            <input className={input} value={form.medical_record_number} onChange={e => set('medical_record_number', e.target.value)} required placeholder="e.g. MRN-001234" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <input type="email" className={input} value={form.email ?? ''} onChange={e => set('email', e.target.value)} placeholder="patient@email.com" />
            </Field>
            <Field label="Phone">
              <input className={input} value={form.phone ?? ''} onChange={e => set('phone', e.target.value)} placeholder="+1 555 000 0000" />
            </Field>
          </div>

          <Field label="Address">
            <input className={input} value={form.address ?? ''} onChange={e => set('address', e.target.value)} placeholder="Street, City, Country" />
          </Field>

          <Field label="Notes">
            <textarea className={input + ' resize-none'} rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} placeholder="Additional notes…" />
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #1a4a7a, #0d7377)' }}
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Creating…' : 'Create Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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

const input = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all';

export function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await patientApi.list({
        search: search || undefined,
        is_active: filterActive,
        limit: 100,
      });
      setPatients(res.items);
      setTotal(res.total);
    } catch {
      // token invalid — parent will handle redirect
    } finally {
      setLoading(false);
    }
  }, [search, filterActive]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Patients</h1>
          <p className="text-gray-500 text-sm mt-1">{total} patient{total !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #1a4a7a, #0d7377)' }}
        >
          <Plus size={16} />
          New Patient
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or MRN…"
            className="w-full pl-8 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        {(['all', 'active', 'inactive'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilterActive(f === 'all' ? undefined : f === 'active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${
              (f === 'all' && filterActive === undefined) ||
              (f === 'active' && filterActive === true) ||
              (f === 'inactive' && filterActive === false)
                ? 'bg-gray-700 text-white border-gray-700'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex gap-5">
        {/* Patient list */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-24 text-gray-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <UserRound size={48} className="opacity-20 mb-3" />
              <p className="text-sm font-medium">No patients found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {patients.map(p => (
                <Link
                  key={p.id}
                  to={`/dashboard/patients/${p.id}`}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors hover:bg-gray-50"
                >
                  <div
                    className="flex items-center justify-center rounded-full text-white text-sm font-bold shrink-0"
                    style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #1a4a7a, #0d7377)' }}
                  >
                    {p.first_name.charAt(0)}{p.last_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{p.first_name} {p.last_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">MRN: {p.medical_record_number}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400 capitalize">{p.gender}</span>
                    <Badge active={p.is_active} />
                    <ExternalLink size={14} className="text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>

      {showModal && (
        <CreatePatientModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
