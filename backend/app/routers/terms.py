"""
Términos y Condiciones — generación del PDF para n8n y el portal.

POST /terms/generate-pdf  (admin JWT o X-N8N-API-Key)
  Body: { "cliente_nombre": str, "proyecto_nombre": str, "client_id": str? }
  Si viene client_id, el PDF queda registrado como documento aprobado del
  cliente y aparece en la sección Documentos del portal.
"""
import re
import unicodedata
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.core.database import get_db
from app.api.deps import require_admin_or_n8n
from app.models.user import User
from app.models.document import Document
from app.services.pdf import render_pdf

UPLOAD_DIR = Path("uploads/documents")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/terms", tags=["terms"])


class TermsGenerateIn(BaseModel):
    cliente_nombre: str
    proyecto_nombre: str
    client_id: Optional[str] = None


def _slug(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_") or "cliente"


@router.post("/generate-pdf")
async def generate_terms_pdf(
    body: TermsGenerateIn,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Genera el PDF de Términos y Condiciones y devuelve su URL absoluta."""
    if body.client_id:
        res = await db.execute(select(User).where(User.id == body.client_id))
        if not res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Cliente no encontrado")

    hoy = datetime.now(timezone(timedelta(hours=-4)))  # hora de Venezuela (UTC-4, sin DST)
    context = {
        "cliente_nombre": body.cliente_nombre,
        "proyecto_nombre": body.proyecto_nombre,
        "fecha": hoy.strftime("%d/%m/%Y"),
        "version": "1.0",
    }
    pdf_bytes = await run_in_threadpool(render_pdf, "plantilla_terminos.html", context)

    filename = f"terminos_{_slug(body.cliente_nombre)}_{hoy.strftime('%Y%m%d')}.pdf"
    (UPLOAD_DIR / filename).write_bytes(pdf_bytes)
    file_url = f"/uploads/documents/{filename}"

    if body.client_id:
        doc = Document(
            client_id=body.client_id,
            name=f"Términos y Condiciones — {body.proyecto_nombre}",
            original_filename=filename,
            file_url=file_url,
            file_type="pdf",
            file_size_bytes=len(pdf_bytes),
            doc_type="terminos",
            source="uploaded",
            status="approved",
        )
        db.add(doc)
        await db.commit()

    return {"pdf_url": f"{settings.BACKEND_BASE_URL}{file_url}"}
