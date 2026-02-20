import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey,
    Integer, String, Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class UserRole(str, enum.Enum):
    user = "user"
    admin = "admin"


class AppointmentStatus(str, enum.Enum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


# Mirrors users table (login-service).
class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    username        = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role            = Column(Enum(UserRole, name="userrole", create_type=False), nullable=False)
    is_active       = Column(Boolean, default=True)
    full_name       = Column(String, nullable=True)

    appointments_created = relationship("Appointment", back_populates="created_by", foreign_keys="Appointment.created_by_id")


class Doctor(Base):
    __tablename__ = "doctors"

    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    display_name  = Column(String, nullable=False)
    specialty     = Column(String, nullable=True)   # required on create via API
    sub_specialty = Column(String, nullable=True)
    is_active     = Column(Boolean, default=True, nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow, nullable=False)

    appointments = relationship("Appointment", back_populates="doctor")


# Minimal ref to patients table (owned by management-service) for joins.
class Patient(Base):
    __tablename__ = "patients"

    id         = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name  = Column(String, nullable=False)


class Appointment(Base):
    __tablename__ = "appointments"

    id               = Column(Integer, primary_key=True, index=True)
    patient_id       = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id        = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    scheduled_at     = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=30, nullable=False)
    status           = Column(Enum(AppointmentStatus, name="appointment_status", create_type=False), nullable=False, default=AppointmentStatus.scheduled)
    notes            = Column(Text, nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by_id    = Column(Integer, ForeignKey("users.id"), nullable=True)

    doctor      = relationship("Doctor", back_populates="appointments")
    patient     = relationship("Patient", foreign_keys=[patient_id])
    created_by  = relationship("User", back_populates="appointments_created", foreign_keys=[created_by_id])
