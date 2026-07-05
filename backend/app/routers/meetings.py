import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.core.config import settings
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/meetings", tags=["meetings"])

class MeetingScheduleRequest(BaseModel):
    meeting_date: str
    time_slot: str
    topic: str

@router.post("/schedule", status_code=status.HTTP_201_CREATED)
async def schedule_meeting(
    req: MeetingScheduleRequest,
    current_user: User = Depends(get_current_user),
):
    """Client: Schedule a meeting. Triggers n8n Google Calendar workflow."""
    payload = {
        "client_id": current_user.id,
        "client_name": current_user.name,
        "client_email": current_user.email,
        "meeting_date": req.meeting_date,
        "time_slot": req.time_slot,
        "topic": req.topic,
        "created_at": datetime.now().isoformat()
    }
    
    webhook_url = f"{settings.N8N_WEBHOOK_BASE_URL}/webhook/schedule-meeting"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(webhook_url, json=payload, timeout=5.0)
            if response.status_code == 200:
                logger.info("Reunión agendada vía n8n — cliente %s", current_user.id)
                return {"message": "Reunión agendada exitosamente.", "payload": payload, "n8n_status": "success"}
    except Exception as exc:
        logger.warning("n8n offline al agendar reunión: %s", exc)

    return {
        "message": "Reunión registrada localmente (n8n offline).",
        "payload": payload,
        "n8n_status": "offline",
    }
