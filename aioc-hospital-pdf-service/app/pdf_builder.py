from io import BytesIO
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

from app.schemas import GenerateReportRequest


def _fmt(dt: datetime | None) -> str:
    if dt is None:
        return "—"
    return dt.strftime("%d/%m/%Y %H:%M")


def _make_header_footer(
    patient_name: str,
    hospital_name: str,
    hospital_address: str,
    hospital_phone: str,
):
    page_width, page_height = A4
    center_x = page_width / 2

    def _draw_header(c: canvas.Canvas, _doc):
        c.saveState()
        # Logo area: centered text at top
        c.setFont("Helvetica-Bold", 18)
        c.setFillColor(colors.HexColor("#1a4a7a"))
        c.drawCentredString(center_x, page_height - 18 * mm, "AIOC Hospital")
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.black)
        c.drawCentredString(center_x, page_height - 24 * mm, f"Patient: {patient_name}")
        c.line(20 * mm, page_height - 28 * mm, page_width - 20 * mm, page_height - 28 * mm)
        c.restoreState()

    def _draw_footer(c: canvas.Canvas, _doc):
        c.saveState()
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.grey)
        y = 16 * mm
        if hospital_name:
            c.drawCentredString(center_x, y, hospital_name)
            y -= 3 * mm
        if hospital_address:
            c.drawCentredString(center_x, y, hospital_address)
            y -= 3 * mm
        if hospital_phone:
            c.drawCentredString(center_x, y, hospital_phone)
        c.restoreState()

    def on_first_page(canv, doc):
        _draw_header(canv, doc)
        _draw_footer(canv, doc)

    def on_later_pages(canv, doc):
        _draw_header(canv, doc)
        _draw_footer(canv, doc)

    return on_first_page, on_later_pages


def build_report_pdf(
    payload: GenerateReportRequest,
    hospital_name: str = "",
    hospital_address: str = "",
    hospital_phone: str = "",
) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=32 * mm,
        bottomMargin=28 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name="ReportTitle",
        parent=styles["Heading1"],
        fontSize=16,
        alignment=TA_CENTER,
        spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        name="SectionHeading",
        parent=styles["Heading2"],
        fontSize=11,
        alignment=TA_CENTER,
        spaceBefore=10,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        name="BodyLeft",
        parent=styles["Normal"],
        fontSize=10,
        alignment=TA_LEFT,
        spaceAfter=6,
    )

    on_first, on_later = _make_header_footer(
        payload.patient_name,
        hospital_name or "AIOC Hospital",
        hospital_address,
        hospital_phone,
    )

    story = []

    story.append(Paragraph("Medical Report", title_style))
    story.append(Spacer(1, 4))

    r = payload.report

    if r.diagnosis_code:
        story.append(Paragraph("Diagnosis code", heading_style))
        story.append(Paragraph(r.diagnosis_code.replace("&", "&amp;"), body_style))

    story.append(Paragraph("Report content", heading_style))
    content_escaped = (r.content or "").replace("&", "&amp;").replace("<", "&lt;").replace("\n", "<br/>")
    story.append(Paragraph(content_escaped, body_style))

    story.append(Paragraph("Therapy", heading_style))
    therapy_text = (r.therapy or "—").replace("&", "&amp;").replace("<", "&lt;").replace("\n", "<br/>")
    story.append(Paragraph(therapy_text, body_style))

    story.append(Paragraph("Lab exams", heading_style))
    lab_text = (r.lab_exams or "—").replace("&", "&amp;").replace("<", "&lt;").replace("\n", "<br/>")
    story.append(Paragraph(lab_text, body_style))

    story.append(Paragraph("Referral", heading_style))
    ref_text = (r.referral_specialty or "—").replace("&", "&amp;")
    story.append(Paragraph(ref_text, body_style))

    story.append(Spacer(1, 12))
    story.append(
        Paragraph(f"Created: {_fmt(r.created_at)} · Updated: {_fmt(r.updated_at)}", body_style)
    )

    doc.build(story, onFirstPage=on_first, onLaterPages=on_later)
    return buf.getvalue()
