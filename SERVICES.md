# AIOC Hospital — Services & Application Deep Dive

This document explains what each service does, what data it owns, and how the frontend consumes it. Read [INFRA.md](INFRA.md) for deployment/infrastructure context.

---

## Backend Services

### 1. Login Service
**Directory:** [aioc-hospital-login-service/](aioc-hospital-login-service/)  
**Port:** 8000  
**Database:** `aioc_hospital_login_service`

**Owns:** the `users` table — the single source of truth for all platform accounts.

**Responsibilities:**
- Authenticate users and admins, issue JWT tokens (HS256, 8h expiry by default).
- Full user CRUD (admin-only): create, list, update, deactivate, permanently delete.
- On startup: optionally seeds `user/pass` (role: `user`) and `admin/admin` (role: `admin`) via `SEED_DEFAULT_USERS`.

**Data model:**
```
users
  id              INTEGER PK
  username        VARCHAR UNIQUE
  hashed_password VARCHAR (bcrypt)
  role            ENUM('user', 'admin')
  is_active       BOOLEAN
  full_name       VARCHAR nullable
```

**Key routes:**

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | public | Login as user → JWT |
| `POST` | `/api/auth/admin/login` | public | Login as admin → JWT |
| `GET` | `/api/dashboard/me` | any JWT | Return current user info |
| `GET` | `/api/users` | admin JWT | List users (search, pagination) |
| `POST` | `/api/users` | admin JWT | Create user |
| `GET` | `/api/users/{id}` | admin JWT | Get user by id |
| `PUT` | `/api/users/{id}` | admin JWT | Update profile / role / active status |
| `PUT` | `/api/users/{id}/password` | admin JWT | Reset/change password |
| `DELETE` | `/api/users/{id}` | admin JWT | Soft-deactivate (sets `is_active=false`) |
| `DELETE` | `/api/users/{id}/permanent` | admin JWT | Hard delete from DB |
| `GET` | `/health` | public | Health check |

**Security notes:**
- Password verification uses constant-time comparison to prevent timing attacks (even for non-existent usernames).
- Admins cannot deactivate or delete themselves.

**Migrations:** Alembic ([aioc-hospital-login-service/migrations/](aioc-hospital-login-service/migrations/))

---

### 2. Management Service
**Directory:** [aioc-hospital-management-service/](aioc-hospital-management-service/)  
**Port:** 8001  
**Database:** `aioc_hospital_management_service`

**Owns:** the `patients` table — the master record for all hospital patients.

**Responsibilities:**
- Full patient CRUD: create, search, update, soft-delete (sets `is_active=false`).
- Exposes an **internal API** (no JWT, optional `X-Internal-Key`) consumed by scheduling and reports services to resolve patient names without duplicating data.
- Does **not** store user data — user IDs are referenced as plain integers from login-service.

**Data model:**
```
patients
  id                    SERIAL PK
  medical_record_number VARCHAR UNIQUE
  first_name            VARCHAR
  last_name             VARCHAR
  date_of_birth         VARCHAR (ISO date string)
  gender                ENUM('male','female','other')
  email                 VARCHAR nullable
  phone                 VARCHAR nullable
  address               VARCHAR nullable
  notes                 TEXT nullable
  is_active             BOOLEAN default true
  created_at            TIMESTAMP
  updated_at            TIMESTAMP
  created_by_id         INTEGER nullable (user.id from login-service, no FK)
```

**Key routes:**

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/patients` | any JWT | List patients (search by name/MRN, filter by active, paginated) |
| `POST` | `/api/patients` | any JWT | Create patient (MRN must be unique) |
| `GET` | `/api/patients/{id}` | any JWT | Get patient by id |
| `PUT` | `/api/patients/{id}` | any JWT | Update patient |
| `DELETE` | `/api/patients/{id}` | any JWT | Soft-delete (is_active → false) |
| `GET` | `/internal/patients/{id}` | X-Internal-Key | Single patient lookup for other services |
| `POST` | `/internal/patients/batch` | X-Internal-Key | Bulk patient name lookup for other services |
| `GET` | `/health` | public | Health check |

**Migrations:** Alembic + idempotent `ensure_patients_schema()` on startup.

---

### 3. Scheduling Service
**Directory:** [aioc-hospital-scheduling-service/](aioc-hospital-scheduling-service/)  
**Port:** 8002  
**Database:** `aioc_hospital_scheduling_service`

**Owns:** `doctors` and `appointments` tables.

**Responsibilities:**
- Manage doctor profiles (link a `user_id` from login-service to a specialty/display name).
- Book, list, update, and cancel appointments between a patient and a doctor.
- Calls management-service's internal API to resolve patient names for appointment list responses.
- Depends on management-service being healthy at startup.

**Data model:**
```
doctors
  id            SERIAL PK
  user_id       INTEGER UNIQUE (user.id from login-service, no FK)
  display_name  VARCHAR
  specialty     VARCHAR
  sub_specialty VARCHAR nullable
  is_active     BOOLEAN default true
  created_at    TIMESTAMP

appointments
  id               SERIAL PK
  patient_id       INTEGER (patient.id from management-service, no FK)
  doctor_id        INTEGER FK → doctors.id ON DELETE CASCADE
  scheduled_at     TIMESTAMP
  duration_minutes INTEGER default 30
  status           ENUM('scheduled','completed','cancelled','no_show')
  notes            TEXT nullable
  created_at       TIMESTAMP
  updated_at       TIMESTAMP
  created_by_id    INTEGER nullable (user.id, no FK)
```

**Key routes:**

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/doctors` | any JWT | List doctors (filter by active, paginated) |
| `GET` | `/api/doctors/me` | any JWT | Get doctor profile for current user (null if not a doctor) |
| `POST` | `/api/doctors` | admin JWT | Create doctor profile |
| `PUT` | `/api/doctors/{id}` | admin JWT | Update doctor |
| `DELETE` | `/api/doctors/{id}` | admin JWT | Soft-deactivate doctor |
| `GET` | `/api/appointments` | any JWT | List appointments (filter by doctor, date range, status, patient) |
| `POST` | `/api/appointments` | any JWT | Book appointment |
| `GET` | `/api/appointments/{id}` | any JWT | Get appointment |
| `PUT` | `/api/appointments/{id}` | any JWT | Update appointment |
| `DELETE` | `/api/appointments/{id}` | any JWT | Cancel / delete appointment |
| `GET` | `/health` | public | Health check |

---

### 4. Reports Service
**Directory:** [aioc-hospital-reports-service/](aioc-hospital-reports-service/)  
**Port:** 8003  
**Database:** `aioc_hospital_reports_service`

**Owns:** the `reports` table — structured exam/visit reports written by doctors per patient.

**Responsibilities:**
- Store and retrieve medical reports per patient.
- Calls management-service internal API to verify a patient exists before creating a report.
- Calls pdf-service to generate a downloadable PDF of a report.

**Data model:**
```
reports
  id                 SERIAL PK
  patient_id         INTEGER (patient.id from management-service, no FK)
  diagnosis_code     VARCHAR nullable
  content            TEXT (main report body)
  therapy            TEXT nullable
  lab_exams          TEXT nullable
  referral_specialty VARCHAR nullable
  created_at         TIMESTAMP
  updated_at         TIMESTAMP
  created_by_id      INTEGER nullable (user.id, no FK)
```

**Key routes:**

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/patients/{patient_id}/reports` | any JWT | List reports for a patient |
| `POST` | `/api/patients/{patient_id}/reports` | any JWT | Create report for a patient |
| `GET` | `/api/patients/{patient_id}/reports/{report_id}` | any JWT | Get single report |
| `PUT` | `/api/patients/{patient_id}/reports/{report_id}` | any JWT | Update report |
| `DELETE` | `/api/patients/{patient_id}/reports/{report_id}` | any JWT | Delete report |
| `GET` | `/api/patients/{patient_id}/reports/{report_id}/pdf` | any JWT | Download report as PDF (proxied from pdf-service) |
| `GET` | `/health` | public | Health check |

---

### 5. PDF Service
**Directory:** [aioc-hospital-pdf-service/](aioc-hospital-pdf-service/)  
**Port:** 8004  
**Database:** none (fully stateless)

**Responsibilities:**
- Accept a structured `GenerateReportRequest` payload and return a rendered PDF binary.
- Called **only** by the reports-service; not exposed to the browser directly.
- Hospital name/address/phone are injected via environment variables at runtime.

**Key routes:**

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/generate/report` | none (internal) | Generate PDF, returns `application/pdf` bytes |
| `GET` | `/health` | public | Health check |

---

## Frontend

**Directory:** [aioc-hospital-frontend/](aioc-hospital-frontend/)  
**Tech stack:** React 19, TypeScript, Vite 7, Tailwind CSS 4, React Router 7, Axios, Lucide React icons  
**Served on:** port 3000 (static files via `serve@14` in Docker)

### Routing

```
/login              → LoginPage (mode=user)
/admin              → LoginPage (mode=admin)
/dashboard/*        → UserDashboard  [requires user JWT]
/admin/dashboard/*  → AdminDashboard [requires admin JWT]
/                   → redirect to /login
```

Auth is checked by reading `hospital_user_token` / `hospital_admin_token` from `localStorage`. No token = redirect to login.

### Pages

| Page | Path in dashboard | Who sees it | What it does |
|---|---|---|---|
| `LoginPage` | `/login`, `/admin` | public | Two-mode login form (user / admin). |
| `UserDashboard` | `/dashboard/` | user | Stat cards (today's appointments, total patients, monthly); recent activity feed. Nested routes: Calendar, Patients, Exams. |
| `AdminDashboard` | `/admin/dashboard/` | admin | Admin home with nested routes: Admin Patients, User Management, Doctors. |
| `CalendarPage` | `/dashboard/calendar` | user | Calendar view of appointments for the logged-in doctor. |
| `PatientsPage` | `/dashboard/patients` | user | Search/list all active patients. |
| `PatientDetailPage` | `/dashboard/patients/:id` | user | Full patient record + list of their reports + appointments. |
| `ExamsPage` | `/dashboard/exams` | user | List of exam appointments assigned to this doctor. |
| `ExamReportPage` | `/dashboard/exams/:appointmentId/report` | user | Write/edit the report for a completed exam. |
| `ReportViewPage` | `/dashboard/patients/:id/reports/:reportId` | user | Read-only view of a report with PDF download. |
| `AdminPatientsPage` | `/admin/dashboard/patients` | admin | Admin view of all patients (can create/deactivate). |
| `UserManagementPage` | `/admin/dashboard/users` | admin | Create/update/deactivate system users. |
| `DoctorsPage` | `/admin/dashboard/doctors` | admin | Create/manage doctor profiles (links users to specialties). |

### Components

| Component | Purpose |
|---|---|
| `Sidebar` | Navigation sidebar, shared by User and Admin dashboards. |
| `HospitalBackground` | Decorative background graphic for the login screen. |

### Services (API clients)

| File | Talks to | Exposes |
|---|---|---|
| [src/services/auth.ts](aioc-hospital-frontend/src/services/auth.ts) | login-service (:8000) | `loginUser`, `loginAdmin`, `logoutUser`, `logoutAdmin`, `getUserToken`, `getAdminToken`, `fetchUserInfo`, user CRUD |
| [src/services/management.ts](aioc-hospital-frontend/src/services/management.ts) | management-service (:8001) | `patientApi` — list, get, create, update, delete patients |
| [src/services/scheduling.ts](aioc-hospital-frontend/src/services/scheduling.ts) | scheduling-service (:8002) | `doctorApi`, `appointmentApi` — doctors + appointments CRUD |
| [src/services/reports.ts](aioc-hospital-frontend/src/services/reports.ts) | reports-service (:8003) | `reportApi` — reports CRUD, PDF download URL |

### Build-time env vars (baked into the JS bundle)

```
VITE_API_URL             → login-service base URL
VITE_LOGIN_API_URL       → (alias for login-service, used in some service files)
VITE_MANAGEMENT_API_URL  → management-service base URL
VITE_SCHEDULING_API_URL  → scheduling-service base URL
VITE_REPORTS_API_URL     → reports-service base URL
VITE_PDF_API_URL         → pdf-service base URL (not consumed by frontend directly)
```

In **local dev** the Vite dev server proxies `/api/*` to `http://localhost:8000`, so `VITE_API_URL` can be left empty.  
In **Docker / production** all `VITE_*` URLs must be reachable by the **browser**, not by the container.

### Constants

[src/constants/specialties.ts](aioc-hospital-frontend/src/constants/specialties.ts) — static list of medical specialties used in doctor create/edit forms.

---

## Data Flow Examples

### User logs in and views their appointments (Calendar)

1. Browser `POST /api/auth/login` → login-service → JWT stored in localStorage.
2. User navigates to `/dashboard/calendar`.
3. Frontend `GET /api/appointments?doctor_id=<X>&start=...&end=...` → scheduling-service (JWT in header).
4. scheduling-service internally calls management-service `/internal/patients/batch` to resolve patient names.
5. Returns enriched appointment list to the browser.

### Admin creates a new doctor

1. Admin logs in via `/admin` → admin JWT.
2. Admin goes to Doctors page → clicks "Add Doctor".
3. Frontend `GET /api/users` (login-service) to populate user selector.
4. Admin picks a user and specialty → `POST /api/doctors` → scheduling-service (admin JWT).

### Doctor writes an exam report and downloads PDF

1. Doctor completes appointment → navigates to ExamReportPage.
2. `POST /api/patients/{id}/reports` → reports-service creates report in DB.
3. Doctor clicks "Download PDF" → frontend hits `GET /api/patients/{id}/reports/{rid}/pdf` → reports-service.
4. reports-service calls `POST /api/generate/report` on pdf-service.
5. pdf-service returns raw PDF bytes → reports-service streams them back to the browser.
