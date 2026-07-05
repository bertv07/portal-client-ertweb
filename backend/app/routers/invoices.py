import os
import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.database import get_db
from app.models.invoice import Invoice
from app.schemas.invoice import InvoiceCreate, InvoiceUpdate, InvoiceResponse
from app.api.deps import get_current_user, get_current_admin_user
from app.models.user import User

UPLOAD_DIR = Path("uploads/invoices")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/invoices", tags=["invoices"])


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
    admin: User = Depends(get_current_admin_user),
):
    """Admin: get all invoices."""
    stmt = select(Invoice).order_by(Invoice.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/client/{client_id}", response_model=List[InvoiceResponse])
async def get_client_invoices(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: get all invoices for a specific client."""
    stmt = select(Invoice).where(Invoice.client_id == client_id).order_by(Invoice.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    invoice_in: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: create a new invoice."""
    invoice = Invoice(**invoice_in.model_dump())
    db.add(invoice)
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
    ext = Path(file.filename).suffix
    filename = f"{invoice_id}{ext}"
    file_path = UPLOAD_DIR / filename
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    invoice.pdf_url = f"/uploads/invoices/{filename}"
    await db.commit()
    await db.refresh(invoice)
    return invoice


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

    await db.commit()
    await db.refresh(invoice)
    return invoice


@router.post("/{invoice_id}/pay", response_model=InvoiceResponse)
async def pay_invoice(
    invoice_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Client: simulate a payment on an invoice, triggering automation flow."""
    stmt = select(Invoice).where(Invoice.id == invoice_id)
    result = await db.execute(stmt)
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if invoice.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    from datetime import datetime, timezone
    invoice.status = "paid"
    invoice.paid_at = datetime.now(timezone.utc)
    
    # Simulating n8n webhook notification triggers
    # In production, this would trigger an n8n webhook like:
    # httpx.post("https://n8n.yourdomain.com/webhook/invoice-paid", json={"invoice_id": invoice.id, "amount": invoice.amount})
    
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
    await db.delete(invoice)
    await db.commit()
