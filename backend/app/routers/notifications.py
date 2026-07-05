from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate, NotificationResponse
from app.api.deps import get_current_user, get_current_admin_user
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = current_user.id
    stmt = select(Notification).where(Notification.user_id == user_id).order_by(Notification.created_at.desc())
    result = await db.execute(stmt)
    notifications = result.scalars().all()
    
    if not notifications:
        dummy_notifs = [
            Notification(user_id=user_id, title="Hito completado:", subtitle="Diseño aprobado",
                message="El diseño del proyecto ha sido aprobado. Ahora pasamos a la fase de desarrollo.", type="milestone"),
            Notification(user_id=user_id, title="Nuevo documento recibido",
                message="Se ha subido la cotización final a los archivos del proyecto.", type="document", action_text="Ver documento"),
            Notification(user_id=user_id, title="Nuevo mensaje de soporte",
                message="Tu ejecutivo de cuenta ha respondido a tu consulta sobre los plazos.", type="support"),
            Notification(user_id=user_id, title="Actualización de estado",
                message='El proyecto ha entrado en la fase de "Diseño". Tiempo estimado actualizado a 2 semanas.', type="update"),
        ]
        db.add_all(dummy_notifs)
        await db.commit()
        result = await db.execute(stmt)
        notifications = result.scalars().all()
        
    return notifications


@router.post("/send", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def send_notification(
    notif_in: NotificationCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: send a notification to a specific client."""
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
