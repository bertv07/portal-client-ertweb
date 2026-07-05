from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DocumentResponse(BaseModel):
    id: str
    client_id: str
    project_id: Optional[str] = None
    name: str
    original_filename: str
    file_url: str
    file_type: str
    file_size_bytes: Optional[int] = None
    doc_type: str
    source: str
    status: str
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentStatusUpdate(BaseModel):
    status: str  # review | approved | rejected
    admin_notes: Optional[str] = None


class DocumentRequiredCreate(BaseModel):
    """Admin creates a required document slot that client must fill."""
    client_id: str
    project_id: Optional[str] = None
    name: str
    doc_type: str = "required"
