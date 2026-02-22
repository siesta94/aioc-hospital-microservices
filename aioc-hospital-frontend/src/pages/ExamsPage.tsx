import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Loader2, AlertCircle, Stethoscope } from 'lucide-react';
import { doctorApi, appointmentApi, type Doctor, type AppointmentWithDetails } from '../services/scheduling';

export function ExamsPage() {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    doctorApi
      .getMe()
      .then((d) => {
        if (cancelled) return;
        setDoctor(d);
        if (!d) {
          setError('No doctor profile linked to your account. Contact an administrator.');
          return;
        }
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const to = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
        return appointmentApi.calendar({ from, to, doctor_id: d.id });
      })
      .then((cal) => {
        if (cancelled || !cal) return;
        const scheduled = cal.items
          .filter((a) => a.status === 'scheduled')
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
        setAppointments(scheduled);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.status === 401 ? 'Please log in again.' : 'Failed to load your exams.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto flex justify-center py-24">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
          <AlertCircle size={20} />
          {error || 'Not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <ClipboardList size={24} className="text-gray-600" />
        <h1 className="text-2xl font-bold text-gray-800">My exams</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Scheduled appointments for Dr. {doctor.display_name}. Start an exam to file a report and complete the appointment.
      </p>
      {appointments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
          No scheduled exams at the moment.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <ul className="divide-y divide-gray-100">
            {appointments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50/50">
                <div>
                  <p className="font-medium text-gray-800">
                    {a.patient_name ?? `Patient #${a.patient_id}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(a.scheduled_at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
                {a.patient_is_active !== false ? (
                  <Link
                    to={`/dashboard/patients/${a.patient_id}/exam/${a.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                    style={{ background: 'linear-gradient(135deg, #1a4a7a, #0d7377)' }}
                  >
                    <Stethoscope size={18} />
                    Start exam
                  </Link>
                ) : (
                  <span
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-400 bg-gray-100 cursor-not-allowed"
                    title="Patient is inactive"
                  >
                    <Stethoscope size={18} />
                    Start exam (inactive)
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
