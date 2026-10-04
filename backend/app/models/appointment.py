import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, Date, ForeignKey, Integer, Text
from app.models.base import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Cliente del portal. Null cuando la cita es con un lead de WhatsApp que
    # todavía no tiene cuenta (ver contact_name / contact_phone).
    client_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True, nullable=True)
    contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    conversation_id: Mapped[str | None] = mapped_column(ForeignKey("wa_conversations.id"), nullable=True)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    appointment_date: Mapped[datetime] = mapped_column(Date)
    time_slot: Mapped[str] = mapped_column(String(20))  # e.g. "10:00 AM"
    duration_minutes: Mapped[int] = mapped_column(Integer, default=30)

    status: Mapped[str] = mapped_column(String(50), default="scheduled")  # scheduled, completed, cancelled, no_show
    meeting_link: Mapped[str | None] = mapped_column(String(512), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Who created this appointment
    source: Mapped[str] = mapped_column(String(50), default="admin")  # client, admin, seller, n8n

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
