from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Doctor
from app.schemas import DoctorCreate, DoctorUpdate, DoctorResponse, DoctorListResponse
from app.auth import get_current_user, require_role, CurrentUser

router = APIRouter(prefix="/api/doctors", tags=["doctors"])
_admin = require_role("admin")


@router.get("", response_model=DoctorListResponse)
def list_doctors(
    is_active: bool | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=200),
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    q = db.query(Doctor)
    if is_active is not None:
        q = q.filter(Doctor.is_active == is_active)
    total = q.count()
    items = q.order_by(Doctor.display_name).offset(skip).limit(limit).all()
    return DoctorListResponse(items=items, total=total)


@router.get("/me", response_model=DoctorResponse | None)
def get_my_doctor_profile(
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Return the doctor profile for the current user (staff dashboard: my exams). Returns null (200) if this user has no doctor profile (e.g. admin or non-doctor)."""
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id, Doctor.is_active == True).first()
    return doctor


@router.post("", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
def create_doctor(
    body: DoctorCreate,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(_admin),
):
    if db.query(Doctor).filter(Doctor.user_id == body.user_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A doctor already exists for this user",
        )
    doctor = Doctor(**body.model_dump())
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


@router.get("/{doctor_id}", response_model=DoctorResponse)
def get_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    return doctor


@router.put("/{doctor_id}", response_model=DoctorResponse)
def update_doctor(
    doctor_id: int,
    body: DoctorUpdate,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(_admin),
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(doctor, k, v)
    db.commit()
    db.refresh(doctor)
    return doctor


@router.delete("/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(_admin),
):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    doctor.is_active = False
    db.commit()
