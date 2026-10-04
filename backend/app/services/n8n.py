"""Llamadas salientes del portal a los webhooks de n8n."""
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def post_webhook(path: str, payload: dict, timeout: float = 10.0) -> tuple[bool, dict, str | None]:
    """POST a un webhook de n8n. Devuelve (ok, json_respuesta, error).

    Nunca lanza: si n8n está caído devuelve ok=False con el motivo, y cada
    endpoint decide si eso es bloqueante o no. Envía N8N_API_KEY en el header
    X-N8N-API-Key para que el webhook pueda validar que la llamada es del portal.
    """
    if not settings.N8N_WEBHOOK_BASE_URL:
        return False, {}, "N8N_WEBHOOK_BASE_URL no configurado"

    url = f"{settings.N8N_WEBHOOK_BASE_URL.rstrip('/')}/{path.lstrip('/')}"
    headers = {"X-N8N-API-Key": settings.N8N_API_KEY} if settings.N8N_API_KEY else {}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=headers, timeout=timeout)
    except Exception as exc:
        logger.warning("n8n no disponible (%s): %s", url, exc)
        return False, {}, "No se pudo conectar con n8n"

    if resp.status_code >= 300:
        logger.warning("n8n respondió %s en %s: %s", resp.status_code, url, resp.text[:300])
        return False, {}, f"n8n respondió {resp.status_code}"

    try:
        data = resp.json()
    except ValueError:
        data = {}
    # n8n suele devolver una lista con un item
    if isinstance(data, list):
        data = data[0] if data and isinstance(data[0], dict) else {}
    if not isinstance(data, dict):
        data = {}
    return True, data, None
