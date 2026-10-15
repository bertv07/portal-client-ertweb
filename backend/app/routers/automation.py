"""
Automatización — interruptores del bot de n8n
=============================================
Los interruptores viven en n8n (tabla `bot_config`). El portal solo los lee y
los cambia a través del webhook N8N_BOT_CONFIG_PATH:

    GET  → { "ok": true, "flags": { "ia_global": true, ... } }
    POST { "flags": { "<clave>": true | false } }

`ia_global` es el mismo interruptor general de la bandeja de WhatsApp, así que
se mantiene sincronizado con el ajuste local del portal.
"""
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin_user
from app.core.config import settings
from app.core.database import get_db
from app.models.setting import AppSetting
from app.models.user import User
from app.routers.whatsapp import AI_SETTING_KEY
from app.services.n8n import get_webhook, post_webhook

router = APIRouter(prefix="/automation", tags=["automation"])

# Las únicas claves que n8n acepta; el resto las ignora
FLAG_KEYS = (
    "ia_global", "followup_leads", "recordatorios_citas", "avisos_facturas", "resumen_diario",
    "formulario_web", "ig_dm_palabra_clave", "ig_respuestas_publicas", "ig_dm_ia",
)


class FlagsUpdate(BaseModel):
    flags: Dict[str, bool]


class FlagsResponse(BaseModel):
    flags: Dict[str, bool]


def _as_bool(value) -> bool:
    if isinstance(value, str):
        return value.strip().lower() not in ("false", "0", "no", "off", "")
    return bool(value)


def _clean(data: dict) -> Dict[str, bool]:
    raw = data.get("flags")
    if not isinstance(raw, dict):
        return {}
    return {key: _as_bool(raw[key]) for key in FLAG_KEYS if key in raw}


async def _sync_global_ai(db: AsyncSession, flags: Dict[str, bool]) -> None:
    if "ia_global" not in flags:
        return
    value = "true" if flags["ia_global"] else "false"
    row = await db.get(AppSetting, AI_SETTING_KEY)
    if row and row.value == value:
        return
    if row:
        row.value = value
    else:
        db.add(AppSetting(key=AI_SETTING_KEY, value=value))
    await db.commit()


def _unavailable(error: str | None) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_502_BAD_GATEWAY,
        detail=f"No se pudo conectar con el bot: {error}. Revisa que el workflow de n8n esté activo.",
    )


@router.get("/flags", response_model=FlagsResponse)
async def get_flags(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Estado actual de los interruptores del bot, leído de n8n."""
    ok, data, error = await get_webhook(settings.N8N_BOT_CONFIG_PATH, timeout=8.0)
    if not ok:
        raise _unavailable(error)
    flags = _clean(data)
    await _sync_global_ai(db, flags)
    return FlagsResponse(flags=flags)


@router.put("/flags", response_model=FlagsResponse)
async def update_flags(
    body: FlagsUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Enciende o apaga uno o varios interruptores. Devuelve el estado resultante."""
    unknown = sorted(set(body.flags) - set(FLAG_KEYS))
    if unknown or not body.flags:
        raise HTTPException(status_code=400, detail=f"Interruptor no válido: {', '.join(unknown) or 'ninguno'}")

    ok, data, error = await post_webhook(settings.N8N_BOT_CONFIG_PATH, {
        "flags": body.flags, "changed_by": admin.email,
    }, timeout=8.0)
    if not ok:
        raise _unavailable(error)

    # Si n8n no devuelve el estado completo, se da por aplicado lo que se envió
    flags = {**body.flags, **_clean(data)}
    await _sync_global_ai(db, flags)
    return FlagsResponse(flags=flags)
