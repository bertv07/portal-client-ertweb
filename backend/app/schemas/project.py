from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    project_type: str = "website"
    status: str = "active"
    phase: str = "Planificación"
    progress_pct: int = 0
    estimated_weeks: Optional[int] = None
    remaining_weeks: Optional[int] = None
    updates_tags: Optional[str] = None


class ProjectCreate(ProjectBase):
    client_id: str


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    project_type: Optional[str] = None
    status: Optional[str] = None
    phase: Optional[str] = None
    progress_pct: Optional[int] = None
    estimated_weeks: Optional[int] = None
    remaining_weeks: Optional[int] = None
    updates_tags: Optional[str] = None
    started_at: Optional[datetime] = None
    due_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ProjectResponse(ProjectBase):
    id: str
    client_id: str
    started_at: Optional[datetime] = None
    due_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
