"""
Manual Payments — Pagos Binance (y cualquier método manual)
===========================================================
Flujo completo:
  1. Cliente sube comprobante  → POST /manual-payments/
       └─ Backend guarda en BD y dispara webhook a n8n con todos los detalles
  2. n8n recibe el webhook, muestra comprobante al admin
  3. Admin aprueba/rechaza desde n8n → PUT /manual-payments/{id}/status
       └─ Autenticación: header  X-N8N-API-Key: <clave>  (sin token JWT que expira)
       └─ También acepta JWT de admin normal para aprobar desde la web

Endpoint extra para n8n:
  GET /manual-payments/pending   → lista pagos pendientes de revisión
"""
import logging
import uuid
from pathlib import Path
from datetime import datetime, timezone, date, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.config import settings
from app.core.database import get_db
from app.models.manual_payment import ManualPayment
from app.models.invoice import Invoice
from app.models.maintenance import MaintenancePlan, MaintenancePayment
from app.schemas.manual_payment import ManualPaymentResponse, ManualPaymentStatusUpdate
from app.api.deps import get_current_user, get_current_admin_user, require_admin_or_n8n
from app.models.user import User

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path("uploads/manual_payments")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

router = APIRouter(prefix="/manual-payments", tags=["manual-payments"])


# ─── Helpers ─────────────────────────────────────────────────────────────────

async def _notify_n8n_new_payment(payment: ManualPayment, client: User) -> None:
    """Dispara el webhook de n8n cuando un cliente sube un nuevo comprobante.

    n8n recibirá todos los datos necesarios para mostrarle al admin
    el comprobante y tener el payment_id listo para aprobar/rechazar.
    """
    if not settings.N8N_WEBHOOK_BASE_URL:
        return

    proof_full_url = (
        f"{settings.BACKEND_BASE_URL}{payment.proof_url}"
        if payment.proof_url
        else None
    )

    payload = {
        "event": "manual_payment_submitted",
        "payment_id": payment.id,
        "client_id": client.id,
        "client_name": client.name,
        "client_email": client.email,
        "amount": payment.amount,
        "currency": payment.currency,
        "payment_method": payment.payment_method,
        "transaction_ref": payment.transaction_ref,
        "invoice_id": payment.invoice_id,
        "plan_id": payment.plan_id,
        "proof_url": proof_full_url,
        # URLs listas para que n8n llame directamente
        "approve_url": f"{settings.BACKEND_BASE_URL}{settings.API_V1_STR}/manual-payments/{payment.id}/status",
        "submitted_at": payment.created_at.isoformat() if payment.created_at else None,
    }

    webhook_url = f"{settings.N8N_WEBHOOK_BASE_URL}/webhook/manual-payment-submitted"
    try:
        async with httpx.AsyncClient() as client_http:
            resp = await client_http.post(webhook_url, json=payload, timeout=5.0)
            if resp.status_code == 200:
                logger.info("n8n notificado — pago %s", payment.id)
            else:
                logger.warning("n8n respondió %s para pago %s", resp.status_code, payment.id)
    except Exception as exc:
        # No bloqueamos al cliente si n8n está offline
        logger.warning("No se pudo notificar n8n (pago %s): %s", payment.id, exc)


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/", response_model=ManualPaymentResponse, status_code=status.HTTP_201_CREATED)
async def submit_manual_payment(
    amount: float = Form(...),
    currency: str = Form("USD"),
    payment_method: str = Form("binance"),
    transaction_ref: Optional[str] = Form(None),
    invoice_id: Optional[str] = Form(None),
    plan_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cliente: sube comprobante de pago manual (Binance u otro método).

    Guarda en BD y notifica automáticamente a n8n para que el admin revise.
    """
    proof_url = None
    if file:
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail=f"Tipo de archivo {ext} no permitido.")

        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Archivo demasiado grande. Máximo 10MB.")

        unique_name = f"{uuid.uuid4()}{ext}"
        file_path = UPLOAD_DIR / unique_name
        with open(file_path, "wb") as f:
            f.write(content)
        proof_url = f"/uploads/manual_payments/{unique_name}"

    manual_payment = ManualPayment(
        client_id=current_user.id,
        invoice_id=invoice_id,
        plan_id=plan_id,
        payment_method=payment_method,
        amount=amount,
        currency=currency,
        transaction_ref=transaction_ref,
        proof_url=proof_url,
        status="pending",
    )
    db.add(manual_payment)
    await db.commit()
    await db.refresh(manual_payment)

    # Notificar n8n en background (no bloquea la respuesta al cliente)
    await _notify_n8n_new_payment(manual_payment, current_user)

    return manual_payment


@router.get("/pending", response_model=List[ManualPaymentResponse])
async def get_pending_manual_payments(
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Admin / n8n: lista todos los pagos pendientes de revisión.

    Autenticación aceptada:
      - Header  X-N8N-API-Key: <clave>   (para automatización n8n)
      - Bearer JWT de admin              (para la web)
    """
    stmt = (
        select(ManualPayment)
        .where(ManualPayment.status == "pending")
        .order_by(ManualPayment.created_at.asc())
    )
    result = await db.execute(stmt)
    payments = result.scalars().all()

    # Adjuntar URL absoluta del comprobante para que n8n pueda abrirlo
    for p in payments:
        if p.proof_url and not p.proof_url.startswith("http"):
            p.proof_url = f"{settings.BACKEND_BASE_URL}{p.proof_url}"

    return payments


@router.get("/", response_model=List[ManualPaymentResponse])
async def get_all_manual_payments(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: lista todos los pagos manuales (todos los estados)."""
    stmt = select(ManualPayment).order_by(ManualPayment.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/me", response_model=List[ManualPaymentResponse])
async def get_my_manual_payments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cliente: lista mis pagos manuales enviados."""
    stmt = (
        select(ManualPayment)
        .where(ManualPayment.client_id == current_user.id)
        .order_by(ManualPayment.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/client/{client_id}", response_model=List[ManualPaymentResponse])
async def get_client_manual_payments(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Admin: lista los pagos manuales de un cliente específico."""
    stmt = (
        select(ManualPayment)
        .where(ManualPayment.client_id == client_id)
        .order_by(ManualPayment.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.put("/{payment_id}/status", response_model=ManualPaymentResponse)
async def update_manual_payment_status(
    payment_id: str,
    status_update: ManualPaymentStatusUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Admin / n8n: aprueba o rechaza un pago manual.

    Autenticación aceptada:
      - Header  X-N8N-API-Key: <clave>   (para automatización n8n — sin token que expira)
      - Bearer JWT de admin              (para aprobar desde la web)

    Body:
      {
        "status": "approved" | "rejected",
        "admin_notes": "opcional"
      }
    """
    stmt = select(ManualPayment).where(ManualPayment.id == payment_id)
    result = await db.execute(stmt)
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    if payment.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Este pago ya fue procesado (estado actual: {payment.status})"
        )

    payment.status = status_update.status
    payment.admin_notes = status_update.admin_notes
    payment.reviewed_at = datetime.now(timezone.utc)

    if status_update.status == "approved":
        now = datetime.now(timezone.utc)

        if payment.invoice_id:
            stmt_inv = select(Invoice).where(Invoice.id == payment.invoice_id)
            res_inv = await db.execute(stmt_inv)
            invoice = res_inv.scalar_one_or_none()
            if invoice:
                invoice.status = "paid"
                invoice.paid_at = now

        if payment.plan_id:
            stmt_plan = select(MaintenancePlan).where(MaintenancePlan.id == payment.plan_id)
            res_plan = await db.execute(stmt_plan)
            plan = res_plan.scalar_one_or_none()
            if plan:
                current_due = plan.next_payment_date or date.today()
                plan.next_payment_date = current_due + timedelta(
                    days=365 if plan.billing_cycle == "annual" else 30
                )
                maint_pay = MaintenancePayment(
                    plan_id=plan.id,
                    amount=payment.amount,
                    currency=payment.currency,
                    due_date=current_due,
                    paid_at=now,
                    status="paid",
                    notes=f"Pago Manual ({payment.payment_method}) aprobado — Ref: {payment.transaction_ref or 'N/A'}"
                )
                db.add(maint_pay)

    try:
        await db.commit()
        await db.refresh(payment)
    except Exception as exc:
        await db.rollback()
        logger.error("Error al actualizar pago %s: %s", payment_id, exc)
        raise HTTPException(status_code=500, detail="Error interno al procesar el pago")

    logger.info(
        "Pago %s marcado como %s por %s",
        payment_id, status_update.status, caller
    )
    return payment
