"""Internal API for other services (e.g. reports-service). Protected by X-Internal-Key when INTERNAL_API_KEY is set."""
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import Patient
from app.config import settings

router = APIRouter(prefix="/internal", tags=["internal"])


class PatientNameResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    medical_record_number: str


def _require_internal_key(x_internal_key: str | None = Header(default=None, alias="X-Internal-Key")):
    key = (settings.INTERNAL_API_KEY or "").strip()
    if key and x_internal_key != key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or missing internal key")
    return True


@router.get("/patients/{patient_id}", response_model=PatientNameResponse)
def get_patient_name(
    patient_id: int,
    db: Session = Depends(get_db),
    _: bool = Depends(_require_internal_key),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return PatientNameResponse(
        id=patient.id,
        first_name=patient.first_name,
        last_name=patient.last_name,
        medical_record_number=patient.medical_record_number,
    )
