from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models import Gender


# ── Patient schemas ──────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    medical_record_number: str
    first_name: str
    last_name: str
    date_of_birth: str
    gender: Gender
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    notes: str | None = None


class PatientUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    date_of_birth: str | None = None
    gender: Gender | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    notes: str | None = None
    is_active: bool | None = None


class PatientResponse(BaseModel):
    id: int
    medical_record_number: str
    first_name: str
    last_name: str
    date_of_birth: str
    gender: Gender
    email: str | None
    phone: str | None
    address: str | None
    notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    created_by_id: int | None

    model_config = {"from_attributes": True}


class PatientListResponse(BaseModel):
    items: list[PatientResponse]
    total: int
