from pydantic import BaseModel, EmailStr, ConfigDict, Field
from datetime import datetime
from typing import Literal, Optional

Role = Literal["admin", "seller", "client"]

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: Role = "client"
    avatar_url: Optional[str] = None
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(min_length=6)

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=6)
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[Role] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: str
    role: str
    is_active: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PasswordChange(BaseModel):
    current_password: str
    new_password: str
