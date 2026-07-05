import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, ForeignKey, Text
from app.models.base import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    project_id: Mapped[str | None] = mapped_column(ForeignKey("projects.id"), nullable=True)

    name: Mapped[str] = mapped_column(String(255))           # display name
    original_filename: Mapped[str] = mapped_column(String(512))  # original upload filename
    file_url: Mapped[str] = mapped_column(String(512))       # path in uploads/
    file_type: Mapped[str] = mapped_column(String(50))       # pdf, jpg, png, etc.
    file_size_bytes: Mapped[int | None] = mapped_column(nullable=True)

    # Category
    doc_type: Mapped[str] = mapped_column(String(100), default="general")
    # "required" = admin asked for it | "uploaded" = client uploaded freely
    source: Mapped[str] = mapped_column(String(50), default="uploaded")

    # Workflow status
    status: Mapped[str] = mapped_column(String(50), default="review")
    # pending (not uploaded yet) | review | approved | rejected

    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
