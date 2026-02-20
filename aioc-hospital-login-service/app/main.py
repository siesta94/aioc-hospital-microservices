import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.database import SessionLocal, get_db
from app.routes import auth, dashboard

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting AIOC Hospital Login Service…")

    if settings.SEED_DEFAULT_USERS:
        from app.seed import seed_default_users
        db = SessionLocal()
        try:
            seed_default_users(db)
        finally:
            db.close()
    else:
        logger.info("Default user seeding is disabled (SEED_DEFAULT_USERS=false).")

    yield


app = FastAPI(
    title="AIOC Hospital Login Service",
    description="Authentication service for AIOC Hospital platform",
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

app.include_router(auth.router)
app.include_router(dashboard.router)


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
