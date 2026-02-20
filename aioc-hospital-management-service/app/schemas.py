from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator
from app.models import UserRole, Gender


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


# ── User schemas ─────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole = UserRole.user
    full_name: str | None = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserUpdate(BaseModel):
    full_name: str | None = None
    is_active: bool | None = None
    role: UserRole | None = None


class UserResponse(BaseModel):
    id: int
    username: str
    role: UserRole
    is_active: bool
    full_name: str | None

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
