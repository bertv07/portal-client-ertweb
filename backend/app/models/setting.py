from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Text
from app.models.base import Base


class AppSetting(Base):
    """Ajustes globales clave/valor (p. ej. interruptor general de la IA)."""
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")
