from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from typing import List
from app.core.database import get_db
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate, NotificationResponse
from app.api.deps import get_current_user, require_admin_or_n8n
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(100)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/unread-count")
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(func.count()).select_from(Notification).where(
        Notification.user_id == current_user.id, Notification.is_read.is_(False)
    )
    return {"unread": (await db.execute(stmt)).scalar_one()}


@router.post("/read-all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    await db.commit()
    return {"unread": 0}


@router.post("/send", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def send_notification(
    notif_in: NotificationCreate,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Admin / n8n: send a notification to a specific client."""
    user_check = await db.execute(select(User.id).where(User.id == notif_in.user_id))
    if not user_check.first():
        raise HTTPException(status_code=404, detail="User not found")

    notif = Notification(
        user_id=notif_in.user_id,
        title=notif_in.title,
        subtitle=notif_in.subtitle,
        message=notif_in.message,
        type=notif_in.type,
        action_text=notif_in.action_text,
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)
    return notif
