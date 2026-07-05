import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, ForeignKey, Float, Text
from app.models.base import Base


class ManualPayment(Base):
    """
    Tracks manual payments (Binance Pay, bank transfer, etc.)
    submitted by clients and pending admin verification.
    """
    __tablename__ = "manual_payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)

    # What's being paid
    invoice_id: Mapped[str | None] = mapped_column(ForeignKey("invoices.id"), nullable=True)
    plan_id: Mapped[str | None] = mapped_column(ForeignKey("maintenance_plans.id"), nullable=True)

    # Payment details submitted by client
    payment_method: Mapped[str] = mapped_column(String(50), default="binance")  # binance, bank_transfer
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    transaction_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)  # TX ID / hash
    proof_url: Mapped[str | None] = mapped_column(String(512), nullable=True)  # uploaded screenshot

    # Admin review
    status: Mapped[str] = mapped_column(String(50), default="pending")  # pending | approved | rejected
    admin_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
