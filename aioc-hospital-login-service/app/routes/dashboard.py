from fastapi import APIRouter, Depends

from app.models import User, UserRole
from app.schemas import UserInfo
from app.auth import require_role

router = APIRouter(tags=["dashboard"])


@router.get("/api/dashboard/me", response_model=UserInfo)
def user_dashboard_me(current_user: User = Depends(require_role(UserRole.user))):
    return current_user


@router.get("/api/admin/dashboard/me", response_model=UserInfo)
def admin_dashboard_me(current_user: User = Depends(require_role(UserRole.admin))):
    return current_user
