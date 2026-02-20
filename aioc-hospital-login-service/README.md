# AIOC Hospital Login Service

FastAPI-based authentication service for the AIOC Hospital platform.

## Setup

```bash
cd aioc-hospital-login-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database credentials and secret key

# Run
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

| Method | Path                    | Description           |
|--------|-------------------------|-----------------------|
| POST   | /api/auth/login         | User login            |
| POST   | /api/auth/admin/login   | Admin login           |
| GET    | /api/dashboard/me       | Current user info     |
| GET    | /api/admin/dashboard/me | Current admin info    |
| GET    | /health                 | Health check          |

## Default Users

> **Warning:** These are development-only credentials. Remove before production.

| Username | Password | Role  | Login URL |
|----------|----------|-------|-----------|
| user     | pass     | user  | /login    |
| admin    | admin    | admin | /admin    |

### Removing Default Users

1. Set `SEED_DEFAULT_USERS=false` in `.env` (prevents re-creation on restart)
2. Delete from database:

```sql
DELETE FROM users WHERE username IN ('user', 'admin');
```

## Environment Variables

| Variable                  | Default       | Description                              |
|---------------------------|---------------|------------------------------------------|
| DATABASE_URL              | (postgres)    | PostgreSQL connection string             |
| SECRET_KEY                | (change me)   | JWT signing key                          |
| ALGORITHM                 | HS256         | JWT algorithm                            |
| ACCESS_TOKEN_EXPIRE_MINUTES | 480         | Token lifetime in minutes (8 hours)      |
| ALLOWED_ORIGINS           | localhost:5173| Comma-separated CORS origins             |
| SEED_DEFAULT_USERS        | true          | Whether to seed default users on startup |
