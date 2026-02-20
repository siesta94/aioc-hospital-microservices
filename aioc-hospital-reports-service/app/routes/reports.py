import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.database import get_db
from app.models import Report, User
from app.schemas import ReportCreate, ReportUpdate, ReportResponse, ReportListResponse
from app.auth import get_current_user

router = APIRouter(prefix="/api/patients", tags=["reports"])


@router.get("/{patient_id}/reports", response_model=ReportListResponse)
def list_reports(
    patient_id: int,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = db.query(Report).filter(Report.patient_id == patient_id)
    total = q.count()
    items = q.order_by(Report.updated_at.desc()).offset(skip).limit(limit).all()
    return ReportListResponse(items=items, total=total)


@router.post("/{patient_id}/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    patient_id: int,
    body: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    report = Report(
        patient_id=patient_id,
        diagnosis_code=body.diagnosis_code or None,
        content=body.content,
        therapy=body.therapy or None,
        lab_exams=body.lab_exams or None,
        referral_specialty=body.referral_specialty or None,
        created_by_id=current_user.id,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/{patient_id}/reports/{report_id}", response_model=ReportResponse)
def get_report(
    patient_id: int,
    report_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    report = db.query(Report).filter(Report.id == report_id, Report.patient_id == patient_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return report


@router.patch("/{patient_id}/reports/{report_id}", response_model=ReportResponse)
def update_report(
    patient_id: int,
    report_id: int,
    body: ReportUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    report = db.query(Report).filter(Report.id == report_id, Report.patient_id == patient_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(report, k, v)
    db.commit()
    db.refresh(report)
    return report


@router.delete("/{patient_id}/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    patient_id: int,
    report_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    report = db.query(Report).filter(Report.id == report_id, Report.patient_id == patient_id).first()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    db.delete(report)
    db.commit()


@router.get("/{patient_id}/reports/{report_id}/pdf")
def get_report_pdf(
    patient_id: int,
    report_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    report = (
        db.query(Report)
        .options(joinedload(Report.patient))
        .filter(Report.id == report_id, Report.patient_id == patient_id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    patient_name = (
        f"{report.patient.first_name} {report.patient.last_name}"
        if report.patient
        else f"Patient {report.patient_id}"
    )
    payload = {
        "patient_name": patient_name,
        "report": {
            "diagnosis_code": report.diagnosis_code,
            "content": report.content,
            "therapy": report.therapy,
            "lab_exams": report.lab_exams,
            "referral_specialty": report.referral_specialty,
            "created_at": report.created_at.isoformat() if report.created_at else None,
            "updated_at": report.updated_at.isoformat() if report.updated_at else None,
        },
    }
    try:
        with httpx.Client(timeout=30.0) as client:
            r = client.post(f"{settings.PDF_SERVICE_URL.rstrip('/')}/api/generate/report", json=payload)
            r.raise_for_status()
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PDF service unavailable",
        ) from e
    filename = f"report-{report_id}.pdf"
    return Response(
        content=r.content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
