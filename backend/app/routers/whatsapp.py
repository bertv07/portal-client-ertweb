"""
WhatsApp — bandeja del vendedor conectada a la automatización de n8n
====================================================================
El portal NO habla con WhatsApp directamente: n8n es el puente.

  n8n → portal   (header X-N8N-API-Key)
    POST /whatsapp/n8n/messages     registra cada mensaje entrante o respuesta de la IA
    GET  /whatsapp/n8n/ai-status    ¿la IA puede responder a este número?

  portal → n8n   (webhooks, rutas configurables en .env)
    N8N_WA_SEND_PATH        el vendedor responde un chat
    N8N_WA_SCHEDULE_PATH    el vendedor agenda una cita
    N8N_WA_AI_TOGGLE_PATH   se activó/desactivó la IA (aviso, opcional)

  portal (JWT de vendedor o admin)
    /whatsapp/conversations...      bandeja, mensajes, pipeline, IA, agenda
"""
import logging
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import List, Optional

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import User
from app.models.appointment import Appointment
from app.models.setting import AppSetting
from app.models.whatsapp import WaConversation, WaMessage
from app.schemas.appointment import AppointmentResponse
from app.schemas.user import UserResponse
from app.schemas.whatsapp import (
    N8nMessageIn, N8nMessageResult, N8nAiToggle, AiStatus,
    ConversationResponse, ConversationCreate, ConversationUpdate,
    MessageResponse, SendMessageIn, ConversationAppointmentIn, ConvertToClientIn, WaSettings,
)
from app.api.deps import get_current_staff_user, require_n8n
from app.services.n8n import post_webhook

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

AI_SETTING_KEY = "wa_ai_enabled"


# ─── Helpers ─────────────────────────────────────────────────────────────────

def normalize_phone(raw: str) -> str:
    """'+58 412-1234567' o '584121234567@s.whatsapp.net' → '584121234567'."""
    digits = re.sub(r"\D", "", (raw or "").split("@")[0])
    if len(digits) < 7:
        raise HTTPException(status_code=400, detail="Número de teléfono inválido")
    return digits


async def _global_ai_enabled(db: AsyncSession) -> bool:
    row = await db.get(AppSetting, AI_SETTING_KEY)
    return row is None or row.value != "false"


async def _link_client_by_phone(db: AsyncSession, conv: WaConversation) -> None:
    """Si el número del chat es el teléfono de una cuenta de cliente (p. ej. la
    registró el bot al cerrar la venta), deja el chat vinculado a esa cuenta."""
    if conv.client_id:
        return
    res = await db.execute(select(User.id, User.phone).where(User.role == "client", User.phone.is_not(None)))
    for user_id, user_phone in res.all():
        if re.sub(r"\D", "", user_phone or "") == conv.phone:
            conv.client_id = user_id
            if conv.stage not in ("won", "lost"):
                conv.stage = "won"
            return


async def _get_conversation(db: AsyncSession, conversation_id: str) -> WaConversation:
    conv = await db.get(WaConversation, conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    return conv


def _start_datetime(appointment_date, time_slot: str) -> str | None:
    """'2026-10-05' + '10:00 AM' → '2026-10-05T10:00:00' (hora local de APP_TIMEZONE)."""
    for fmt in ("%I:%M %p", "%H:%M"):
        try:
            t = datetime.strptime(time_slot.strip().upper(), fmt).time()
            return datetime.combine(appointment_date, t).isoformat()
        except ValueError:
            continue
    return None


# ─── n8n → portal ────────────────────────────────────────────────────────────

@router.post("/n8n/messages", response_model=N8nMessageResult)
async def n8n_register_message(
    body: N8nMessageIn,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_n8n),
):
    """n8n registra un mensaje de WhatsApp (entrante, o la respuesta que envió la IA).

    Crea la conversación si el número es nuevo. La respuesta incluye `ai_enabled`:
    si es false, el workflow NO debe dejar que la IA conteste (un vendedor tomó el chat).
    """
    phone = normalize_phone(body.phone)
    res = await db.execute(select(WaConversation).where(WaConversation.phone == phone))
    conv = res.scalar_one_or_none()
    if not conv:
        conv = WaConversation(phone=phone, contact_name=body.name, unread_count=0)
        db.add(conv)
        await db.flush()
    elif body.name and not conv.contact_name:
        conv.contact_name = body.name

    await _link_client_by_phone(db, conv)
    global_ai = await _global_ai_enabled(db)

    # n8n puede reintentar el mismo mensaje: no lo duplicamos
    if body.wa_message_id:
        dup = await db.execute(
            select(WaMessage.id).where(
                WaMessage.conversation_id == conv.id,
                WaMessage.wa_message_id == body.wa_message_id,
            )
        )
        existing_id = dup.scalar_one_or_none()
        if existing_id:
            await db.commit()
            return N8nMessageResult(
                conversation_id=conv.id, message_id=existing_id, duplicate=True,
                ai_enabled=global_ai and conv.ai_enabled, stage=conv.stage,
            )

    incoming = body.direction == "in"
    sent_at = body.timestamp or datetime.now(timezone.utc)
    msg = WaMessage(
        conversation_id=conv.id,
        direction=body.direction,
        sender=body.sender or ("contact" if incoming else "ai"),
        text=body.text or "",
        media_url=body.media_url,
        media_type=body.media_type,
        wa_message_id=body.wa_message_id,
        status="received" if incoming else "sent",
        created_at=sent_at,
    )
    db.add(msg)

    conv.last_message_text = body.text or (f"[{body.media_type or 'archivo'}]" if body.media_url else "")
    conv.last_message_at = sent_at
    if incoming:
        conv.unread_count = (conv.unread_count or 0) + 1

    await db.commit()
    return N8nMessageResult(
        conversation_id=conv.id, message_id=msg.id, duplicate=False,
        ai_enabled=global_ai and conv.ai_enabled, stage=conv.stage,
    )


@router.get("/n8n/ai-status", response_model=AiStatus)
async def n8n_ai_status(
    phone: str,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_n8n),
):
    """n8n pregunta si la IA puede responder a un número antes de contestar."""
    global_ai = await _global_ai_enabled(db)
    res = await db.execute(select(WaConversation).where(WaConversation.phone == normalize_phone(phone)))
    conv = res.scalar_one_or_none()
    conv_ai = conv.ai_enabled if conv else True
    return AiStatus(
        ai_enabled=global_ai and conv_ai,
        global_ai_enabled=global_ai,
        conversation_ai_enabled=conv_ai,
        conversation_id=conv.id if conv else None,
    )


@router.put("/n8n/ai-status", response_model=AiStatus)
async def n8n_set_ai_status(
    body: N8nAiToggle,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_n8n),
):
    """n8n pausa o reactiva la IA de un número (comando del jefe, fusible anti-bucle...)
    para que el portal muestre el mismo estado que el bot. No dispara el webhook
    de aviso: el cambio ya viene de n8n."""
    phone = normalize_phone(body.phone)
    res = await db.execute(select(WaConversation).where(WaConversation.phone == phone))
    conv = res.scalar_one_or_none()
    if not conv:
        conv = WaConversation(phone=phone, contact_name=body.name, unread_count=0)
        db.add(conv)
    conv.ai_enabled = body.ai_enabled
    await db.commit()
    await db.refresh(conv)
    global_ai = await _global_ai_enabled(db)
    return AiStatus(
        ai_enabled=global_ai and conv.ai_enabled, global_ai_enabled=global_ai,
        conversation_ai_enabled=conv.ai_enabled, conversation_id=conv.id,
    )


# ─── Ajustes (interruptor general de la IA) ──────────────────────────────────

@router.get("/settings", response_model=WaSettings)
async def get_wa_settings(
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(get_current_staff_user),
):
    return WaSettings(ai_enabled=await _global_ai_enabled(db))


@router.put("/settings", response_model=WaSettings)
async def update_wa_settings(
    body: WaSettings,
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(get_current_staff_user),
):
    """Activa o desactiva la IA para TODOS los chats."""
    row = await db.get(AppSetting, AI_SETTING_KEY)
    value = "true" if body.ai_enabled else "false"
    if row:
        row.value = value
    else:
        db.add(AppSetting(key=AI_SETTING_KEY, value=value))
    await db.commit()

    # Aviso a n8n (opcional): no es bloqueante, n8n también puede consultar ai-status
    await post_webhook(settings.N8N_WA_AI_TOGGLE_PATH, {
        "scope": "global", "ai_enabled": body.ai_enabled, "changed_by": staff.email,
    }, timeout=4.0)
    return body


# ─── Conversaciones ──────────────────────────────────────────────────────────

@router.get("/conversations", response_model=List[ConversationResponse])
async def list_conversations(
    search: Optional[str] = None,
    stage: Optional[str] = None,
    limit: int = 300,
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(get_current_staff_user),
):
    stmt = select(WaConversation)
    if stage:
        stmt = stmt.where(WaConversation.stage == stage)
    if search:
        like = f"%{search.strip().lower()}%"
        stmt = stmt.where(or_(
            func.lower(func.coalesce(WaConversation.contact_name, "")).like(like),
            WaConversation.phone.like(f"%{re.sub(r'[^0-9]', '', search) or '~'}%"),
        ))
    stmt = stmt.order_by(
        func.coalesce(WaConversation.last_message_at, WaConversation.created_at).desc()
    ).limit(min(max(limit, 1), 1000))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(get_current_staff_user),
):
    """Abre un chat con un número nuevo (para escribirle primero)."""
    phone = normalize_phone(body.phone)
    res = await db.execute(select(WaConversation).where(WaConversation.phone == phone))
    conv = res.scalar_one_or_none()
    if conv:
        return conv
    conv = WaConversation(phone=phone, contact_name=body.contact_name, assigned_to=staff.id, unread_count=0)
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(get_current_staff_user),
):
    return await _get_conversation(db, conversation_id)


@router.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    body: ConversationUpdate,
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(get_current_staff_user),
):
    """Cambia nombre, etapa del pipeline, notas, vendedor asignado o la IA del chat."""
    conv = await _get_conversation(db, conversation_id)
    data = body.model_dump(exclude_unset=True)
    ai_changed = "ai_enabled" in data and data["ai_enabled"] is not None and data["ai_enabled"] != conv.ai_enabled

    if data.get("assigned_to"):
        assignee = await db.get(User, data["assigned_to"])
        if not assignee or assignee.role not in ("admin", "seller"):
            raise HTTPException(status_code=400, detail="El vendedor asignado no existe")

    for key, value in data.items():
        if key in ("ai_enabled", "stage") and value is None:
            continue
        if key in ("assigned_to", "notes", "contact_name"):
            value = value or None  # "" limpia el campo
        setattr(conv, key, value)

    await db.commit()
    await db.refresh(conv)

    if ai_changed:
        await post_webhook(settings.N8N_WA_AI_TOGGLE_PATH, {
            "scope": "conversation", "phone": conv.phone, "conversation_id": conv.id,
            "ai_enabled": conv.ai_enabled, "changed_by": staff.email,
        }, timeout=4.0)
    return conv


@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageResponse])
async def list_messages(
    conversation_id: str,
    limit: int = 300,
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(get_current_staff_user),
):
    """Mensajes del chat (los más recientes, en orden cronológico). Marca el chat como leído."""
    conv = await _get_conversation(db, conversation_id)
    stmt = (
        select(WaMessage)
        .where(WaMessage.conversation_id == conversation_id)
        .order_by(WaMessage.created_at.desc())
        .limit(min(max(limit, 1), 1000))
    )
    messages = list(reversed((await db.execute(stmt)).scalars().all()))
    if conv.unread_count:
        conv.unread_count = 0
        await db.commit()
    return messages


@router.post("/conversations/{conversation_id}/send", response_model=MessageResponse)
async def send_message(
    conversation_id: str,
    body: SendMessageIn,
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(get_current_staff_user),
):
    """El vendedor responde el chat. El envío real lo hace n8n (N8N_WA_SEND_PATH)."""
    conv = await _get_conversation(db, conversation_id)
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="El mensaje está vacío")

    msg = WaMessage(
        conversation_id=conv.id, direction="out", sender="agent",
        agent_id=staff.id, text=text, status="sent",
    )
    db.add(msg)
    await db.flush()

    ok, data, error = await post_webhook(settings.N8N_WA_SEND_PATH, {
        "event": "whatsapp_send",
        "conversation_id": conv.id,
        "message_id": msg.id,
        "phone": conv.phone,
        "contact_name": conv.contact_name,
        "text": text,
        "agent_id": staff.id,
        "agent_name": staff.name,
    })

    if ok:
        msg.wa_message_id = data.get("wa_message_id") or data.get("message_id")
        conv.last_message_text = text
        conv.last_message_at = msg.created_at
        conv.unread_count = 0
        if not conv.assigned_to:
            conv.assigned_to = staff.id
        if conv.stage == "new":
            conv.stage = "contacted"
    else:
        # Se conserva en el historial marcado como fallido para poder reintentar
        msg.status = "failed"

    await db.commit()
    await db.refresh(msg)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"No se pudo enviar el mensaje: {error}. Revisa el workflow de WhatsApp en n8n.",
        )
    return msg


@router.post("/conversations/{conversation_id}/appointment")
async def schedule_from_conversation(
    conversation_id: str,
    body: ConversationAppointmentIn,
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(get_current_staff_user),
):
    """El vendedor agenda una cita con el contacto del chat.

    Guarda la cita en el portal y dispara N8N_WA_SCHEDULE_PATH para que el
    workflow de agendamiento cree el evento en el calendario. Si n8n devuelve
    `meeting_link`, queda guardado en la cita.
    """
    conv = await _get_conversation(db, conversation_id)
    appointment = Appointment(
        client_id=conv.client_id,
        contact_name=conv.contact_name or conv.phone,
        contact_phone=conv.phone,
        conversation_id=conv.id,
        created_by=staff.id,
        title=body.title,
        appointment_date=body.appointment_date,
        time_slot=body.time_slot,
        duration_minutes=body.duration_minutes,
        notes=body.notes,
        status="scheduled",
        source=staff.role,
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)

    ok, data, error = await post_webhook(settings.N8N_WA_SCHEDULE_PATH, {
        "event": "whatsapp_schedule",
        "appointment_id": appointment.id,
        "conversation_id": conv.id,
        "phone": conv.phone,
        "contact_name": conv.contact_name,
        "title": body.title,
        "notes": body.notes,
        "appointment_date": body.appointment_date.isoformat(),
        "time_slot": body.time_slot,
        "start_datetime": _start_datetime(body.appointment_date, body.time_slot),
        "timezone": settings.APP_TIMEZONE,
        "duration_minutes": body.duration_minutes,
        "agent_name": staff.name,
        "agent_email": staff.email,
    })
    meeting_link = data.get("meeting_link") or data.get("hangoutLink")
    if ok and meeting_link:
        appointment.meeting_link = meeting_link
        await db.commit()
        await db.refresh(appointment)

    return {
        "appointment": AppointmentResponse.model_validate(appointment),
        "n8n_status": "success" if ok else "offline",
        "n8n_error": error,
    }


@router.post("/conversations/{conversation_id}/convert", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def convert_to_client(
    conversation_id: str,
    body: ConvertToClientIn,
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(get_current_staff_user),
):
    """Venta cerrada: crea la cuenta de cliente del portal para este contacto
    y deja el chat vinculado y en etapa 'won'. El rol siempre es client."""
    conv = await _get_conversation(db, conversation_id)
    if conv.client_id:
        raise HTTPException(status_code=400, detail="Este contacto ya tiene una cuenta de cliente")

    email = body.email.strip().lower()
    taken = await db.execute(select(User.id).where(func.lower(User.email) == email))
    if taken.first():
        raise HTTPException(status_code=400, detail="Ya existe una cuenta con ese correo")

    user = User(
        name=body.name.strip(), email=email,
        password_hash=get_password_hash(body.password),
        role="client", phone=conv.phone,
    )
    db.add(user)
    await db.flush()
    conv.client_id = user.id
    conv.stage = "won"
    if not conv.contact_name:
        conv.contact_name = user.name
    await db.commit()
    await db.refresh(user)
    logger.info("Lead %s convertido a cliente %s por %s", conv.phone, user.id, staff.email)
    return user
