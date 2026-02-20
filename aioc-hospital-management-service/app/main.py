import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.database import engine, get_db
from app.routes import patients, users, internal

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def ensure_patients_schema():
    """Ensure patients table and gender type exist (idempotent). Runs in addition to Alembic so the app works even if migrations didn't run."""
    with engine.connect() as conn:
        conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE gender AS ENUM ('male', 'female', 'other');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS patients (
                id                    SERIAL PRIMARY KEY,
                medical_record_number VARCHAR NOT NULL,
                first_name            VARCHAR NOT NULL,
                last_name             VARCHAR NOT NULL,
                date_of_birth         VARCHAR NOT NULL,
                gender                gender NOT NULL,
                email                 VARCHAR,
                phone                 VARCHAR,
                address               VARCHAR,
                notes                 TEXT,
                is_active             BOOLEAN NOT NULL DEFAULT TRUE,
                created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
                created_by_id         INTEGER REFERENCES users(id)
            )
        """))
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_patients_medical_record_number ON patients (medical_record_number)"
        ))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_patients_id ON patients (id)"))
        conn.commit()
    logger.info("Patients schema verified.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AIOC Hospital Management Service…")
    ensure_patients_schema()
    yield


app = FastAPI(
    title="AIOC Hospital Management Service",
    description="Patient and user management for the AIOC Hospital platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router)
app.include_router(users.router)
app.include_router(internal.router)


@app.get("/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        )
