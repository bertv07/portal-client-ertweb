import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, ForeignKey, Integer, Text, Float
from app.models.base import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)

    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    project_type: Mapped[str] = mapped_column(String(100), default="website")  # website, automation, ecommerce, etc.

    # Status & progress
    status: Mapped[str] = mapped_column(String(50), default="active")  # active, completed, paused, cancelled
    phase: Mapped[str] = mapped_column(String(100), default="Planificación")  # Planificación, Diseño, Desarrollo, QA, Entregado
    progress_pct: Mapped[int] = mapped_column(Integer, default=0)  # 0-100

    # Timeline
    estimated_weeks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    remaining_weeks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Recent updates (stored as comma-separated tags)
    updates_tags: Mapped[str | None] = mapped_column(Text, nullable=True)  # "Diseño listo,Aprobado por cliente"

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
