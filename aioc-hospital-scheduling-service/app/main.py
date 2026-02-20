import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.database import engine, get_db
from app.routes import doctors, appointments

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def ensure_scheduling_schema():
    """Ensure doctors and appointments tables exist (idempotent). Depends on users + patients tables."""
    with engine.connect() as conn:
        conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS doctors (
                id             SERIAL PRIMARY KEY,
                user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                display_name   VARCHAR NOT NULL,
                specialty      VARCHAR NOT NULL,
                sub_specialty  VARCHAR,
                is_active      BOOLEAN NOT NULL DEFAULT TRUE,
                created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
                UNIQUE(user_id)
            )
        """))
        conn.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'doctors' AND column_name = 'sub_specialty') THEN
                    ALTER TABLE doctors ADD COLUMN sub_specialty VARCHAR;
                END IF;
            EXCEPTION WHEN OTHERS THEN NULL;
            END $$
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS appointments (
                id                SERIAL PRIMARY KEY,
                patient_id        INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
                doctor_id         INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
                scheduled_at      TIMESTAMP NOT NULL,
                duration_minutes  INTEGER NOT NULL DEFAULT 30,
                status            appointment_status NOT NULL DEFAULT 'scheduled',
                notes             TEXT,
                created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
                created_by_id     INTEGER REFERENCES users(id)
            )
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_doctors_id ON doctors (id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_appointments_id ON appointments (id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_appointments_scheduled_at ON appointments (scheduled_at)"))
        conn.commit()
    logger.info("Scheduling schema verified.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AIOC Hospital Scheduling Service…")
    ensure_scheduling_schema()
    yield


app = FastAPI(
    title="AIOC Hospital Scheduling Service",
    description="Doctor and appointment scheduling for the AIOC Hospital platform",
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

app.include_router(doctors.router)
app.include_router(appointments.router)


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
