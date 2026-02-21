import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Users, Settings, ScrollText, ShieldCheck, Activity, Server, AlertTriangle } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { UserManagementPage } from './UserManagementPage';
import { DoctorsPage } from './DoctorsPage';
import { AdminPatientsPage } from './AdminPatientsPage';
import { authService, type UserInfo } from '../services/auth';

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div
        className="flex items-center justify-center rounded-xl shrink-0"
        style={{ width: 48, height: 48, background: color + '18' }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function AdminHome({ user }: { user: UserInfo }) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Administration Panel
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {today} — Logged in as <span className="font-semibold text-gray-700">{user.full_name ?? user.username}</span>
          </p>
        </div>
        <span
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
          style={{ background: 'linear-gradient(90deg, #0f2d4f, #0d7377)' }}
        >
          <ShieldCheck size={13} />
          ADMIN
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Users size={22} />} label="Total Users" value="14" sub="2 admins, 12 staff" color="#1a4a7a" />
        <StatCard icon={<Activity size={22} />} label="System Status" value="OK" sub="All services running" color="#14a085" />
        <StatCard icon={<Server size={22} />} label="DB Connections" value="3" sub="of 100 max" color="#0d7377" />
        <StatCard icon={<AlertTriangle size={22} />} label="Alerts" value="0" sub="No issues detected" color="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User table preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Users Overview</h2>
            <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">
              Manage users
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {USERS.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex items-center justify-center rounded-full text-white text-xs font-bold shrink-0"
                          style={{ width: 28, height: 28, background: u.role === 'admin' ? '#0f2d4f' : '#1a4a7a' }}
                        >
                          {u.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-700">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.role === 'admin'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-teal-100 text-teal-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit log preview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Recent Audit Log</h2>
            <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">
              View all logs
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {LOGS.map((log, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3">
                <div
                  className="flex items-center justify-center rounded-full shrink-0 mt-0.5"
                  style={{ width: 28, height: 28, background: '#0f2d4f12' }}
                >
                  <ScrollText size={12} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{log.action}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <span className="font-medium">{log.user}</span> · {log.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlaceholderPage({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-24 text-gray-400">
        <span className="opacity-30 mb-4">{icon}</span>
        <p className="text-sm font-medium">This section is coming soon</p>
        <p className="text-xs mt-1 text-gray-300">Content will appear here</p>
      </div>
    </div>
  );
}

const USERS = [
  { id: 1, name: 'Default Admin', role: 'admin' },
  { id: 2, name: 'Default User', role: 'user' },
  { id: 3, name: 'Dr. Sarah Lee', role: 'user' },
  { id: 4, name: 'Nurse Tom Baker', role: 'user' },
];

const LOGS = [
  { action: 'User logged in via /admin', user: 'admin', time: 'Just now' },
  { action: 'User account activated', user: 'admin', time: '5 min ago' },
  { action: 'System settings updated', user: 'admin', time: '1 hour ago' },
  { action: 'New user created: Dr. Sarah Lee', user: 'admin', time: '3 hours ago' },
  { action: 'Password policy updated', user: 'admin', time: 'Yesterday' },
];

export function AdminDashboard() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    authService
      .fetchAdminInfo()
      .then(setUser)
      .catch(() => {
        authService.logoutAdmin();
        navigate('/admin');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar role="admin" username={user.username} fullName={user.full_name} />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route index element={<AdminHome user={user} />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="patients" element={<AdminPatientsPage />} />
          <Route path="doctors" element={<DoctorsPage />} />
          <Route path="settings" element={<PlaceholderPage title="System Settings" icon={<Settings size={64} />} />} />
          <Route path="logs" element={<PlaceholderPage title="Audit Logs" icon={<ScrollText size={64} />} />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
