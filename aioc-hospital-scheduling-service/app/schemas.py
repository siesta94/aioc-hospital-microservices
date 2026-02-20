from datetime import datetime
from pydantic import BaseModel

from app.models import AppointmentStatus


# ── Doctor schemas ───────────────────────────────────────────────────────────

class DoctorCreate(BaseModel):
    user_id: int
    display_name: str
    specialty: str
    sub_specialty: str | None = None


class DoctorUpdate(BaseModel):
    display_name: str | None = None
    specialty: str | None = None
    sub_specialty: str | None = None
    is_active: bool | None = None


class DoctorResponse(BaseModel):
    id: int
    user_id: int
    display_name: str
    specialty: str | None
    sub_specialty: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class DoctorListResponse(BaseModel):
    items: list[DoctorResponse]
    total: int


# ── Appointment schemas ─────────────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    scheduled_at: datetime
    duration_minutes: int = 30
    notes: str | None = None


class AppointmentUpdate(BaseModel):
    scheduled_at: datetime | None = None
    duration_minutes: int | None = None
    status: AppointmentStatus | None = None
    notes: str | None = None


class AppointmentResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    scheduled_at: datetime
    duration_minutes: int
    status: AppointmentStatus
    notes: str | None
    created_at: datetime
    updated_at: datetime
    created_by_id: int | None

    model_config = {"from_attributes": True}


class AppointmentWithDetailsResponse(AppointmentResponse):
    doctor_display_name: str | None = None
    patient_name: str | None = None


class AppointmentListResponse(BaseModel):
    items: list[AppointmentResponse]
    total: int


class AppointmentCalendarResponse(BaseModel):
    items: list[AppointmentWithDetailsResponse]
    total: int
