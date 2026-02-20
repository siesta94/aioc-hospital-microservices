from pydantic import BaseModel
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
