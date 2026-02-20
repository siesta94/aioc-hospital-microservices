import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class UserRole(str, enum.Enum):
    user = "user"
    admin = "admin"


# Mirrors users table (login-service).
class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role            = Column(Enum(UserRole, name="userrole", create_type=False), nullable=False)
    is_active       = Column(Boolean, default=True)
    full_name       = Column(String, nullable=True)

    reports_created = relationship("Report", back_populates="created_by", foreign_keys="Report.created_by_id")


# Minimal ref to patients table (owned by management-service).
class Patient(Base):
    __tablename__ = "patients"

    id         = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name  = Column(String, nullable=False)

    reports = relationship("Report", back_populates="patient", foreign_keys="Report.patient_id")


class Report(Base):
    __tablename__ = "reports"

    id             = Column(Integer, primary_key=True, index=True)
    patient_id     = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    diagnosis_code     = Column(String, nullable=True)   # e.g. ICD-10 code
    content            = Column(Text, nullable=False)
    therapy            = Column(Text, nullable=True)     # suggested medications
    lab_exams          = Column(Text, nullable=True)    # suggested lab exams
    referral_specialty = Column(String, nullable=True)   # directive: refer to specialty (e.g. Cardiology)
    created_at         = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by_id  = Column(Integer, ForeignKey("users.id"), nullable=True)

    patient    = relationship("Patient", back_populates="reports", foreign_keys=[patient_id])
    created_by = relationship("User", back_populates="reports_created", foreign_keys=[created_by_id])
