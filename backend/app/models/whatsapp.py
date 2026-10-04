import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, ForeignKey, Integer, Text, Boolean
from app.models.base import Base

# Etapas del pipeline de ventas de una conversación
STAGES = ("new", "contacted", "negotiation", "proposal", "won", "lost")


class WaConversation(Base):
    """Un chat de WhatsApp con un lead o cliente. Lo alimenta n8n."""
    __tablename__ = "wa_conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone: Mapped[str] = mapped_column(String(32), unique=True, index=True)  # solo dígitos, con código de país
    contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Si es False, n8n no debe dejar que la IA responda este chat
    ai_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    stage: Mapped[str] = mapped_column(String(50), default="new", index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    assigned_to: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)  # vendedor
    client_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)    # cuenta del portal al cerrar la venta

    last_message_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    unread_count: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class WaMessage(Base):
    __tablename__ = "wa_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id: Mapped[str] = mapped_column(ForeignKey("wa_conversations.id"), index=True)

    direction: Mapped[str] = mapped_column(String(10))  # in | out
    sender: Mapped[str] = mapped_column(String(20))     # contact | ai | agent
    agent_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    text: Mapped[str] = mapped_column(Text, default="")
    media_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    media_type: Mapped[str | None] = mapped_column(String(50), nullable=True)  # image, audio, document...

    # ID del mensaje en WhatsApp: evita duplicados si n8n reintenta
    wa_message_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(20), default="received")  # received | sent | failed

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
