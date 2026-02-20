import logging
from fastapi import FastAPI
from fastapi.responses import Response

from app.config import settings
from app.schemas import GenerateReportRequest
from app.pdf_builder import build_report_pdf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AIOC Hospital PDF Service",
    description="Generates PDFs for reports and other documents",
    version="1.0.0",
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/api/generate/report")
def generate_report_pdf(body: GenerateReportRequest):
    """Generate a PDF for a patient report. Called by reports-service."""
    pdf_bytes = build_report_pdf(
        body,
        hospital_name=settings.HOSPITAL_NAME,
        hospital_address=settings.HOSPITAL_ADDRESS,
        hospital_phone=settings.HOSPITAL_PHONE,
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": "attachment; filename=report.pdf",
        },
    )
