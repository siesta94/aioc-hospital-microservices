import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Calendar, Users, FileText, TrendingUp, Clock, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { CalendarPage } from './CalendarPage';
import { PatientsPage } from './PatientsPage';
import { PatientDetailPage } from './PatientDetailPage';
import { ReportViewPage } from './ReportViewPage';
import { authService, type UserInfo } from '../services/auth';
import { patientApi } from '../services/management';
import { appointmentApi, type AppointmentWithDetails } from '../services/scheduling';
import { ExamReportPage } from './ExamReportPage';
import { ExamsPage } from './ExamsPage';

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

function getTodayRange() {
  const d = new Date();
  const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
  const start = new Date(y, m, day, 0, 0, 0, 0);
  const end = new Date(y, m, day, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function getMonthRange() {
  const d = new Date();
  const y = d.getFullYear(), m = d.getMonth();
  const start = new Date(y, m, 1, 0, 0, 0, 0);
  const end = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function relativeTime(iso: string) {
  const sec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hour(s) ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)} day(s) ago`;
  return new Date(iso).toLocaleDateString();
}

function activityLabel(a: AppointmentWithDetails): { text: string; color: string; icon: React.ReactNode } {
  const name = a.patient_name ?? 'Patient';
  switch (a.status) {
    case 'completed':
      return { text: `${name} — Appointment completed`, color: '#14a085', icon: <CheckCircle2 size={12} /> };
    case 'cancelled':
      return { text: `${name} — Appointment cancelled`, color: '#dc2626', icon: <XCircle size={12} /> };
    case 'no_show':
      return { text: `${name} — No-show`, color: '#6b7280', icon: <XCircle size={12} /> };
    default:
      return { text: `${name} — Appointment scheduled`, color: '#0d7377', icon: <Calendar size={12} /> };
  }
}

function DashboardHome({ user }: { user: UserInfo }) {
  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const [loading, setLoading] = useState(true);
  const [totalPatients, setTotalPatients] = useState<number | null>(null);
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCompleted, setTodayCompleted] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [todayUpcoming, setTodayUpcoming] = useState<AppointmentWithDetails[]>([]);
  const [recentActivity, setRecentActivity] = useState<AppointmentWithDetails[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const { start: todayStart, end: todayEnd } = getTodayRange();
    const { start: monthStart, end: monthEnd } = getMonthRange();

    Promise.all([
      patientApi.list({ limit: 1 }).then(r => r.total),
      appointmentApi.list({ from: todayStart, to: todayEnd, limit: 1 }),
      appointmentApi.list({ from: todayStart, to: todayEnd, status: 'completed', limit: 1 }),
      appointmentApi.list({ from: monthStart, to: monthEnd, limit: 1 }),
      appointmentApi.calendar({ from: todayStart, to: todayEnd }),
      appointmentApi.recent({ limit: 15 }),
    ])
      .then(([patientsTotal, todayRes, completedRes, monthRes, calendarRes, recentRes]) => {
        if (cancelled) return;
        setTotalPatients(patientsTotal);
        setTodayTotal(todayRes.total);
        setTodayCompleted(completedRes.total);
        setMonthlyTotal(monthRes.total);
        const upcoming = (calendarRes.items || []).filter(
          a => a.status === 'scheduled'
        );
        setTodayUpcoming(upcoming.slice(0, 10));
        setRecentActivity(recentRes.items || []);
      })
      .catch(() => {
        if (!cancelled) {
          setTotalPatients(0);
          setTodayUpcoming([]);
          setRecentActivity([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const pendingToday = Math.max(0, todayTotal - todayCompleted);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Good {getGreeting()}, {user.full_name ?? user.username}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{todayStr}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Calendar size={22} />}
          label="Today's Appointments"
          value={loading ? '—' : String(todayTotal)}
          sub={loading ? undefined : `${pendingToday} pending`}
          color="#1a4a7a"
        />
        <StatCard
          icon={<Users size={22} />}
          label="Total Patients"
          value={loading ? '—' : (totalPatients ?? 0).toLocaleString()}
          color="#0d7377"
        />
        <StatCard
          icon={<CheckCircle2 size={22} />}
          label="Completed Today"
          value={loading ? '—' : String(todayCompleted)}
          sub={loading ? undefined : `of ${todayTotal} scheduled`}
          color="#14a085"
        />
        <StatCard
          icon={<TrendingUp size={22} />}
          label="Monthly Visits"
          value={loading ? '—' : monthlyTotal.toLocaleString()}
          color="#2563ab"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Upcoming (today)</h2>
            <Link to="/dashboard/calendar" className="text-xs text-blue-600 font-medium hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
            ) : todayUpcoming.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-gray-500">No upcoming appointments today</div>
            ) : (
              todayUpcoming.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <div
                    className="flex items-center justify-center rounded-full text-white text-xs font-bold shrink-0"
                    style={{ width: 36, height: 36, background: '#1a4a7a' }}
                  >
                    {(a.patient_name ?? '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/dashboard/patients/${a.patient_id}`} className="text-sm font-medium text-blue-600 hover:underline truncate block">
                      {a.patient_name ?? '—'}
                    </Link>
                    <p className="text-xs text-gray-400">{a.doctor_display_name ?? '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-gray-700">{formatTime(a.scheduled_at)}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">
                      scheduled
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
            ) : recentActivity.length === 0 ? (
              <div className="px-5 py-6 text-center text-sm text-gray-500">No recent activity</div>
            ) : (
              recentActivity.slice(0, 10).map((a) => {
                const { text, color, icon } = activityLabel(a);
                return (
                  <div key={a.id} className="flex items-start gap-3 px-5 py-3">
                    <div
                      className="flex items-center justify-center rounded-full shrink-0 mt-0.5"
                      style={{ width: 28, height: 28, background: color + '18' }}
                    >
                      <span style={{ color }}>{icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">
                        <Link to={`/dashboard/patients/${a.patient_id}`} className="text-blue-600 hover:underline">
                          {text}
                        </Link>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock size={10} />
                        {relativeTime(a.updated_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export function UserDashboard() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    authService
      .fetchUserInfo()
      .then(setUser)
      .catch(() => {
        authService.logoutUser();
        navigate('/login');
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
      <Sidebar role="user" username={user.username} fullName={user.full_name} />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route index element={<DashboardHome user={user} />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/:patientId" element={<PatientDetailPage />} />
          <Route path="patients/:patientId/exam/:appointmentId" element={<ExamReportPage />} />
          <Route path="patients/:patientId/reports/:reportId" element={<ReportViewPage />} />
          <Route path="reports" element={<PlaceholderPage title="Reports" icon={<FileText size={64} />} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
