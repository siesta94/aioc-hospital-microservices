import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, ArrowLeft, Loader2, AlertCircle, Download } from 'lucide-react';
import { patientApi, type Patient } from '../services/management';
import { reportsApi, type Report } from '../services/reports';

export function ReportViewPage() {
  const { patientId, reportId } = useParams<{ patientId: string; reportId: string }>();
  const pid = patientId ? parseInt(patientId, 10) : NaN;
  const rid = reportId ? parseInt(reportId, 10) : NaN;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(pid) || pid < 1 || !Number.isInteger(rid) || rid < 1) {
      setError('Invalid patient or report');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      patientApi.get(pid).then(p => p),
      reportsApi.get(pid, rid),
    ])
      .then(([p, r]) => {
        if (!cancelled) {
          setPatient(p);
          setReport(r);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Report not found.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [pid, rid]);

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto flex justify-center py-24">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !patient || !report) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <AlertCircle size={20} />
          {error || 'Report not found'}
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
        to={`/dashboard/patients/${patient.id}`}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={16} /> Back to {patient.first_name} {patient.last_name}
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <FileText size={20} className="text-gray-500" />
            <h1 className="font-semibold text-gray-800">Report</h1>
            <span className="text-sm text-gray-500">
              — {patient.first_name} {patient.last_name} · {new Date(report.updated_at).toLocaleString()}
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              setDownloadingPdf(true);
              try {
                await reportsApi.downloadPdf(patient.id, report.id);
              } finally {
                setDownloadingPdf(false);
              }
            }}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download PDF
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Diagnosis code</h2>
          <p className="text-sm text-gray-800 font-medium">{report.diagnosis_code || '—'}</p>
        </div>

        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Report content</h2>
          <div className="text-gray-800 whitespace-pre-wrap font-normal">{report.content || '—'}</div>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Therapy</h2>
          <div className="text-gray-800 whitespace-pre-wrap text-sm">{report.therapy || '—'}</div>
        </div>

        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Lab exams</h2>
          <div className="text-gray-800 whitespace-pre-wrap text-sm">{report.lab_exams || '—'}</div>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Referral</h2>
          <p className="text-gray-800 text-sm">{report.referral_specialty ? `Refer to: ${report.referral_specialty}` : '—'}</p>
        </div>
      </div>
    </div>
  );
}
