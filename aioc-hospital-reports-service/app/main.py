import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.database import engine, get_db
from app.routes import reports

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def ensure_reports_schema():
    """Ensure reports table exists (idempotent). Depends on users + patients tables."""
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS reports (
                id                 SERIAL PRIMARY KEY,
                patient_id         INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
                diagnosis_code     VARCHAR,
                content            TEXT NOT NULL,
                therapy            TEXT,
                lab_exams          TEXT,
                referral_specialty VARCHAR,
                created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at         TIMESTAMP NOT NULL DEFAULT NOW(),
                created_by_id      INTEGER REFERENCES users(id)
            )
        """))
        conn.execute(text("""
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'therapy') THEN
                    ALTER TABLE reports ADD COLUMN therapy TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'lab_exams') THEN
                    ALTER TABLE reports ADD COLUMN lab_exams TEXT;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reports' AND column_name = 'referral_specialty') THEN
                    ALTER TABLE reports ADD COLUMN referral_specialty VARCHAR;
                END IF;
            EXCEPTION WHEN OTHERS THEN NULL;
            END $$
        """))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_reports_patient_id ON reports (patient_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS ix_reports_updated_at ON reports (updated_at DESC)"))
        conn.commit()
    logger.info("Reports schema verified.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AIOC Hospital Reports Service…")
    ensure_reports_schema()
    yield


app = FastAPI(
    title="AIOC Hospital Reports Service",
    description="Patient reports storage for AIOC Hospital (local storage; S3/Spaces later)",
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

app.include_router(reports.router)


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
