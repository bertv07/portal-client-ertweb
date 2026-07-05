"""
PayPal Real Payment Integration
================================
Flujo:
  1. Frontend llama POST /payments/paypal/create-order  → recibe orderID de PayPal
  2. PayPal JS SDK lanza el popup de PayPal con ese orderID
  3. Cliente aprueba el pago en el popup
  4. Frontend llama POST /payments/paypal/capture-order → captura fondos y marca factura pagada
"""
import httpx
import base64
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.models.invoice import Invoice
from app.models.maintenance import MaintenancePlan, MaintenancePayment
from app.api.deps import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/binance-info")
async def get_binance_info(
    current_user: User = Depends(get_current_user),
):
    """Cliente: obtiene los datos de la cuenta Binance para realizar el pago manual.

    El cliente transfiere el monto exacto a este ID/email y luego sube
    el comprobante en la sección de Pagos del portal.
    """
    return {
        "binance_id": settings.BINANCE_ID,
        "binance_email": settings.BINANCE_EMAIL,
        "binance_name": settings.BINANCE_NAME,
        "instructions": (
            "Envía el monto exacto de la factura a este ID de Binance Pay. "
            "Una vez realizada la transferencia, sube el comprobante en el portal "
            "y el equipo de ErtWeb lo revisará en breve."
        ),
    }

# ─── PayPal API URLs ──────────────────────────────────────────────────────────
PAYPAL_BASE = (
    "https://api-m.sandbox.paypal.com"
    if settings.PAYPAL_MODE == "sandbox"
    else "https://api-m.paypal.com"
)


async def _get_paypal_access_token() -> str:
    """Exchange Client ID + Secret for a PayPal access token."""
    credentials = f"{settings.PAYPAL_CLIENT_ID}:{settings.PAYPAL_CLIENT_SECRET}"
    encoded = base64.b64encode(credentials.encode()).decode()

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{PAYPAL_BASE}/v1/oauth2/token",
            headers={
                "Authorization": f"Basic {encoded}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data={"grant_type": "client_credentials"},
            timeout=10,
        )
    if resp.status_code != 200:
        logger.error("PayPal token error: %s", resp.text)
        raise HTTPException(status_code=502, detail="No se pudo conectar con PayPal")
    return resp.json()["access_token"]


# ─── Schemas ──────────────────────────────────────────────────────────────────

class CreateOrderRequest(BaseModel):
    invoice_id: str | None = None   # para facturas de proyecto
    plan_id: str | None = None      # para pagos de mantenimiento
    amount: float
    currency: str = "USD"
    description: str = "Pago ErtWeb"


class CaptureOrderRequest(BaseModel):
    order_id: str               # PayPal orderID devuelto por create-order
    invoice_id: str | None = None
    plan_id: str | None = None


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/paypal/create-order")
async def create_paypal_order(
    req: CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crea una orden PayPal y devuelve el orderID al frontend.

    El monto y la moneda se toman SIEMPRE del registro en la base de datos
    (nunca del request) para que el cliente no pueda pagar una factura o
    plan por menos de lo que realmente cuesta.
    """
    amount = None
    currency = req.currency
    description = req.description

    if req.invoice_id:
        stmt = select(Invoice).where(Invoice.id == req.invoice_id)
        result = await db.execute(stmt)
        invoice = result.scalar_one_or_none()
        if not invoice or invoice.client_id != current_user.id:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        if invoice.status == "paid":
            raise HTTPException(status_code=400, detail="La factura ya está pagada")
        amount = invoice.amount
        currency = invoice.currency
        description = invoice.description or description
    elif req.plan_id:
        stmt = select(MaintenancePlan).where(MaintenancePlan.id == req.plan_id)
        result = await db.execute(stmt)
        plan = result.scalar_one_or_none()
        if not plan or plan.client_id != current_user.id:
            raise HTTPException(status_code=404, detail="Plan no encontrado")
        amount = plan.price
        currency = plan.currency
        description = plan.plan_name or description
    else:
        raise HTTPException(status_code=400, detail="Se requiere invoice_id o plan_id")

    access_token = await _get_paypal_access_token()

    payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "amount": {
                    "currency_code": currency,
                    "value": f"{amount:.2f}",
                },
                "description": description,
                "custom_id": req.invoice_id or req.plan_id or current_user.id,
            }
        ],
        "application_context": {
            "brand_name": "ErtWeb Portal",
            "landing_page": "NO_PREFERENCE",
            "user_action": "PAY_NOW",
        },
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{PAYPAL_BASE}/v2/checkout/orders",
            json=payload,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )

    if resp.status_code not in (200, 201):
        logger.error("PayPal create-order error: %s", resp.text)
        raise HTTPException(status_code=502, detail="Error al crear la orden PayPal")

    data = resp.json()
    return {"order_id": data["id"], "status": data["status"]}


@router.post("/paypal/capture-order")
async def capture_paypal_order(
    req: CaptureOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Captura el pago PayPal y marca como pagado en la BD."""
    access_token = await _get_paypal_access_token()

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{PAYPAL_BASE}/v2/checkout/orders/{req.order_id}/capture",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )

    if resp.status_code not in (200, 201):
        logger.error("PayPal capture error: %s", resp.text)
        raise HTTPException(status_code=502, detail="Error al capturar el pago PayPal")

    capture_data = resp.json()
    capture_status = capture_data.get("status")

    if capture_status != "COMPLETED":
        raise HTTPException(
            status_code=400,
            detail=f"El pago PayPal no fue completado. Estado: {capture_status}"
        )

    # El custom_id quedó fijado en el servidor al crear la orden (create-order),
    # así que es la única fuente confiable de qué factura/plan se pagó realmente.
    # No confiamos en req.invoice_id/req.plan_id para decidir qué marcar como pagado.
    try:
        custom_id = capture_data["purchase_units"][0]["payments"]["captures"][0]["custom_id"]
    except (KeyError, IndexError):
        custom_id = None

    if not custom_id or custom_id not in (req.invoice_id, req.plan_id):
        raise HTTPException(
            status_code=400,
            detail="La orden capturada no corresponde a la factura o plan indicado",
        )

    now = datetime.now(timezone.utc)

    # ── Marcar factura como pagada ────────────────────────────────────────────
    if req.invoice_id:
        stmt = select(Invoice).where(Invoice.id == req.invoice_id)
        result = await db.execute(stmt)
        invoice = result.scalar_one_or_none()
        if invoice and invoice.client_id == current_user.id:
            invoice.status = "paid"
            invoice.paid_at = now
            await db.commit()
            await db.refresh(invoice)
            return {
                "success": True,
                "message": "Factura pagada exitosamente",
                "paypal_order_id": req.order_id,
                "invoice_id": invoice.id,
                "invoice_status": invoice.status,
            }

    # ── Marcar plan de mantenimiento como renovado ────────────────────────────
    if req.plan_id:
        from datetime import timedelta
        stmt = select(MaintenancePlan).where(MaintenancePlan.id == req.plan_id)
        result = await db.execute(stmt)
        plan = result.scalar_one_or_none()
        if plan and plan.client_id == current_user.id:
            from datetime import date
            current_due = plan.next_payment_date or date.today()
            plan.next_payment_date = current_due + timedelta(
                days=365 if plan.billing_cycle == "annual" else 30
            )
            payment = MaintenancePayment(
                plan_id=plan.id,
                amount=plan.price,
                currency=plan.currency,
                due_date=current_due,
                paid_at=now,
                status="paid",
                notes=f"Pago PayPal — Order: {req.order_id}",
            )
            db.add(payment)
            await db.commit()
            return {
                "success": True,
                "message": "Plan de mantenimiento renovado",
                "paypal_order_id": req.order_id,
                "next_payment_date": str(plan.next_payment_date),
            }

    raise HTTPException(status_code=400, detail="No se encontró factura o plan asociado")
