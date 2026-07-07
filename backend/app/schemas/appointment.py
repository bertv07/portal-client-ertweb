from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class AppointmentBase(BaseModel):
    title: str
    description: Optional[str] = None
    appointment_date: date
    time_slot: str
    duration_minutes: int = 30
    meeting_link: Optional[str] = None
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    client_id: str
    status: str = "scheduled"


class AppointmentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    appointment_date: Optional[date] = None
    time_slot: Optional[str] = None
    duration_minutes: Optional[int] = None
    status: Optional[str] = None
    meeting_link: Optional[str] = None
    notes: Optional[str] = None


class AppointmentResponse(AppointmentBase):
    id: str
    client_id: str
    status: str
    source: str
    created_at: datetime

    model_config = {"from_attributes": True}
