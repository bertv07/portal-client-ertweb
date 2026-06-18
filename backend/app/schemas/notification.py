from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class NotificationBase(BaseModel):
    title: str
    subtitle: Optional[str] = None
    message: str
    type: str
    action_text: Optional[str] = None

class NotificationCreate(NotificationBase):
    user_id: str

class NotificationResponse(NotificationBase):
    id: str
    is_read: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
