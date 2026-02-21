from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text
from app.database import Base


class Report(Base):
    __tablename__ = "reports"

    id                 = Column(Integer, primary_key=True, index=True)
    patient_id         = Column(Integer, nullable=False)  # from management service (no FK)
    diagnosis_code     = Column(String, nullable=True)
    content            = Column(Text, nullable=False)
    therapy            = Column(Text, nullable=True)
    lab_exams          = Column(Text, nullable=True)
    referral_specialty = Column(String, nullable=True)
    created_at         = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at         = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by_id      = Column(Integer, nullable=True)  # from login service (no FK)
