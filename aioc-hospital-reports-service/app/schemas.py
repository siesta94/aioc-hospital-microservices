from datetime import datetime
from pydantic import BaseModel


class ReportCreate(BaseModel):
    diagnosis_code: str | None = None
    content: str
    therapy: str | None = None
    lab_exams: str | None = None
    referral_specialty: str | None = None


class ReportUpdate(BaseModel):
    diagnosis_code: str | None = None
    content: str | None = None
    therapy: str | None = None
    lab_exams: str | None = None
    referral_specialty: str | None = None


class ReportResponse(BaseModel):
    id: int
    patient_id: int
    diagnosis_code: str | None
    content: str
    therapy: str | None
    lab_exams: str | None
    referral_specialty: str | None
    created_at: datetime
    updated_at: datetime
    created_by_id: int | None

    model_config = {"from_attributes": True}


class ReportListResponse(BaseModel):
    items: list[ReportResponse]
    total: int
