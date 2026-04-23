# AIOC Hospital Scheduling Service
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.database import get_db
from app.middleware import RequestIDMiddleware
from app.routes import doctors, appointments

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AIOC Hospital Scheduling Service…")
    yield


app = FastAPI(
    title="AIOC Hospital Scheduling Service",
    description="Doctor and appointment scheduling for the AIOC Hospital platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(RequestIDMiddleware)
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
        r = db.execute(text("SELECT current_database()"))
        db_name = r.scalar()
        return {"status": "ok", "database": db_name}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database unavailable",
        )
