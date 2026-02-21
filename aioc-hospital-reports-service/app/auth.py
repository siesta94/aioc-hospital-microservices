"""JWT-only auth: no users table in this service. Token must include id, sub, role (from login service)."""
import jwt
from jwt.exceptions import InvalidTokenError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.config import settings

bearer_scheme = HTTPBearer()


class CurrentUser(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        frozen = True


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> CurrentUser:
    payload = decode_token(credentials.credentials)
    username: str = payload.get("sub")
    user_id = payload.get("id")
    role = payload.get("role")
    if not username or user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return CurrentUser(id=int(user_id), username=username, role=role or "user")
