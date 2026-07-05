from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional


class InvoiceCreate(BaseModel):
    client_id: str
    project_id: Optional[str] = None
    number: str
    description: Optional[str] = None
    amount: float
    currency: str = "USD"
    status: str = "pending"
    due_date: Optional[date] = None


class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    paid_at: Optional[datetime] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    due_date: Optional[date] = None


class InvoiceResponse(BaseModel):
    id: str
    client_id: str
    project_id: Optional[str] = None
    number: str
    description: Optional[str] = None
    amount: float
    currency: str
    status: str
    due_date: Optional[date] = None
    paid_at: Optional[datetime] = None
    pdf_url: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
