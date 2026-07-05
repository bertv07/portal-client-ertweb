from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List


class MaintenancePlanCreate(BaseModel):
    client_id: str
    plan_name: str
    description: Optional[str] = None
    price: float
    currency: str = "USD"
    billing_cycle: str = "annual"
    start_date: Optional[date] = None
    next_payment_date: Optional[date] = None
    tasks_json: Optional[str] = None  # JSON string: ["Software Update", "Security Audit"]


class MaintenancePlanUpdate(BaseModel):
    plan_name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    billing_cycle: Optional[str] = None
    next_payment_date: Optional[date] = None
    is_active: Optional[bool] = None
    tasks_json: Optional[str] = None


class MaintenancePlanResponse(BaseModel):
    id: str
    client_id: str
    plan_name: str
    description: Optional[str] = None
    price: float
    currency: str
    billing_cycle: str
    start_date: Optional[date] = None
    next_payment_date: Optional[date] = None
    is_active: bool
    tasks_json: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MaintenancePaymentCreate(BaseModel):
    plan_id: str
    amount: float
    currency: str = "USD"
    due_date: Optional[date] = None
    notes: Optional[str] = None


class MaintenancePaymentResponse(BaseModel):
    id: str
    plan_id: str
    amount: float
    currency: str
    status: str
    due_date: Optional[date] = None
    paid_at: Optional[datetime] = None
    payment_proof_url: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
