import logging
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.appointment import Appointment
from app.services.n8n import post_webhook

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/meetings", tags=["meetings"])

class MeetingScheduleRequest(BaseModel):
    meeting_date: date
    time_slot: str
    topic: str

@router.post("/schedule", status_code=status.HTTP_201_CREATED)
async def schedule_meeting(
    req: MeetingScheduleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Client: Schedule a meeting. Persists in DB and triggers n8n Google Calendar workflow."""
    if req.meeting_date < datetime.now(timezone.utc).date():
        raise HTTPException(status_code=400, detail="La fecha de la reunión ya pasó")

    # Evita que el mismo horario quede reservado dos veces
    taken = await db.execute(
        select(Appointment.id).where(
            Appointment.appointment_date == req.meeting_date,
            Appointment.time_slot == req.time_slot,
            Appointment.status == "scheduled",
        )
    )
    if taken.first():
        raise HTTPException(status_code=409, detail="Ese horario ya está reservado. Elige otro.")

    # Persist the appointment in the database
    appointment = Appointment(
        client_id=current_user.id,
        title=req.topic,
        appointment_date=req.meeting_date,
        time_slot=req.time_slot,
        duration_minutes=30,
        status="scheduled",
        source="client",
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)

    payload = {
        "client_id": current_user.id,
        "client_name": current_user.name,
        "client_email": current_user.email,
        "meeting_date": req.meeting_date.isoformat(),
        "time_slot": req.time_slot,
        "topic": req.topic,
        "appointment_id": appointment.id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    ok, data, _ = await post_webhook("/webhook/schedule-meeting", payload, timeout=8.0)
    # Si el workflow devuelve el link de Meet, queda guardado en la cita
    meeting_link = data.get("meeting_link") or data.get("hangoutLink")
    if ok and meeting_link:
        appointment.meeting_link = meeting_link
        await db.commit()

    return {
        "message": "Reunión agendada exitosamente." if ok else "Reunión registrada localmente (n8n offline).",
        "payload": payload,
        "n8n_status": "success" if ok else "offline",
        "appointment_id": appointment.id,
        "meeting_link": appointment.meeting_link,
    }


@router.get("/taken-slots")
async def get_taken_slots(
    meeting_date: date,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Horarios ya reservados de un día (para deshabilitarlos en la Agenda)."""
    result = await db.execute(
        select(Appointment.time_slot).where(
            Appointment.appointment_date == meeting_date,
            Appointment.status == "scheduled",
        )
    )
    return {"taken": sorted({slot for (slot,) in result.all()})}
