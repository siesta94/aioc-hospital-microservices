import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey,
    Integer, String, Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class AppointmentStatus(str, enum.Enum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class Doctor(Base):
    __tablename__ = "doctors"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, nullable=False, unique=True)  # from login service (no FK)
    display_name  = Column(String, nullable=False)
    specialty     = Column(String, nullable=True)
    sub_specialty = Column(String, nullable=True)
    is_active     = Column(Boolean, default=True, nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow, nullable=False)

    appointments = relationship("Appointment", back_populates="doctor")


class Appointment(Base):
    __tablename__ = "appointments"

    id               = Column(Integer, primary_key=True, index=True)
    patient_id       = Column(Integer, nullable=False)  # from management service (no FK)
    doctor_id        = Column(Integer, ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    scheduled_at     = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=30, nullable=False)
    status           = Column(Enum(AppointmentStatus, name="appointment_status", create_type=False), nullable=False, default=AppointmentStatus.scheduled)
    notes            = Column(Text, nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by_id    = Column(Integer, nullable=True)  # from login service (no FK)

    doctor = relationship("Doctor", back_populates="appointments")
