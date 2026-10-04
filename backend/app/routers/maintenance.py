import json
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from typing import List

from app.core.database import get_db
from app.models.maintenance import MaintenancePlan, MaintenancePayment
from app.models.manual_payment import ManualPayment
from app.schemas.maintenance import (
    MaintenancePlanCreate, MaintenancePlanUpdate, MaintenancePlanResponse,
    MaintenancePaymentCreate, MaintenancePaymentResponse,
)
from app.api.deps import get_current_user, get_current_admin_user, require_admin_or_n8n
from app.models.user import User

router = APIRouter(prefix="/maintenance", tags=["maintenance"])


# ─── Client endpoints ────────────────────────────────────────────────────────

@router.get("/me", response_model=List[MaintenancePlanResponse])
async def get_my_maintenance_plans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Client: get their maintenance plans."""
    stmt = select(MaintenancePlan).where(MaintenancePlan.client_id == current_user.id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/me/payments", response_model=List[MaintenancePaymentResponse])
async def get_my_maintenance_payments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Client: get all their maintenance payment records."""
    # Get their plan IDs first
    stmt = select(MaintenancePlan.id).where(MaintenancePlan.client_id == current_user.id)
    result = await db.execute(stmt)
    plan_ids = [row[0] for row in result.all()]

    if not plan_ids:
        return []

    stmt = select(MaintenancePayment).where(
        MaintenancePayment.plan_id.in_(plan_ids)
    ).order_by(MaintenancePayment.due_date.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


# ─── Admin endpoints ──────────────────────────────────────────────────────────

@router.get("/", response_model=List[MaintenancePlanResponse])
async def get_all_plans(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: get all maintenance plans."""
    stmt = select(MaintenancePlan).order_by(MaintenancePlan.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/client/{client_id}", response_model=List[MaintenancePlanResponse])
async def get_client_plans(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Admin: get maintenance plans of a specific client."""
    stmt = select(MaintenancePlan).where(MaintenancePlan.client_id == client_id).order_by(MaintenancePlan.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=MaintenancePlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    plan_in: MaintenancePlanCreate,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Create a maintenance plan for a client. Accepts admin JWT or X-N8N-API-Key."""
    if not await db.get(User, plan_in.client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    plan = MaintenancePlan(**plan_in.model_dump())
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.put("/{plan_id}", response_model=MaintenancePlanResponse)
async def update_plan(
    plan_id: str,
    plan_in: MaintenancePlanUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: update a maintenance plan."""
    stmt = select(MaintenancePlan).where(MaintenancePlan.id == plan_id)
    result = await db.execute(stmt)
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    for key, value in plan_in.model_dump(exclude_unset=True).items():
        setattr(plan, key, value)

    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: delete a maintenance plan."""
    stmt = select(MaintenancePlan).where(MaintenancePlan.id == plan_id)
    result = await db.execute(stmt)
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    await db.execute(update(ManualPayment).where(ManualPayment.plan_id == plan_id).values(plan_id=None))
    await db.execute(delete(MaintenancePayment).where(MaintenancePayment.plan_id == plan_id))
    await db.delete(plan)
    await db.commit()


# ─── Payment records ──────────────────────────────────────────────────────────

@router.get("/{plan_id}/payments", response_model=List[MaintenancePaymentResponse])
async def get_plan_payments(
    plan_id: str,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Admin / n8n: historial de pagos de un plan."""
    stmt = select(MaintenancePayment).where(MaintenancePayment.plan_id == plan_id).order_by(MaintenancePayment.due_date.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/{plan_id}/payments", response_model=MaintenancePaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment_record(
    plan_id: str,
    payment_in: MaintenancePaymentCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: add a payment record to a plan."""
    if not await db.get(MaintenancePlan, plan_id):
        raise HTTPException(status_code=404, detail="Plan not found")
    payment_in.plan_id = plan_id
    payment = MaintenancePayment(**payment_in.model_dump())
    db.add(payment)
    await db.commit()
    await db.refresh(payment)
    return payment


@router.put("/payments/{payment_id}/mark-paid", response_model=MaintenancePaymentResponse)
async def mark_payment_paid(
    payment_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: mark a payment as paid."""
    from datetime import datetime, timezone
    stmt = select(MaintenancePayment).where(MaintenancePayment.id == payment_id)
    result = await db.execute(stmt)
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    payment.status = "paid"
    payment.paid_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(payment)
    return payment
