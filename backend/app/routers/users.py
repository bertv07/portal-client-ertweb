from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update, func
from typing import List

from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import User
from app.models.project import Project
from app.models.invoice import Invoice
from app.models.document import Document
from app.models.maintenance import MaintenancePlan, MaintenancePayment
from app.models.manual_payment import ManualPayment
from app.models.appointment import Appointment
from app.models.notification import Notification
from app.models.whatsapp import WaConversation, WaMessage
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.schemas.project import ProjectResponse
from app.schemas.invoice import InvoiceResponse
from app.schemas.document import DocumentResponse
from app.schemas.maintenance import MaintenancePlanResponse
from app.schemas.manual_payment import ManualPaymentResponse
from app.schemas.appointment import AppointmentResponse
from app.api.deps import get_current_admin_user, require_admin_or_n8n

router = APIRouter(prefix="/users", tags=["users"])


async def _get_user_or_404(db: AsyncSession, user_id: str) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


async def _email_taken(db: AsyncSession, email: str, exclude_id: str | None = None) -> bool:
    stmt = select(User.id).where(func.lower(User.email) == email.lower())
    if exclude_id:
        stmt = stmt.where(User.id != exclude_id)
    return (await db.execute(stmt)).first() is not None


async def _count_active_admins(db: AsyncSession) -> int:
    stmt = select(func.count()).select_from(User).where(User.role == "admin", User.is_active.is_(True))
    return (await db.execute(stmt)).scalar_one()


@router.get("/", response_model=List[UserResponse])
async def get_users(
    role: str = "client",
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Admin / n8n: lista de cuentas. Por defecto solo clientes;
    ?role=seller | admin | all para el resto."""
    stmt = select(User).order_by(User.created_at.desc())
    if role != "all":
        stmt = stmt.where(User.role == role)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Admin / n8n: get a specific user."""
    return await _get_user_or_404(db, user_id)


@router.get("/{user_id}/overview")
async def get_client_overview(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Admin / n8n: todo lo de un cliente en una sola llamada (lo mismo que
    él ve en su portal): proyectos, facturas, documentos, planes, pagos y citas."""
    user = await _get_user_or_404(db, user_id)

    async def rows(model, order):
        res = await db.execute(select(model).where(model.client_id == user_id).order_by(order))
        return res.scalars().all()

    return {
        "user": UserResponse.model_validate(user),
        "projects": [ProjectResponse.model_validate(r) for r in await rows(Project, Project.created_at.desc())],
        "invoices": [InvoiceResponse.model_validate(r) for r in await rows(Invoice, Invoice.created_at.desc())],
        "documents": [DocumentResponse.model_validate(r) for r in await rows(Document, Document.created_at.desc())],
        "maintenance_plans": [MaintenancePlanResponse.model_validate(r) for r in await rows(MaintenancePlan, MaintenancePlan.created_at.desc())],
        "manual_payments": [ManualPaymentResponse.model_validate(r) for r in await rows(ManualPayment, ManualPayment.created_at.desc())],
        "appointments": [AppointmentResponse.model_validate(r) for r in await rows(Appointment, Appointment.appointment_date.desc())],
    }


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Admin / n8n: crea una cuenta.

    Autenticación aceptada:
      - Header  X-N8N-API-Key: <clave>   (para que la automatización registre clientes)
      - Bearer JWT de admin              (para la web)

    Un admin puede elegir el rol (client, seller o admin). Con la API key de
    n8n el rol siempre se fuerza a "client": la automatización no puede crear
    cuentas con acceso interno.
    """
    if await _email_taken(db, user_in.email):
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=user_in.name.strip(),
        email=user_in.email.strip().lower(),
        password_hash=get_password_hash(user_in.password),
        role=user_in.role if caller == "admin" else "client",
        avatar_url=user_in.avatar_url,
        phone=user_in.phone,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: edita una cuenta (datos, rol, contraseña, activar/desactivar)."""
    user = await _get_user_or_404(db, user_id)
    data = user_in.model_dump(exclude_unset=True)

    if data.get("email"):
        if await _email_taken(db, data["email"], exclude_id=user.id):
            raise HTTPException(status_code=400, detail="Email already registered")
        user.email = data["email"].strip().lower()

    # Un admin no puede quitarse a sí mismo el acceso, ni dejar el portal sin admins
    losing_admin = user.role == "admin" and (
        data.get("role") not in (None, "admin") or data.get("is_active") is False
    )
    if losing_admin:
        if user.id == admin.id:
            raise HTTPException(status_code=400, detail="No puedes quitarte tu propio acceso de administrador")
        if user.is_active and await _count_active_admins(db) <= 1:
            raise HTTPException(status_code=400, detail="Debe quedar al menos un administrador activo")

    if data.get("name"):
        user.name = data["name"].strip()
    if data.get("password"):
        user.password_hash = get_password_hash(data["password"])
    if "avatar_url" in data:
        user.avatar_url = data["avatar_url"]
    if "phone" in data:
        user.phone = data["phone"] or None
    if data.get("role"):
        user.role = data["role"]
    if data.get("is_active") is not None:
        user.is_active = data["is_active"]

    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: elimina una cuenta y todo lo que cuelga de ella."""
    user = await _get_user_or_404(db, user_id)
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta")
    if user.role == "admin" and user.is_active and await _count_active_admins(db) <= 1:
        raise HTTPException(status_code=400, detail="Debe quedar al menos un administrador activo")

    # Archivos subidos por el cliente
    file_urls = [
        u for (u,) in (await db.execute(select(Document.file_url).where(Document.client_id == user_id))).all()
    ] + [
        u for (u,) in (await db.execute(select(ManualPayment.proof_url).where(ManualPayment.client_id == user_id))).all()
    ]

    # Las tablas referencian users.id sin ON DELETE CASCADE, así que se borra
    # en orden (hijos primero) para no romper las claves foráneas.
    plan_ids = select(MaintenancePlan.id).where(MaintenancePlan.client_id == user_id)
    await db.execute(delete(ManualPayment).where(ManualPayment.client_id == user_id))
    await db.execute(delete(MaintenancePayment).where(MaintenancePayment.plan_id.in_(plan_ids)))
    await db.execute(delete(MaintenancePlan).where(MaintenancePlan.client_id == user_id))
    await db.execute(delete(Invoice).where(Invoice.client_id == user_id))
    await db.execute(delete(Document).where(Document.client_id == user_id))
    await db.execute(delete(Appointment).where(Appointment.client_id == user_id))
    await db.execute(delete(Project).where(Project.client_id == user_id))
    await db.execute(delete(Notification).where(Notification.user_id == user_id))
    # Lo que la cuenta hizo como staff se conserva, solo se desvincula
    await db.execute(update(Appointment).where(Appointment.created_by == user_id).values(created_by=None))
    await db.execute(update(WaConversation).where(WaConversation.client_id == user_id).values(client_id=None))
    await db.execute(update(WaConversation).where(WaConversation.assigned_to == user_id).values(assigned_to=None))
    await db.execute(update(WaMessage).where(WaMessage.agent_id == user_id).values(agent_id=None))
    await db.delete(user)
    await db.commit()

    for url in file_urls:
        if url and url.startswith("/uploads/"):
            try:
                Path(url.lstrip("/")).unlink(missing_ok=True)
            except OSError:
                pass
