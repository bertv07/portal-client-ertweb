from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


def add_notification(
    db: AsyncSession,
    user_id: str,
    title: str,
    message: str,
    type: str = "update",
    subtitle: str | None = None,
) -> None:
    """Agrega una notificación a la sesión. El commit lo hace quien llama."""
    db.add(Notification(user_id=user_id, title=title, subtitle=subtitle, message=message, type=type))
