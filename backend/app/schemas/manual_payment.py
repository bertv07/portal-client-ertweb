from pydantic import BaseModel
from datetime import datetime
from typing import Literal, Optional

class ManualPaymentBase(BaseModel):
    payment_method: str = "binance"
    amount: float
    currency: str = "USD"
    transaction_ref: Optional[str] = None
    invoice_id: Optional[str] = None
    plan_id: Optional[str] = None

class ManualPaymentCreate(ManualPaymentBase):
    pass

class ManualPaymentResponse(ManualPaymentBase):
    id: str
    client_id: str
    proof_url: Optional[str] = None
    status: str
    admin_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ManualPaymentFromN8n(BaseModel):
    """Comprobante que el cliente envió por WhatsApp y registra el bot."""
    client_id: str
    amount: float
    currency: str = "USD"
    payment_method: str = "binance"
    transaction_ref: Optional[str] = None
    invoice_id: Optional[str] = None
    plan_id: Optional[str] = None
    notes: Optional[str] = None

class ManualPaymentStatusUpdate(BaseModel):
    status: Literal["approved", "rejected"]
    admin_notes: Optional[str] = None
