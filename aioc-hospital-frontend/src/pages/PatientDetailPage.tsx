import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  UserRound, FileText, ArrowLeft, Loader2, AlertCircle, ChevronDown, Calendar, Stethoscope, Download,
} from 'lucide-react';
import { patientApi, type Patient } from '../services/management';
import { reportsApi, type Report } from '../services/reports';
import { appointmentApi, type AppointmentWithDetails } from '../services/scheduling';

export function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const id = patientId ? parseInt(patientId, 10) : NaN;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [upcomingAppointment, setUpcomingAppointment] = useState<AppointmentWithDetails | null>(null);
  const [loadingMoreReports, setLoadingMoreReports] = useState(false);
  const [downloadingPdfReportId, setDownloadingPdfReportId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!Number.isInteger(id) || id < 1) {
      setError('Invalid patient');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const to = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    Promise.all([
      patientApi.get(id).then(p => p),
      reportsApi.list(id, { skip: 0, limit: 3 }),
      appointmentApi.calendar({ from, to, patient_id: id }).catch(() => ({ items: [] as AppointmentWithDetails[], total: 0 })),
    ])
      .then(([p, res, cal]) => {
        if (!cancelled) {
          setPatient(p);
          setReports(res.items);
          setReportsTotal(res.total);
          const next = cal.items.find(a => a.status === 'scheduled') ?? null;
          setUpcomingAppointment(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load patient or reports.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto flex justify-center py-24">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <AlertCircle size={20} />
          {error || 'Patient not found'}
        </div>
        <Link to="/dashboard/patients" className="inline-flex items-center gap-2 mt-4 text-sm text-blue-600 hover:underline">
          <ArrowLeft size={16} /> Back to Patients
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link
        to="/dashboard/patients"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={16} /> Back to Patients
      </Link>

      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {patient.first_name} {patient.last_name}
      </h1>

      <div className="space-y-6">
        {/* Basic information card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <UserRound size={20} className="text-gray-500" />
            <h2 className="font-semibold text-gray-800">Basic information</h2>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">MRN</p>
              <p className="font-medium text-gray-800">{patient.medical_record_number}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Date of birth</p>
              <p className="font-medium text-gray-800">{patient.date_of_birth}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wide">Gender</p>
              <p className="font-medium text-gray-800 capitalize">{patient.gender}</p>
            </div>
            {patient.email && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Email</p>
                <p className="font-medium text-gray-800">{patient.email}</p>
              </div>
            )}
            {patient.phone && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wide">Phone</p>
                <p className="font-medium text-gray-800">{patient.phone}</p>
              </div>
            )}
            {patient.address && (
              <div className="sm:col-span-2">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Address</p>
                <p className="font-medium text-gray-800">{patient.address}</p>
              </div>
            )}
            {patient.notes && (
              <div className="sm:col-span-2">
                <p className="text-gray-500 text-xs uppercase tracking-wide">Notes</p>
                <p className="font-medium text-gray-800">{patient.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Appointment card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Calendar size={20} className="text-gray-500" />
            <h2 className="font-semibold text-gray-800">Appointment</h2>
          </div>
          <div className="p-5">
            {upcomingAppointment ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm text-gray-700">
                  <p className="font-medium text-gray-800">
                    {new Date(upcomingAppointment.scheduled_at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                  {upcomingAppointment.doctor_display_name && (
                    <p className="text-gray-500 mt-0.5">Dr. {upcomingAppointment.doctor_display_name}</p>
                  )}
                </div>
                {patient.is_active ? (
                  <Link
                    to={`/dashboard/patients/${patient.id}/exam/${upcomingAppointment.id}`}
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
                    Start exam (inactive patient)
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No upcoming scheduled appointment</p>
            )}
          </div>
        </div>

        {/* Patient reports card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <FileText size={20} className="text-gray-500" />
            <h2 className="font-semibold text-gray-800">Patient reports</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {reports.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">No reports yet</div>
            ) : (
              reports.map(r => (
                <div
                  key={r.id}
                  className="px-5 py-4 hover:bg-gray-50 transition-colors flex flex-col gap-2"
                >
                  <Link to={`/dashboard/patients/${patient.id}/reports/${r.id}`} className="block">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500">
                        {r.diagnosis_code ? `Diagnosis: ${r.diagnosis_code}` : 'No diagnosis code'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(r.updated_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-2">{r.content}</p>
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <Link to={`/dashboard/patients/${patient.id}/reports/${r.id}`} className="text-xs text-blue-600 hover:underline">
                      View report →
                    </Link>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        setDownloadingPdfReportId(r.id);
                        try {
                          await reportsApi.downloadPdf(patient.id, r.id);
                        } finally {
                          setDownloadingPdfReportId(null);
                        }
                      }}
                      disabled={downloadingPdfReportId === r.id}
                      className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50"
                    >
                      {downloadingPdfReportId === r.id ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      Download PDF
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {reports.length > 0 && reports.length < reportsTotal && (
            <div className="px-5 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={async () => {
                  if (!patient) return;
                  setLoadingMoreReports(true);
                  try {
                    const res = await reportsApi.list(patient.id, { skip: reports.length, limit: 10 });
                    setReports(prev => [...prev, ...res.items]);
                  } finally {
                    setLoadingMoreReports(false);
                  }
                }}
                disabled={loadingMoreReports}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {loadingMoreReports ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />}
                Load more ({reports.length} of {reportsTotal})
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
