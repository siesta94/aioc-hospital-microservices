import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum,
    Integer, String, Text,
)
from app.database import Base


class Gender(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"


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
    created_by_id         = Column(Integer, nullable=True)  # user id from login service (no FK)
