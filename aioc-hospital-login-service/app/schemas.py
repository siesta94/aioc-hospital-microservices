from pydantic import BaseModel, field_validator
from app.models import UserRole


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    username: str
    full_name: str | None = None


class UserInfo(BaseModel):
    id: int
    username: str
    role: UserRole
    is_active: bool
    full_name: str | None = None

    model_config = {"from_attributes": True}


# ── User management (admin) ───────────────────────────────────────────────────

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


class UserPasswordUpdate(BaseModel):
    """Admin sets a new password for any user (e.g. reset/restart)."""
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


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
