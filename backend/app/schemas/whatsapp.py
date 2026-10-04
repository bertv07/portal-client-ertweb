from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime
from typing import Literal, Optional

Stage = Literal["new", "contacted", "negotiation", "proposal", "won", "lost"]


# ─── n8n → portal ────────────────────────────────────────────────────────────

class N8nMessageIn(BaseModel):
    """Mensaje de WhatsApp que n8n registra en el portal."""
    phone: str
    name: Optional[str] = None
    text: str = ""
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    # in = lo escribió el contacto · out = lo envió la IA (o un humano desde el teléfono)
    direction: Literal["in", "out"] = "in"
    sender: Optional[Literal["contact", "ai", "agent"]] = None
    wa_message_id: Optional[str] = None
    timestamp: Optional[datetime] = None


class N8nMessageResult(BaseModel):
    conversation_id: str
    message_id: str
    duplicate: bool
    # Efectivo: interruptor global Y el de la conversación. Si es false la IA no debe responder.
    ai_enabled: bool
    stage: str


class N8nAiToggle(BaseModel):
    phone: str
    ai_enabled: bool
    name: Optional[str] = None


class AiStatus(BaseModel):
    ai_enabled: bool
    global_ai_enabled: bool
    conversation_ai_enabled: bool
    conversation_id: Optional[str] = None


# ─── portal (vendedor / admin) ───────────────────────────────────────────────

class ConversationResponse(BaseModel):
    id: str
    phone: str
    contact_name: Optional[str] = None
    ai_enabled: bool
    stage: str
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    client_id: Optional[str] = None
    last_message_text: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationCreate(BaseModel):
    phone: str
    contact_name: Optional[str] = None


class ConversationUpdate(BaseModel):
    contact_name: Optional[str] = None
    ai_enabled: Optional[bool] = None
    stage: Optional[Stage] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    direction: str
    sender: str
    agent_id: Optional[str] = None
    text: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class SendMessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class ConversationAppointmentIn(BaseModel):
    title: str
    appointment_date: date
    time_slot: str  # "10:00 AM"
    duration_minutes: int = 30
    notes: Optional[str] = None


class ConvertToClientIn(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class WaSettings(BaseModel):
    ai_enabled: bool
