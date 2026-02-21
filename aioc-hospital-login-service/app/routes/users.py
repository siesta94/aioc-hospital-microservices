"""User CRUD for admin. Login service owns the users table."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, UserRole
from app.schemas import UserCreate, UserUpdate, UserResponse, UserListResponse
from app.auth import require_role, get_current_user, hash_password

router = APIRouter(prefix="/api/users", tags=["users"])

_admin_only = require_role(UserRole.admin)


@router.get("", response_model=UserListResponse)
def list_users(
    search: str = Query(default=""),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(_admin_only),
):
    q = db.query(User)
    if search:
        term = f"%{search}%"
        q = q.filter(User.username.ilike(term) | User.full_name.ilike(term))
    total = q.count()
    items = q.order_by(User.username).offset(skip).limit(limit).all()
    return UserListResponse(items=items, total=total)


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    body: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(_admin_only),
):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )
    hashed = hash_password(body.password)
    user = User(
        username=body.username,
        hashed_password=hashed,
        role=body.role,
        full_name=body.full_name or None,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_admin_only),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_only),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == current_user.id and body.is_active is False:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_only),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )
    user.is_active = False
    db.commit()


@router.delete("/{user_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_permanent(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_only),
):
    """Permanently remove the user from the database. Cannot delete yourself."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account",
        )
    db.delete(user)
    db.commit()
