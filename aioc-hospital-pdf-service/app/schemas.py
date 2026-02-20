from datetime import datetime
from pydantic import BaseModel


class ReportPayload(BaseModel):
    diagnosis_code: str | None = None
    content: str
    therapy: str | None = None
    lab_exams: str | None = None
    referral_specialty: str | None = None
    created_at: datetime
    updated_at: datetime


class GenerateReportRequest(BaseModel):
    patient_name: str
    report: ReportPayload
