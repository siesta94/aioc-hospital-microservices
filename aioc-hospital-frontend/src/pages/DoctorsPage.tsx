import { useEffect, useState } from 'react';
import { Plus, X, Stethoscope, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { doctorApi, type Doctor } from '../services/scheduling';
import { userManagementApi, type ManagedUser } from '../services/management';
import { SPECIALTIES, SUB_SPECIALTIES } from '../constants/specialties';

export function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoadError, setUsersLoadError] = useState(false);
  const [retryingUsers, setRetryingUsers] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ user_id: 0, display_name: '', specialty: '', sub_specialty: '' });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setUsersLoadError(false);
    try {
      const [docRes, userRes] = await Promise.all([
        doctorApi.list({ limit: 200 }),
        userManagementApi.list({ limit: 200 }),
      ]);
      setDoctors(docRes.items);
      setUsers(userRes.items);
    } catch {
      setUsersLoadError(true);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);
    try {
      await doctorApi.create({
        user_id: form.user_id,
        display_name: form.display_name.trim(),
        specialty: form.specialty,
        sub_specialty: form.sub_specialty || undefined,
      });
      setShowModal(false);
      setForm({ user_id: 0, display_name: '', specialty: '', sub_specialty: '' });
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? 'Failed to create doctor.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const usedUserIds = new Set(doctors.map(d => d.user_id));
  const availableUsers = users.filter(u => !usedUserIds.has(u.id));

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Doctors</h1>
          <p className="text-gray-500 text-sm mt-1">Manage doctor accounts for scheduling</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-95"
          style={{ background: 'linear-gradient(135deg, #0f2d4f, #0d7377)' }}
        >
          <Plus size={16} />
          Add Doctor
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
      ) : doctors.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-500">
          <Stethoscope size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-medium">No doctors yet</p>
          <p className="text-sm mt-1">
            {availableUsers.length === 0
              ? 'Create users in User Management first, then use “Add Doctor” to link a user as a doctor.'
              : 'Use “Add Doctor” above to link a user account to a doctor profile.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Doctor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Specialty</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {doctors.map(d => (
                <tr key={d.id} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3.5 font-medium text-gray-800">{d.display_name}</td>
                  <td className="px-5 py-3.5 text-gray-600">
                    {[d.specialty, d.sub_specialty].filter(Boolean).join(' — ') || '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.is_active ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-500'}`}>
                      {d.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 text-white" style={{ background: 'linear-gradient(135deg, #0f2d4f, #0d7377)' }}>
              <h2 className="font-semibold">New Doctor</h2>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white"><X size={20} /></button>
            </div>
            {availableUsers.length === 0 ? (
              <div className="p-6 space-y-4">
                {usersLoadError ? (
                  <>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                      <AlertCircle size={15} />
                      Could not load user list. Check that you’re logged in as admin and the management service is running.
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setRetryingUsers(true);
                        try {
                          const userRes = await userManagementApi.list({ limit: 200 });
                          setUsers(userRes.items);
                          setUsersLoadError(false);
                        } catch {
                          setUsersLoadError(true);
                        } finally {
                          setRetryingUsers(false);
                        }
                      }}
                      disabled={retryingUsers}
                      className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                      {retryingUsers && <Loader2 size={14} className="animate-spin" />}
                      Retry loading users
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      To add a doctor, you need at least one <strong>user account</strong> to link. Create a user in User Management first, then return here to link them as a doctor.
                    </p>
                    <Link
                      to="/admin/dashboard/users"
                      className="block w-full py-2.5 rounded-xl text-sm font-semibold text-center text-white"
                      style={{ background: 'linear-gradient(135deg, #0f2d4f, #0d7377)' }}
                      onClick={() => setShowModal(false)}
                    >
                      Go to User Management
                    </Link>
                  </>
                )}
                <button type="button" onClick={() => setShowModal(false)} className="block w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">
                  Cancel
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    <AlertCircle size={15} />{error}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">User account *</label>
                  <select
                    required
                    value={form.user_id === 0 ? '' : String(form.user_id)}
                    onChange={e => {
                      const raw = e.target.value;
                      const id = raw ? Number(raw) : 0;
                      const u = users.find(x => x.id === id);
                      setForm(f => ({ ...f, user_id: id, display_name: u?.full_name ?? u?.username ?? '' }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
                  >
                    <option value="">Select user…</option>
                    {availableUsers.map(u => (
                      <option key={u.id} value={String(u.id)}>{u.full_name ?? u.username} (@{u.username})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Display name *</label>
                  <input
                    required
                    value={form.display_name}
                    onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    placeholder="Dr. Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Specialty *</label>
                  <select
                    required
                    value={form.specialty}
                    onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
                  >
                    <option value="">Select specialty…</option>
                    {SPECIALTIES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sub-specialty (optional)</label>
                  <select
                    value={form.sub_specialty}
                    onChange={e => setForm(f => ({ ...f, sub_specialty: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
                  >
                    <option value="">None</option>
                    {SUB_SPECIALTIES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">Cancel</button>
                  <button type="submit" disabled={submitLoading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-70" style={{ background: 'linear-gradient(135deg, #0f2d4f, #0d7377)' }}>
                    {submitLoading && <Loader2 size={14} className="animate-spin" />}
                    Create
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
