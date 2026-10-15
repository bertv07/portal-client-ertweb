import logging
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.models.appointment import Appointment
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from app.api.deps import (
    get_current_user, get_current_admin_user, get_current_staff_user, require_staff_or_n8n,
)
from app.models.user import User
from app.services.notify import add_notification
from app.services.n8n import post_webhook
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/appointments", tags=["appointments"])


async def _with_client_names(db: AsyncSession, appointments) -> list[AppointmentResponse]:
    """Agrega nombre y correo del cliente a cada cita, en una sola consulta."""
    ids = {a.client_id for a in appointments if a.client_id}
    people = {}
    if ids:
        res = await db.execute(select(User.id, User.name, User.email).where(User.id.in_(ids)))
        people = {uid: (name, email) for uid, name, email in res.all()}
    out = []
    for a in appointments:
        item = AppointmentResponse.model_validate(a)
        if a.client_id in people:
            item.client_name, item.client_email = people[a.client_id]
        out.append(item)
    return out


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


# ── Staff: all appointments ──────────────────────────────────────────
@router.get("/", response_model=List[AppointmentResponse])
async def get_all_appointments(
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_staff_or_n8n),
):
    """Admin / vendedor / n8n: todas las citas (clientes y leads)."""
    stmt = select(Appointment).order_by(Appointment.appointment_date.desc(), Appointment.time_slot.desc())
    result = await db.execute(stmt)
    return await _with_client_names(db, result.scalars().all())


# ── Staff: appointments for a specific client ────────────────────────
@router.get("/client/{client_id}", response_model=List[AppointmentResponse])
async def get_client_appointments(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_staff_or_n8n),
):
    """Admin / vendedor / n8n: citas de un cliente específico."""
    stmt = (
        select(Appointment)
        .where(Appointment.client_id == client_id)
        .order_by(Appointment.appointment_date.desc(), Appointment.time_slot.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


# ── Create appointment (staff JWT or n8n API key) ────────────────────
@router.post("/", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    appt_in: AppointmentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_staff_or_n8n),
):
    """Crea una cita. Acepta JWT de admin/vendedor o X-N8N-API-Key.

    Con client_id la cita es de un cliente del portal (le aparece en su Agenda).
    Sin client_id es una cita con un lead: se identifica con contact_name / contact_phone.
    """
    if appt_in.client_id:
        client_check = await db.execute(select(User).where(User.id == appt_in.client_id))
        if not client_check.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Client not found")
    elif not (appt_in.contact_name or appt_in.contact_phone):
        raise HTTPException(status_code=400, detail="Indica un cliente o el nombre/teléfono del contacto")

    staff = getattr(request.state, "user", None)
    appointment = Appointment(
        **appt_in.model_dump(),
        source=caller,
        created_by=staff.id if staff else None,
    )
    db.add(appointment)
    if appt_in.client_id:
        add_notification(
            db, appt_in.client_id, "Nueva cita agendada",
            f"{appt_in.title} — {appt_in.appointment_date.strftime('%d/%m/%Y')} a las {appt_in.time_slot}.",
            type="update",
        )
    await db.commit()
    await db.refresh(appointment)
    logger.info("Cita creada por %s — fecha %s", caller, appt_in.appointment_date)
    return appointment


# ── Update appointment (staff) ───────────────────────────────────────
@router.put("/{appointment_id}", response_model=AppointmentResponse)
async def update_appointment(
    appointment_id: str,
    appt_in: AppointmentUpdate,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_staff_or_n8n),
):
    """Admin / vendedor / n8n: actualiza una cita (p. ej. n8n guarda el link de Meet).

    Pasar una cita de `pending` a `scheduled` la CONFIRMA: avisa al cliente y
    dispara el workflow de calendario. De `pending` a `cancelled` la rechaza."""
    stmt = select(Appointment).where(Appointment.id == appointment_id)
    result = await db.execute(stmt)
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    old_status = appointment.status
    update_data = appt_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(appointment, key, value)

    confirmed = old_status == "pending" and appointment.status == "scheduled"
    declined = old_status == "pending" and appointment.status == "cancelled"
    when = f"{appointment.appointment_date.strftime('%d/%m/%Y')} a las {appointment.time_slot}"

    if confirmed and appointment.client_id:
        add_notification(db, appointment.client_id, "Reunión confirmada", f"{appointment.title} — {when}.", type="update")
    elif declined and appointment.client_id:
        add_notification(
            db, appointment.client_id, "No pudimos confirmar tu reunión",
            f"{appointment.title} — {when}. Elige otro horario desde tu Agenda, por favor.", type="update",
        )

    await db.commit()
    await db.refresh(appointment)

    # Al confirmar se crea el evento en el calendario (workflow de n8n)
    if confirmed:
        client = await db.get(User, appointment.client_id) if appointment.client_id else None
        ok, data, _ = await post_webhook("/webhook/schedule-meeting", {
            "event": "meeting_confirmed",
            "appointment_id": appointment.id,
            "client_id": appointment.client_id,
            "client_name": client.name if client else appointment.contact_name,
            "client_email": client.email if client else None,
            "client_phone": (client.phone if client else None) or appointment.contact_phone,
            "meeting_date": appointment.appointment_date.isoformat(),
            "time_slot": appointment.time_slot,
            "duration_minutes": appointment.duration_minutes,
            "topic": appointment.title,
            "timezone": settings.APP_TIMEZONE,
        }, timeout=8.0)
        meeting_link = data.get("meeting_link") or data.get("hangoutLink")
        if ok and meeting_link and not appointment.meeting_link:
            appointment.meeting_link = meeting_link
            await db.commit()
            await db.refresh(appointment)
    return appointment


# ── Delete appointment (Admin only) ──────────────────────────────────
@router.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    appointment_id: str,
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(get_current_staff_user),
):
    """Admin: elimina cualquier cita. Vendedor: solo las que creó él."""
    stmt = select(Appointment).where(Appointment.id == appointment_id)
    result = await db.execute(stmt)
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if staff.role != "admin" and appointment.created_by != staff.id:
        raise HTTPException(status_code=403, detail="Solo puedes eliminar las citas que creaste")
    await db.delete(appointment)
    await db.commit()
