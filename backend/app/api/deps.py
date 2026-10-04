import hmac

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import ValidationError
from jwt.exceptions import InvalidTokenError

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.token import TokenPayload

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

STAFF_ROLES = ("admin", "seller")


async def _user_from_token(token: str, db: AsyncSession) -> User:
    """Valida el JWT y devuelve el usuario. 401 si el token no sirve, para que
    el frontend cierre la sesión y mande al login."""
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sesión inválida o expirada",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        token_data = TokenPayload(**payload)
    except (InvalidTokenError, ValidationError):
        raise credentials_error

    result = await db.execute(select(User).where(User.id == token_data.sub))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise credentials_error
    return user


def _valid_n8n_key(request: Request) -> bool | None:
    """None si no viene API key; True/False según sea válida."""
    api_key = request.headers.get("x-n8n-api-key")
    if not api_key:
        return None
    return bool(settings.N8N_API_KEY) and hmac.compare_digest(api_key, settings.N8N_API_KEY)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(reusable_oauth2)
) -> User:
    return await _user_from_token(token, db)

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user

async def get_current_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

async def get_current_staff_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Admin o vendedor."""
    if current_user.role not in STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user


async def _key_or_roles(request: Request, db: AsyncSession, roles: tuple[str, ...]) -> str:
    key_ok = _valid_n8n_key(request)
    if key_ok is not None:
        if not key_ok:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API key inválida")
        return "n8n"

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado")

    user = await _user_from_token(auth_header.removeprefix("Bearer "), db)
    if user.role not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos suficientes")
    # Disponible para los endpoints que necesitan saber qué persona llamó
    request.state.user = user
    return user.role


async def require_admin_or_n8n(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> str:
    """Permite acceso si el request viene de n8n (X-N8N-API-Key) o de un admin JWT.

    Retorna 'n8n' o 'admin' para que el endpoint sepa quién llamó.
    Úsalo en endpoints que n8n necesita llamar para aprobar/rechazar pagos.
    """
    return await _key_or_roles(request, db, ("admin",))


async def require_staff_or_n8n(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> str:
    """Como require_admin_or_n8n pero también acepta vendedores.
    Retorna 'n8n', 'admin' o 'seller'."""
    return await _key_or_roles(request, db, STAFF_ROLES)


async def require_n8n(request: Request) -> str:
    """Solo n8n (X-N8N-API-Key). Para los webhooks entrantes de WhatsApp."""
    if not _valid_n8n_key(request):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API key inválida")
    return "n8n"
