from datetime import datetime, date, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.models import Appointment, AppointmentStatus
from app.schemas import (
    AppointmentCreate, AppointmentUpdate, AppointmentResponse, AppointmentListResponse,
    AppointmentWithDetailsResponse, AppointmentCalendarResponse,
)
from app.auth import get_current_user, CurrentUser

router = APIRouter(prefix="/api/appointments", tags=["appointments"])

TODAY = date.today


def _scheduled_date(dt: datetime) -> date:
    return dt.date() if hasattr(dt, "date") and callable(dt.date) else dt


def _reject_past_scheduled_at(scheduled_at: datetime) -> None:
    """Raise 400 if scheduled_at is before today (we allow today and future only)."""
    scheduled_date = _scheduled_date(scheduled_at)
    if scheduled_date < TODAY():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appointments cannot be scheduled for past dates. Only today or future dates are allowed.",
        )


def cancel_overdue_scheduled_appointments(db: Session) -> None:
    """Mark as cancelled any scheduled appointments whose scheduled date is at least 1 day in the past."""
    cutoff = TODAY() - timedelta(days=1)
    changed = False
    for appt in db.query(Appointment).filter(Appointment.status == AppointmentStatus.scheduled).all():
        if _scheduled_date(appt.scheduled_at) <= cutoff:
            appt.status = AppointmentStatus.cancelled
            changed = True
    if changed:
        db.commit()


def _fetch_patient_data(patient_ids: list[int]) -> dict[int, dict]:
    """Call management service internal batch; return dict patient_id -> {name, is_active}."""
    if not patient_ids:
        return {}
    url = f"{settings.MANAGEMENT_SERVICE_URL.rstrip('/')}/internal/patients/batch"
    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.post(url, json={"ids": list(set(patient_ids))})
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPError:
        return {}
    return {
        p["id"]: {"name": f"{p['first_name']} {p['last_name']}", "is_active": p.get("is_active", True)}
        for p in data
    }


@router.get("", response_model=AppointmentListResponse)
def list_appointments(
    patient_id: int | None = Query(default=None),
    doctor_id: int | None = Query(default=None),
    from_date: datetime | None = Query(default=None, alias="from"),
    to_date: datetime | None = Query(default=None, alias="to"),
    status: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    cancel_overdue_scheduled_appointments(db)
    q = db.query(Appointment)
    if patient_id is not None:
        q = q.filter(Appointment.patient_id == patient_id)
    if doctor_id is not None:
        q = q.filter(Appointment.doctor_id == doctor_id)
    if from_date is not None:
        q = q.filter(Appointment.scheduled_at >= from_date)
    if to_date is not None:
        q = q.filter(Appointment.scheduled_at <= to_date)
    if status is not None:
        try:
            q = q.filter(Appointment.status == AppointmentStatus(status))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    total = q.count()
    items = q.order_by(Appointment.scheduled_at).offset(skip).limit(limit).all()
    return AppointmentListResponse(items=items, total=total)


@router.get("/recent", response_model=AppointmentCalendarResponse)
def list_appointments_recent(
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    """Recent appointments with details for dashboard activity (ordered by updated_at desc)."""
    q = (
        db.query(Appointment)
        .options(joinedload(Appointment.doctor))
        .order_by(Appointment.updated_at.desc())
    )
    items = q.limit(limit).all()
    patient_ids = [a.patient_id for a in items]
    patient_data = _fetch_patient_data(patient_ids)
    out = [
        AppointmentWithDetailsResponse(
            **AppointmentResponse.model_validate(a).model_dump(),
            doctor_display_name=a.doctor.display_name if a.doctor else None,
            patient_name=patient_data.get(a.patient_id, {}).get("name"),
            patient_is_active=patient_data.get(a.patient_id, {}).get("is_active"),
        )
        for a in items
    ]
    return AppointmentCalendarResponse(items=out, total=len(out))


@router.get("/calendar", response_model=AppointmentCalendarResponse)
def list_appointments_calendar(
    from_date: datetime = Query(..., alias="from"),
    to_date: datetime = Query(..., alias="to"),
    doctor_id: int | None = Query(default=None),
    patient_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    cancel_overdue_scheduled_appointments(db)
    q = (
        db.query(Appointment)
        .options(joinedload(Appointment.doctor))
        .filter(Appointment.scheduled_at >= from_date, Appointment.scheduled_at <= to_date)
    )
    if doctor_id is not None:
        q = q.filter(Appointment.doctor_id == doctor_id)
    if patient_id is not None:
        q = q.filter(Appointment.patient_id == patient_id)
    items = q.order_by(Appointment.scheduled_at).all()
    patient_ids = [a.patient_id for a in items]
    patient_data = _fetch_patient_data(patient_ids)
    out = [
        AppointmentWithDetailsResponse(
            **AppointmentResponse.model_validate(a).model_dump(),
            doctor_display_name=a.doctor.display_name if a.doctor else None,
            patient_name=patient_data.get(a.patient_id, {}).get("name"),
            patient_is_active=patient_data.get(a.patient_id, {}).get("is_active"),
        )
        for a in items
    ]
    return AppointmentCalendarResponse(items=out, total=len(out))


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    body: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    _reject_past_scheduled_at(body.scheduled_at)
    appointment = Appointment(**body.model_dump(), created_by_id=current_user.id)
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.get("/{appointment_id}", response_model=AppointmentResponse)
def get_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    cancel_overdue_scheduled_appointments(db)
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return appointment


@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    body: AppointmentUpdate,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    updates = body.model_dump(exclude_unset=True)
    if "scheduled_at" in updates:
        _reject_past_scheduled_at(updates["scheduled_at"])
    for k, v in updates.items():
        setattr(appointment, k, v)
    db.commit()
    db.refresh(appointment)
    return appointment


@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    _: CurrentUser = Depends(get_current_user),
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    appointment.status = AppointmentStatus.cancelled
    db.commit()
