# AIOC Hospital — Infrastructure Overview

This document is meant to give any agent or developer a complete picture of the infrastructure without having to read every file.

---

## Architecture at a Glance

```
Browser
  │
  └─► React Frontend (port 3000, served by `serve`)
        │
        ├─► Login Service       (port 8000)  ─ JWT issuer / user store
        ├─► Management Service  (port 8001)  ─ patient CRUD
        ├─► Scheduling Service  (port 8002)  ─ doctors + appointments
        ├─► Reports Service     (port 8003)  ─ exam reports
        └─► PDF Service         (port 8004)  ─ stateless PDF generator
                                                   ↑ called by Reports Service only
PostgreSQL 16 (single cluster, one DB per service)
```

All backend services are **FastAPI** (Python 3.12+). The frontend is **React 19 + TypeScript**, built with **Vite 7**, served in production via `serve@14` (static).

---

## Docker Compose (local dev / self-hosted)

**File:** [docker-compose.yaml](docker-compose.yaml)

| Container | Image / Build | Host Port | Internal Port |
|---|---|---|---|
| `aioc-postgres` | `postgres:16-alpine` | — (no host binding) | 5432 |
| `aioc-login-service` | built from `./aioc-hospital-login-service` | 8000 | 8000 |
| `aioc-management-service` | built from `./aioc-hospital-management-service` | 8001 | 8001 |
| `aioc-scheduling-service` | built from `./aioc-hospital-scheduling-service` | 8002 | 8002 |
| `aioc-reports-service` | built from `./aioc-hospital-reports-service` | 8003 | 8003 |
| `aioc-pdf-service` | built from `./aioc-hospital-pdf-service` | 8004 | 8004 |
| `aioc-frontend` | built from `./aioc-hospital-frontend` | 3000 | 3000 |

**Network:** all containers share `aioc-hospital-network` (bridge). Services call each other by container name (e.g. `http://management-service:8001`).

**Volume:** `aioc-hospital-postgres-data` — named Docker volume, persists Postgres data.

### Start-up dependency chain

```
postgres (healthy)
  └─► login-service (healthy)
        └─► management-service (healthy)
              ├─► scheduling-service (healthy)
              │     └─► frontend (waits on: login, management, scheduling, reports)
              └─► reports-service (healthy, also waits on pdf-service)
```

Health checks use `python -c "import urllib.request; urllib.request.urlopen('http://localhost:<port>/health')"`.

---

## PostgreSQL

One **single Postgres 16 cluster**, four separate databases (one per service). The init script runs once on first start:

**File:** [postgres-init/01-create-databases.sql](postgres-init/01-create-databases.sql)

```sql
CREATE DATABASE aioc_hospital_login_service;
CREATE DATABASE aioc_hospital_management_service;
CREATE DATABASE aioc_hospital_scheduling_service;
CREATE DATABASE aioc_hospital_reports_service;
```

> `pdf-service` has **no database** — it is stateless.

Each backend service manages its own schema via SQLAlchemy + Alembic (login, management, scheduling) or via an inline `ensure_*_schema()` idempotent function on startup (scheduling, management, reports).

**Cross-service IDs:** services store foreign IDs (e.g. `patient_id`, `user_id`) as plain integers **without database-level foreign keys** across service boundaries. Integrity is enforced in application logic only.

---

## Environment Variables

**Template:** [.env.example](.env.example)  
**Active file:** [.env](.env) (gitignored)

| Variable | Default | Used by |
|---|---|---|
| `POSTGRES_USER` | `postgres` | postgres, all backend services |
| `POSTGRES_PASSWORD` | `postgres` | postgres, all backend services |
| `POSTGRES_DB` | `postgres` | postgres (default maintenance db) |
| `SECRET_KEY` | `change-this-secret-key-in-production` | login, management, scheduling, reports |
| `ALGORITHM` | `HS256` | all JWT-aware services |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` (8h) | login-service |
| `ALLOWED_ORIGINS` | `http://localhost:3000,...` | all backend services (CORS) |
| `SEED_DEFAULT_USERS` | `true` | login-service (seeds `user/pass` and `admin/admin`) |
| `BACKEND_PORT` | `8000` | docker-compose host port for login |
| `MANAGEMENT_PORT` | `8001` | docker-compose |
| `SCHEDULING_PORT` | `8002` | docker-compose |
| `REPORTS_PORT` | `8003` | docker-compose |
| `PDF_PORT` | `8004` | docker-compose |
| `FRONTEND_PORT` | `3000` | docker-compose |
| `VITE_API_URL` | `http://localhost:8000` | baked into frontend bundle at build time |
| `VITE_MANAGEMENT_API_URL` | `http://localhost:8001` | baked into frontend bundle |
| `VITE_SCHEDULING_API_URL` | `http://localhost:8002` | baked into frontend bundle |
| `VITE_REPORTS_API_URL` | `http://localhost:8003` | baked into frontend bundle |
| `HOSPITAL_NAME` | `AIOC Hospital` | pdf-service |
| `HOSPITAL_ADDRESS` | — | pdf-service |
| `HOSPITAL_PHONE` | — | pdf-service |
| `MANAGEMENT_SERVICE_URL` | `http://management-service:8001` | scheduling-service, reports-service (internal calls) |
| `PDF_SERVICE_URL` | `http://pdf-service:8004` | reports-service |

> **Important:** `VITE_*` variables are baked into the JS bundle at Docker build time, not at runtime. Changing them requires a rebuild.

---

## CI/CD — GitHub Actions

**File:** [.github/workflows/build-services.yml](.github/workflows/build-services.yml)

- Triggers on **push to `main`** only.
- Uses [dorny/paths-filter](https://github.com/dorny/paths-filter) to detect which service directories changed; only changed services are rebuilt — skipped services print "No changes … skipping."
- Builds Docker images and pushes to **GitHub Container Registry (ghcr.io)** under `ghcr.io/<owner>/<service-name>`.
- Tags pushed: `main` (branch), short SHA, and `latest` (on default branch).
- Uses **GitHub Actions cache** (`cache-from/to: type=gha`) for Docker layer caching.
- Frontend build-args for production are hardcoded in the workflow step:
  - `VITE_API_URL=https://login.aioc-services.com`
  - `VITE_MANAGEMENT_API_URL=https://management.aioc-services.com`
  - `VITE_SCHEDULING_API_URL=https://scheduling.aioc-services.com`
  - `VITE_REPORTS_API_URL=https://reports.aioc-services.com`
  - `VITE_PDF_API_URL=https://pdf.aioc-services.com`

---

## Service Dockerfiles

All backend Dockerfiles follow the same pattern: Python slim base, `pip install -r requirements.txt`, copy source, `uvicorn app.main:app`.

The frontend Dockerfile is a **two-stage build**:
1. **Stage 1 (`builder`):** `node:22-alpine` — runs `npm ci` + `vite build`. Receives `VITE_*` as build args.
2. **Stage 2 (runtime):** `node:22-alpine` — installs `serve@14` globally, copies `/app/dist`, serves on port 3000.

---

## Authentication Flow

- **JWT HS256** tokens, issued by `login-service`.
- All other services validate the JWT locally using the shared `SECRET_KEY` — there are **no calls back to login-service** for token validation at request time.
- Two roles: `user` and `admin`. Separate login endpoints: `POST /api/auth/login` (users) and `POST /api/auth/admin/login` (admins).
- Tokens stored in `localStorage` on the frontend (`hospital_user_token` / `hospital_admin_token`).

---

## Internal Service-to-Service Communication

Services that need cross-service data call each other directly via HTTP (no message queue):

| Caller | Callee | Endpoint | Purpose |
|---|---|---|---|
| scheduling-service | management-service | `GET /internal/patients/{id}` | resolve patient name for appointment list |
| scheduling-service | management-service | `POST /internal/patients/batch` | bulk patient name lookup |
| reports-service | management-service | `GET /internal/patients/{id}` | verify patient exists before creating report |
| reports-service | pdf-service | `POST /api/generate/report` | generate PDF bytes |

Internal endpoints on management-service are protected by an optional `X-Internal-Key` header (set via `INTERNAL_API_KEY` env var; unenforced if not set).

---

## Production Domains (from CI workflow)

| Service | Domain |
|---|---|
| login-service | `https://login.aioc-services.com` |
| management-service | `https://management.aioc-services.com` |
| scheduling-service | `https://scheduling.aioc-services.com` |
| reports-service | `https://reports.aioc-services.com` |
| pdf-service | `https://pdf.aioc-services.com` |

---

## Local Dev Quick Start

```bash
cp .env.example .env
# Edit .env — at minimum change SECRET_KEY for production
docker compose up --build
```

Default dev credentials (seeded automatically, disable with `SEED_DEFAULT_USERS=false`):
- User: `user` / `pass`
- Admin: `admin` / `admin`

Frontend: http://localhost:3000  
API docs (Swagger): http://localhost:8000/docs, 8001/docs, 8002/docs, 8003/docs, 8004/docs
