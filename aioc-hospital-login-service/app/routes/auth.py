from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole
from app.schemas import LoginRequest, TokenResponse
from app.auth import constant_time_verify, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _authenticate(username: str, password: str, role: UserRole, db: Session) -> User:
    user = (
        db.query(User)
        .filter(User.username == username, User.role == role, User.is_active == True)
        .first()
    )
    # Always verify — even when user is None — so response time doesn't leak
    # whether the username exists.
    password_ok = constant_time_verify(password, user.hashed_password if user else None)
    if not user or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    return user


@router.post("/login", response_model=TokenResponse)
def user_login(body: LoginRequest, db: Session = Depends(get_db)):
    user = _authenticate(body.username, body.password, UserRole.user, db)
    token = create_access_token({"sub": user.username, "role": user.role, "id": user.id})
    return TokenResponse(
        access_token=token,
        role=user.role,
        username=user.username,
        full_name=user.full_name,
    )


@router.post("/admin/login", response_model=TokenResponse)
def admin_login(body: LoginRequest, db: Session = Depends(get_db)):
    user = _authenticate(body.username, body.password, UserRole.admin, db)
    token = create_access_token({"sub": user.username, "role": user.role, "id": user.id})
    return TokenResponse(
        access_token=token,
        role=user.role,
        username=user.username,
        full_name=user.full_name,
    )
