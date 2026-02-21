import { useEffect, useState, useCallback } from 'react';
import {
  Search, Plus, X, ChevronDown, ShieldCheck,
  UserRound, Loader2, AlertCircle, ToggleLeft, ToggleRight, Trash2,
} from 'lucide-react';
import { userManagementApi, type ManagedUser, type UserCreate, type UserRole } from '../services/management';

const ROLES: UserRole[] = ['user', 'admin'];

const ROLE_STYLES: Record<UserRole, string> = {
  user:  'bg-teal-100 text-teal-700',
  admin: 'bg-blue-100 text-blue-700',
};

interface CreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateUserModal({ onClose, onCreated }: CreateModalProps) {
  const [form, setForm] = useState<UserCreate>({ username: '', password: '', role: 'user' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof UserCreate, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if ((form.password?.length ?? 0) < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await userManagementApi.create({
        username: form.username.trim(),
        password: form.password,
        role: form.role,
        full_name: form.full_name?.trim() || undefined,
      });
      onCreated();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { detail?: string | Array<{ msg?: string; loc?: unknown[] }> } } })?.response?.data;
      const detail = res?.detail;
      const msg = typeof detail === 'string'
        ? detail
        : Array.isArray(detail) && detail.length > 0
          ? (detail[0].msg ?? JSON.stringify(detail[0]))
          : undefined;
      setError(msg ?? 'Failed to create user. Please try again.');
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
          <h2 className="text-white font-semibold">New User Account</h2>
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

          <Field label="Full Name">
            <input className={inp} value={form.full_name ?? ''} onChange={e => set('full_name', e.target.value)} placeholder="Dr. Jane Smith" />
          </Field>

          <Field label="Username" required>
            <input className={inp} value={form.username} onChange={e => set('username', e.target.value)} required placeholder="jsmith" autoComplete="off" />
          </Field>

          <Field label="Password" required>
            <input
              type="password"
              className={inp}
              value={form.password}
              onChange={e => set('password', e.target.value)}
              required
              minLength={6}
              placeholder="Min 6 characters"
              autoComplete="new-password"
            />
          </Field>

          <Field label="Role" required>
            <div className="relative">
              <select
                className={inp + ' appearance-none pr-8'}
                value={form.role}
                onChange={e => set('role', e.target.value as UserRole)}
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </Field>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #0f2d4f, #0d7377)' }}
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Creating…' : 'Create User'}
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

const inp = 'w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all';

export function UserManagementPage() {
  const [users, setUsers]           = useState<ManagedUser[]>([]);
  const [total, setTotal]           = useState(0);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [actionId, setActionId]     = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ManagedUser | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userManagementApi.list({ search: search || undefined, limit: 100 });
      setUsers(res.items);
      setTotal(res.total);
    } catch {
      // auth errors handled by parent
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (user: ManagedUser) => {
    setActionId(user.id);
    try {
      await userManagementApi.update(user.id, { is_active: !user.is_active });
      await load();
    } catch {
      // ignore
    } finally {
      setActionId(null);
    }
  };

  const handleDeletePermanent = async () => {
    if (!deleteConfirm) return;
    setDeleteError('');
    setActionId(deleteConfirm.id);
    try {
      await userManagementApi.deletePermanent(deleteConfirm.id);
      setDeleteConfirm(null);
      await load();
    } catch (err: unknown) {
      const res = (err as { response?: { data?: { detail?: string } } })?.response?.data;
      setDeleteError(typeof res?.detail === 'string' ? res.detail : 'Failed to delete user.');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">{total} account{total !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #0f2d4f, #0d7377)' }}
        >
          <Plus size={16} />
          New User
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-5">
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by username or name…"
            className="w-full pl-8 pr-8 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <UserRound size={48} className="opacity-20 mb-3" />
            <p className="text-sm font-medium">No users found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center rounded-full text-white text-xs font-bold shrink-0"
                        style={{
                          width: 34, height: 34,
                          background: u.role === 'admin'
                            ? 'linear-gradient(135deg, #0f2d4f, #0d7377)'
                            : 'linear-gradient(135deg, #1a4a7a, #14a085)',
                        }}
                      >
                        {u.role === 'admin' ? <ShieldCheck size={14} /> : (u.full_name ?? u.username).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{u.full_name ?? u.username}</p>
                        {u.full_name && <p className="text-xs text-gray-400">@{u.username}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${ROLE_STYLES[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${u.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleActive(u)}
                        disabled={actionId === u.id}
                        title={u.is_active ? 'Deactivate' : 'Activate'}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-50
                          ${u.is_active
                            ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                            : 'text-green-600 border-green-200 hover:bg-green-50'
                          }`}
                      >
                        {actionId === u.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : u.is_active ? <ToggleLeft size={13} /> : <ToggleRight size={13} />
                        }
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(u)}
                        disabled={actionId === u.id}
                        title="Delete user permanently"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <CreateUserModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load(); }}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Delete user permanently?</h2>
              <p className="text-sm text-gray-500 mt-1">
                <span className="font-medium text-gray-700">{deleteConfirm.full_name ?? deleteConfirm.username}</span>
                {deleteConfirm.full_name && <span className="text-gray-400"> (@{deleteConfirm.username})</span>}
                {' '}will be removed and cannot be restored.
              </p>
            </div>
            {deleteError && (
              <div className="mx-6 mt-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle size={15} className="shrink-0" />
                {deleteError}
              </div>
            )}
            <div className="flex gap-3 p-6">
              <button
                type="button"
                onClick={() => { setDeleteConfirm(null); setDeleteError(''); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeletePermanent}
                disabled={actionId === deleteConfirm.id}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-70 transition-colors"
              >
                {actionId === deleteConfirm.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                {actionId === deleteConfirm.id ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
