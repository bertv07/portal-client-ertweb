import os
import re
import uuid
import shutil
from datetime import datetime, timezone, timedelta
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from starlette.concurrency import run_in_threadpool
from typing import List, Optional

from app.core.config import settings
from app.core.database import get_db
from app.models.invoice import Invoice
from app.models.project import Project
from app.models.manual_payment import ManualPayment
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceResponse
from app.api.deps import get_current_user, get_current_admin_user, require_admin_or_n8n
from app.models.user import User
from app.services.pdf import render_pdf
from app.services.notify import add_notification

UPLOAD_DIR = Path("uploads/invoices")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/invoices", tags=["invoices"])


async def _next_invoice_number(db: AsyncSession) -> str:
    prefix = f"INV-{datetime.now(timezone.utc).year}-"
    existing = {n for (n,) in (await db.execute(select(Invoice.number).where(Invoice.number.like(f"{prefix}%")))).all()}
    seq = len(existing) + 1
    while f"{prefix}{seq:03d}" in existing:
        seq += 1
    return f"{prefix}{seq:03d}"


@router.get("/me", response_model=List[InvoiceResponse])
async def get_my_invoices(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Client: get their own invoices."""
    stmt = select(Invoice).where(Invoice.client_id == current_user.id).order_by(Invoice.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/", response_model=List[InvoiceResponse])
async def get_all_invoices(
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Admin / n8n: get all invoices."""
    stmt = select(Invoice).order_by(Invoice.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/client/{client_id}", response_model=List[InvoiceResponse])
async def get_client_invoices(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Admin: get all invoices for a specific client."""
    stmt = select(Invoice).where(Invoice.client_id == client_id).order_by(Invoice.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_in: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Admin / n8n: crea una factura. Si no se envía `number` se genera el siguiente."""
    client = await db.get(User, invoice_in.client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    data = invoice_in.model_dump()
    number = (data.get("number") or "").strip()
    if number:
        dup = await db.execute(select(Invoice.id).where(Invoice.number == number))
        if dup.first():
            raise HTTPException(status_code=400, detail=f"Ya existe una factura con el número {number}")
    else:
        number = await _next_invoice_number(db)
    data["number"] = number
    if data.get("status") == "paid":
        data["paid_at"] = datetime.now(timezone.utc)

    invoice = Invoice(**data)
    db.add(invoice)
    add_notification(
        db, invoice.client_id, "Nueva factura",
        f"Se emitió la factura {number} por {invoice.amount:,.2f} {invoice.currency}.",
        type="document",
    )
    await db.commit()
    await db.refresh(invoice)
    return invoice


@router.post("/{invoice_id}/upload-pdf", response_model=InvoiceResponse)
async def upload_invoice_pdf(
    invoice_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: attach a PDF file to an invoice."""
    stmt = select(Invoice).where(Invoice.id == invoice_id)
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Save file
    ext = Path(file.filename or "").suffix.lower()
    if ext != ".pdf":
        raise HTTPException(status_code=400, detail="Solo se aceptan archivos PDF")
    filename = f"{invoice_id}{ext}"
    file_path = UPLOAD_DIR / filename
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    invoice.pdf_url = f"/uploads/invoices/{filename}"
    await db.commit()
    await db.refresh(invoice)
    return invoice


@router.post("/{invoice_id}/generate-pdf")
async def generate_invoice_pdf(
    invoice_id: str,
    telefono: Optional[str] = None,
    tipo_pago: str = "Anticipo 50%",
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Genera el PDF del recibo desde la plantilla y lo asocia a la factura.

    Acepta admin JWT o X-N8N-API-Key. Query params opcionales:
      - telefono: teléfono del cliente que se muestra en el recibo
      - tipo_pago: etiqueta del concepto (default "Anticipo 50%")
    Devuelve {"pdf_url": "<URL absoluta>"} lista para enviar por WhatsApp.
    """
    stmt = select(Invoice).where(Invoice.id == invoice_id)
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    res_client = await db.execute(select(User).where(User.id == invoice.client_id))
    client = res_client.scalar_one_or_none()

    proyecto_nombre = invoice.description or "Proyecto"
    if invoice.project_id:
        res_proj = await db.execute(select(Project).where(Project.id == invoice.project_id))
        project = res_proj.scalar_one_or_none()
        if project:
            proyecto_nombre = project.name

    estados = {"pending": "PENDIENTE", "paid": "PAGADO", "overdue": "VENCIDO", "cancelled": "ANULADO"}
    hoy = datetime.now(timezone(timedelta(hours=-4)))  # hora de Venezuela (UTC-4, sin DST)

    context = {
        "numero": invoice.number,
        "fecha_emision": hoy.strftime("%d/%m/%Y"),
        "fecha_vencimiento": invoice.due_date.strftime("%d/%m/%Y") if invoice.due_date else "Contra entrega",
        "estado": estados.get(invoice.status, invoice.status.upper()),
        "cliente_nombre": client.name if client else "",
        "cliente_email": client.email if client else "",
        "cliente_telefono": telefono or "",
        "proyecto_nombre": proyecto_nombre,
        "tipo_pago": tipo_pago,
        "descripcion": invoice.description or "",
        "monto": f"{invoice.amount:,.2f}",
        "moneda": invoice.currency,
    }

    pdf_bytes = await run_in_threadpool(render_pdf, "plantilla_recibo.html", context)

    safe_number = re.sub(r"[^A-Za-z0-9._-]", "_", invoice.number)
    filename = f"{safe_number}.pdf"
    (UPLOAD_DIR / filename).write_bytes(pdf_bytes)

    invoice.pdf_url = f"/uploads/invoices/{filename}"
    await db.commit()

    return {"pdf_url": f"{settings.BACKEND_BASE_URL}/uploads/invoices/{filename}"}


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: str,
    invoice_in: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: update invoice status or details."""
    stmt = select(Invoice).where(Invoice.id == invoice_id)
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    update_data = invoice_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(invoice, key, value)
    if invoice.status == "paid" and not invoice.paid_at:
        invoice.paid_at = datetime.now(timezone.utc)
    elif invoice.status != "paid":
        invoice.paid_at = None

    await db.commit()
    await db.refresh(invoice)
    return invoice


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: delete an invoice."""
    stmt = select(Invoice).where(Invoice.id == invoice_id)
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    # Los comprobantes ligados a la factura se conservan, solo se desvinculan
    await db.execute(update(ManualPayment).where(ManualPayment.invoice_id == invoice_id).values(invoice_id=None))
    await db.delete(invoice)
    await db.commit()
