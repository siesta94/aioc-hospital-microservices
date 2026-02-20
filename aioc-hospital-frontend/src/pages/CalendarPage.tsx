import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, User, Search, X, Loader2, Plus, AlertCircle } from 'lucide-react';
import { appointmentApi, doctorApi, type AppointmentWithDetails, type Doctor } from '../services/scheduling';
import { patientApi, MANAGEMENT_API_BASE, type Patient } from '../services/management';

type CalendarStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

interface CalendarAppointment {
  id: number;
  patient_id: number;
  time: string;
  patient: string;
  type: string;
  doctor: string;
  status: CalendarStatus;
}

type AppointmentMap = Record<string, CalendarAppointment[]>;

const STATUS_STYLES: Record<CalendarStatus, string> = {
  scheduled: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-red-100 text-red-600',
  no_show:   'bg-gray-100 text-gray-600',
};

const STATUS_DOT: Record<CalendarStatus, string> = {
  scheduled: 'bg-yellow-400',
  completed: 'bg-teal-500',
  cancelled: 'bg-red-400',
  no_show:   'bg-gray-400',
};

function buildKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function apiToCalendar(a: AppointmentWithDetails): CalendarAppointment {
  const d = new Date(a.scheduled_at);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return {
    id: a.id,
    patient_id: a.patient_id,
    time,
    patient: a.patient_name ?? 'Unknown',
    type: a.notes ?? 'Appointment',
    doctor: a.doctor_display_name ?? '—',
    status: a.status as CalendarStatus,
  };
}

function buildMapFromApi(items: AppointmentWithDetails[]): AppointmentMap {
  const map: AppointmentMap = {};
  for (const a of items) {
    const d = new Date(a.scheduled_at);
    const key = buildKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (!map[key]) map[key] = [];
    map[key].push(apiToCalendar(a));
  }
  for (const arr of Object.values(map)) arr.sort((x, y) => x.time.localeCompare(y.time));
  return map;
}

function seedAppointments(): AppointmentMap {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return {
    [buildKey(y, m, 3)]: [
      { id: 1, patient_id: 1, time: '09:00', patient: 'Maria Johnson',  type: 'General Check-up',   doctor: 'Dr. Smith',  status: 'completed' },
      { id: 2, patient_id: 1, time: '11:30', patient: 'Robert Chen',    type: 'Cardiology Consult', doctor: 'Dr. Evans',  status: 'scheduled' },
    ],
    [buildKey(y, m, 7)]: [
      { id: 3, patient_id: 1, time: '08:30', patient: 'Anna Williams',  type: 'Follow-up Visit',    doctor: 'Dr. Smith',  status: 'completed' },
    ],
    [buildKey(y, m, now.getDate())]: [
      { id: 4, patient_id: 1, time: '10:00', patient: 'David Müller',   type: 'Lab Results Review', doctor: 'Dr. Patel',  status: 'completed' },
      { id: 5, patient_id: 1, time: '13:00', patient: 'Sophie Turner', type: 'Routine Examination', doctor: 'Dr. Smith', status: 'scheduled' },
      { id: 6, patient_id: 1, time: '15:30', patient: 'James O\'Brien', type: 'Post-op Check',      doctor: 'Dr. Evans', status: 'completed' },
    ],
    [buildKey(y, m, Math.min(now.getDate() + 2, 28))]: [
      { id: 7, patient_id: 1, time: '09:30', patient: 'Lena Bauer',     type: 'Vaccination',        doctor: 'Dr. Patel', status: 'completed' },
      { id: 8, patient_id: 1, time: '14:00', patient: 'Carlos Reyes',   type: 'Cardiology Consult', doctor: 'Dr. Evans', status: 'cancelled' },
    ],
    [buildKey(y, m, Math.min(now.getDate() + 5, 28))]: [
      { id: 9, patient_id: 1, time: '10:30', patient: 'Yuki Tanaka',    type: 'Dermatology Review', doctor: 'Dr. Smith', status: 'scheduled' },
    ],
    [buildKey(y, m, 20)]: [
      { id: 10, patient_id: 1, time: '11:00', patient: 'Peter Grant',   type: 'Blood Pressure Check', doctor: 'Dr. Patel', status: 'completed' },
    ],
  };
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const ALL_STATUSES: Array<CalendarStatus | 'all'> = ['all', 'scheduled', 'completed', 'cancelled', 'no_show'];

function applyFilters(
  appts: CalendarAppointment[],
  patient: string,
  status: CalendarStatus | 'all',
): CalendarAppointment[] {
  return appts.filter(a => {
    const matchPatient = !patient || a.patient.toLowerCase().includes(patient.toLowerCase());
    const matchStatus  = status === 'all' || a.status === status;
    return matchPatient && matchStatus;
  });
}

export function CalendarPage() {
  const today = new Date();
  const [viewYear, setViewYear]       = useState(today.getFullYear());
  const [viewMonth, setViewMonth]      = useState(today.getMonth());
  const [selected, setSelected]       = useState<string>(buildKey(today.getFullYear(), today.getMonth(), today.getDate()));
  const [patientQuery, setPatientQuery] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [statusFilter, setStatusFilter]   = useState<CalendarStatus | 'all'>('all');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [appointmentMap, setAppointmentMap] = useState<AppointmentMap>(() => seedAppointments());
  const [calendarLoading, setCalendarLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const ALL_PATIENTS = useMemo(
    () => Array.from(new Set(Object.values(appointmentMap).flat().map(a => a.patient))).sort(),
    [appointmentMap],
  );

  const suggestions = patientQuery.length > 0
    ? ALL_PATIENTS.filter(p => p.toLowerCase().includes(patientQuery.toLowerCase()) && p !== patientFilter)
    : [];

  const loadCalendar = useCallback(() => {
    const from = new Date(viewYear, viewMonth, 1);
    const to = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59);
    setCalendarLoading(true);
    appointmentApi
      .calendar({ from: from.toISOString(), to: to.toISOString() })
      .then(res => setAppointmentMap(buildMapFromApi(res.items)))
      .catch(() => setAppointmentMap(seedAppointments()))
      .finally(() => setCalendarLoading(false));
  }, [viewYear, viewMonth]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [doctorsList, setDoctorsList] = useState<Doctor[]>([]);
  const [createForm, setCreateForm] = useState({ patient_id: 0, doctor_id: 0, date: '', time: '09:00', duration_minutes: 30, notes: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createModalLoading, setCreateModalLoading] = useState(false);
  const [createModalLoadError, setCreateModalLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!showCreateModal) return;
    setCreateModalLoading(true);
    setCreateModalLoadError(null);
    setCreateForm(prev => ({ ...prev, date: selected }));
    Promise.all([
      patientApi.list({ limit: 500 }).then(r => setPatientsList(r.items)).catch((err: { response?: { status: number } }) => {
        const status = err?.response?.status;
        const msg = MANAGEMENT_API_BASE
          ? (status === 401
            ? 'Session expired or invalid. Please log in again (staff login).'
            : status === 403
              ? 'You do not have permission to load patients.'
              : `Could not load patients from management service (${MANAGEMENT_API_BASE}). Is it running? Check CORS if you use 127.0.0.1.`)
          : 'VITE_MANAGEMENT_API_URL is not set. For local dev, copy .env.example to .env in the frontend folder and restart.';
        setCreateModalLoadError(msg);
        setPatientsList([]);
      }),
      doctorApi.list({ is_active: true, limit: 200 }).then(r => setDoctorsList(r.items)).catch(() => setDoctorsList([])),
    ]).finally(() => setCreateModalLoading(false));
  }, [showCreateModal, selected]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      const [year, month, day] = createForm.date.split('-').map(Number);
      const [hours, minutes] = createForm.time.split(':').map(Number);
      const scheduled_at = new Date(year, month - 1, day, hours, minutes).toISOString();
      await appointmentApi.create({
        patient_id: createForm.patient_id,
        doctor_id: createForm.doctor_id,
        scheduled_at,
        duration_minutes: createForm.duration_minutes,
        notes: createForm.notes || undefined,
      });
      setShowCreateModal(false);
      loadCalendar();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setCreateError(msg ?? 'Failed to create appointment.');
    } finally {
      setCreateLoading(false);
    }
  };

  const isFiltered = !!patientFilter || statusFilter !== 'all';

  const clearFilters = () => {
    setPatientFilter('');
    setPatientQuery('');
    setStatusFilter('all');
  };

  const selectPatient = (name: string) => {
    setPatientFilter(name);
    setPatientQuery(name);
    setShowSuggestions(false);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar grid
  const firstDay   = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const totalCells  = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells: (number | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const d = i - startOffset + 1;
    return d > 0 && d <= daysInMonth ? d : null;
  });

  const selectedAppts = applyFilters(appointmentMap[selected] ?? [], patientFilter, statusFilter);
  const selectedDate  = selected
    ? new Date(selected + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Calendar</h1>
          <p className="text-gray-500 text-sm mt-1">Schedule and appointments overview</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #1a4a7a, #0d7377)' }}
        >
          <Plus size={16} />
          New appointment
        </button>
      </div>

      {/* ── Filter bar ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-5 flex flex-wrap items-center gap-3">

        {/* Patient search */}
        <div ref={searchRef} className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={patientQuery}
            onChange={e => {
              setPatientQuery(e.target.value);
              setPatientFilter('');
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search by patient…"
            className="w-full pl-8 pr-8 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
          {patientQuery && (
            <button
              onClick={() => { setPatientQuery(''); setPatientFilter(''); setShowSuggestions(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-20 overflow-hidden">
              {suggestions.map(name => (
                <button
                  key={name}
                  onMouseDown={() => selectPatient(name)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                >
                  <User size={13} className="text-gray-400 shrink-0" />
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
                ${statusFilter === s
                  ? s === 'all'
                    ? 'bg-gray-700 text-white border-gray-700'
                    : s === 'scheduled'
                    ? 'bg-yellow-500 text-white border-yellow-500'
                    : s === 'completed'
                    ? 'bg-teal-600 text-white border-teal-600'
                    : s === 'cancelled'
                    ? 'bg-red-500 text-white border-red-500'
                    : 'bg-gray-500 text-white border-gray-500'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                }`}
            >
              {s === 'all' ? 'All statuses' : s.replace('_', '-')}
            </button>
          ))}
        </div>

        {/* Clear all */}
        {isFiltered && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors ml-auto"
          >
            <X size={13} />
            Clear filters
          </button>
        )}
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">

        {/* ── Calendar grid ── */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Month navigation */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ background: 'linear-gradient(135deg, #1a4a7a, #0d7377)' }}
          >
            <button
              onClick={prevMonth}
              disabled={calendarLoading}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors disabled:opacity-50"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-white font-semibold text-base flex items-center gap-2">
              {MONTHS[viewMonth]} {viewYear}
              {calendarLoading && <Loader2 size={14} className="animate-spin text-white/80" />}
            </h2>
            <button
              onClick={nextMonth}
              disabled={calendarLoading}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/15 transition-colors disabled:opacity-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {WEEKDAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) {
                return <div key={`e-${idx}`} className="h-20 border-b border-r border-gray-50 bg-gray-50/40" />;
              }

              const key       = buildKey(viewYear, viewMonth, day);
              const appts     = applyFilters(appointmentMap[key] ?? [], patientFilter, statusFilter);
              const isToday   = key === buildKey(today.getFullYear(), today.getMonth(), today.getDate());
              const isSelected = key === selected;
              const isWeekend = [5, 6].includes((idx) % 7);

              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`h-20 p-2 border-b border-r border-gray-100 text-left transition-colors relative
                    ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : 'hover:bg-gray-50'}
                    ${isWeekend && !isSelected ? 'bg-slate-50/60' : ''}
                  `}
                >
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium
                      ${isToday ? 'text-white' : isSelected ? 'text-blue-700' : 'text-gray-700'}
                    `}
                    style={isToday ? { background: 'linear-gradient(135deg, #1a4a7a, #0d7377)' } : {}}
                  >
                    {day}
                  </span>

                  {/* Appointment dots */}
                  {appts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {appts.slice(0, 3).map(a => (
                        <span key={a.id} className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[a.status]}`} />
                      ))}
                      {appts.length > 3 && (
                        <span className="text-[9px] text-gray-400 leading-none mt-0.5">+{appts.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-5 px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex-wrap">
            {(Object.keys(STATUS_DOT) as CalendarStatus[]).map(s => (
              <span key={s} className="flex items-center gap-1.5 text-xs text-gray-500 capitalize">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s]}`} />
                {s.replace('_', '-')}
              </span>
            ))}
          </div>
        </div>

        {/* ── Day detail panel ── */}
        <div className="w-full lg:w-80 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div
            className="px-5 py-4"
            style={{ background: 'linear-gradient(135deg, #1a4a7a, #0d7377)' }}
          >
            <p className="text-white/70 text-xs font-medium uppercase tracking-wider mb-0.5">Selected day</p>
            <p className="text-white font-semibold">{selectedDate}</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {selectedAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <p className="text-sm font-medium">No appointments</p>
                <p className="text-xs mt-1 text-gray-300">Nothing scheduled for this day</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {selectedAppts.map(a => (
                  <div key={a.id} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                        <Clock size={13} className="text-gray-400" />
                        {a.time}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_STYLES[a.status]}`}>
                        {a.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                      <User size={13} className="text-gray-400 shrink-0" />
                      <Link to={`/dashboard/patients/${a.patient_id}`} className="text-blue-600 hover:underline truncate">
                        {a.patient}
                      </Link>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{a.type}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{a.doctor}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-400 text-center">
              {selectedAppts.length} appointment{selectedAppts.length !== 1 ? 's' : ''}
              {isFiltered ? ' matching filters' : ' scheduled'}
            </p>
          </div>
        </div>

      </div>

      {/* New appointment modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 text-white" style={{ background: 'linear-gradient(135deg, #1a4a7a, #0d7377)' }}>
              <h2 className="font-semibold">New appointment</h2>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-white/70 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateAppointment} className="p-6 space-y-4">
              {createError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle size={15} />{createError}
                </div>
              )}
              {createModalLoadError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  <AlertCircle size={15} />{createModalLoadError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Patient *</label>
                <select
                  required
                  value={createForm.patient_id === 0 ? '' : String(createForm.patient_id)}
                  onChange={e => setCreateForm(f => ({ ...f, patient_id: e.target.value ? Number(e.target.value) : 0 }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
                  disabled={createModalLoading}
                >
                  <option value="">
                    {createModalLoading ? 'Loading…' : patientsList.length === 0 ? 'No patients — add one in Patients first' : 'Select patient…'}
                  </option>
                  {patientsList.map(p => (
                    <option key={p.id} value={String(p.id)}>{p.first_name} {p.last_name} (MRN: {p.medical_record_number})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Doctor *</label>
                <select
                  required
                  value={createForm.doctor_id === 0 ? '' : String(createForm.doctor_id)}
                  onChange={e => setCreateForm(f => ({ ...f, doctor_id: e.target.value ? Number(e.target.value) : 0 }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white"
                  disabled={createModalLoading}
                >
                  <option value="">
                    {createModalLoading ? 'Loading…' : doctorsList.length === 0 ? 'No doctors — add one in Admin → Doctors' : 'Select doctor…'}
                  </option>
                  {doctorsList.map(d => (
                    <option key={d.id} value={String(d.id)}>{d.display_name}{d.specialty ? ` — ${[d.specialty, d.sub_specialty].filter(Boolean).join(', ')}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.date}
                    onChange={e => setCreateForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Time *</label>
                  <input
                    type="time"
                    required
                    value={createForm.time}
                    onChange={e => setCreateForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={createForm.duration_minutes}
                  onChange={e => setCreateForm(f => ({ ...f, duration_minutes: Number(e.target.value) || 30 }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={createForm.notes}
                  onChange={e => setCreateForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none"
                  placeholder="Optional notes…"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">Cancel</button>
                <button type="submit" disabled={createLoading} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-70" style={{ background: 'linear-gradient(135deg, #1a4a7a, #0d7377)' }}>
                  {createLoading && <Loader2 size={14} className="animate-spin" />}
                  {createLoading ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
