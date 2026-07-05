import uuid
from datetime import datetime, timezone, date
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, ForeignKey, Float, Date, Text, Boolean
from app.models.base import Base


class MaintenancePlan(Base):
    """Represents a recurring maintenance contract for a client."""
    __tablename__ = "maintenance_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)

    plan_name: Mapped[str] = mapped_column(String(255))   # "Plan Anual Premium"
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Pricing
    price: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    billing_cycle: Mapped[str] = mapped_column(String(50), default="annual")  # monthly, annual

    # Dates
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    next_payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Tasks included (JSON array stored as text: ["Software Update", "Security Audit", "Backup Review"])
    tasks_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class MaintenancePayment(Base):
    """Tracks individual payment records for a maintenance plan."""
    __tablename__ = "maintenance_payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    plan_id: Mapped[str] = mapped_column(ForeignKey("maintenance_plans.id"), index=True)

    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(10), default="USD")

    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, paid, overdue
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    payment_proof_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
