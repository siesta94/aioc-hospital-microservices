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


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


# Mirrors the users table owned by login-service — no migrations emitted for it.
class User(Base):
    __tablename__ = "users"

    id             = Column(Integer, primary_key=True, index=True)
    username       = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role           = Column(Enum(UserRole, name="userrole", create_type=False), nullable=False)
    is_active      = Column(Boolean, default=True)
    full_name      = Column(String, nullable=True)

    patients_created = relationship("Patient", back_populates="created_by", foreign_keys="Patient.created_by_id")


class Patient(Base):
    __tablename__ = "patients"

    id                    = Column(Integer, primary_key=True, index=True)
    medical_record_number = Column(String, unique=True, index=True, nullable=False)
    first_name            = Column(String, nullable=False)
    last_name             = Column(String, nullable=False)
    date_of_birth         = Column(String, nullable=False)  # stored as ISO date string
    gender                = Column(Enum(Gender, name="gender", create_type=False), nullable=False)
    email                 = Column(String, nullable=True)
    phone                 = Column(String, nullable=True)
    address               = Column(String, nullable=True)
    notes                 = Column(Text, nullable=True)
    is_active             = Column(Boolean, default=True, nullable=False)
    created_at            = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at            = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    created_by_id         = Column(Integer, ForeignKey("users.id"), nullable=True)

    created_by = relationship("User", back_populates="patients_created", foreign_keys=[created_by_id])
