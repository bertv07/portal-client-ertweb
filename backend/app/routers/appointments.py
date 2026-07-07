import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.models.appointment import Appointment
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from app.api.deps import get_current_user, get_current_admin_user, require_admin_or_n8n
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/appointments", tags=["appointments"])


# ── Client: my appointments ──────────────────────────────────────────
@router.get("/me", response_model=List[AppointmentResponse])
async def get_my_appointments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Client: get all their appointments."""
    stmt = (
        select(Appointment)
        .where(Appointment.client_id == current_user.id)
        .order_by(Appointment.appointment_date.desc(), Appointment.time_slot.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


# ── Admin: all appointments ──────────────────────────────────────────
@router.get("/", response_model=List[AppointmentResponse])
async def get_all_appointments(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: get all appointments across all clients."""
    stmt = select(Appointment).order_by(Appointment.appointment_date.desc(), Appointment.time_slot.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


# ── Admin: appointments for a specific client ────────────────────────
@router.get("/client/{client_id}", response_model=List[AppointmentResponse])
async def get_client_appointments(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Admin: get all appointments for a specific client."""
    stmt = (
        select(Appointment)
        .where(Appointment.client_id == client_id)
        .order_by(Appointment.appointment_date.desc(), Appointment.time_slot.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


# ── Create appointment (Admin JWT or n8n API key) ────────────────────
@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    appt_in: AppointmentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Create appointment. Accepts admin JWT or X-N8N-API-Key."""
    # Verify client exists
    from app.models.user import User as UserModel
    client_check = await db.execute(select(UserModel).where(UserModel.id == appt_in.client_id))
    if not client_check.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Client not found")

    source = "n8n" if caller == "n8n" else "admin"
    appointment = Appointment(**appt_in.model_dump(), source=source)
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    logger.info("Cita creada por %s — cliente %s, fecha %s", source, appt_in.client_id, appt_in.appointment_date)
    return appointment


# ── Update appointment (Admin only) ─────────────────────────────────
@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: str,
    appt_in: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: update an appointment."""
    stmt = select(Appointment).where(Appointment.id == appointment_id)
    result = await db.execute(stmt)
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    update_data = appt_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(appointment, key, value)

    await db.commit()
    await db.refresh(appointment)
    return appointment


# ── Delete appointment (Admin only) ──────────────────────────────────
@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    appointment_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: delete an appointment."""
    stmt = select(Appointment).where(Appointment.id == appointment_id)
    result = await db.execute(stmt)
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    await db.delete(appointment)
    await db.commit()
