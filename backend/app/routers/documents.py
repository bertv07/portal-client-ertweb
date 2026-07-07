import shutil
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from app.core.database import get_db
from app.models.document import Document
from app.schemas.document import DocumentResponse, DocumentStatusUpdate, DocumentRequiredCreate
from app.api.deps import get_current_user, get_current_admin_user, require_admin_or_n8n
from app.models.user import User

UPLOAD_DIR = Path("uploads/documents")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx", ".xlsx"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/me", response_model=List[DocumentResponse])
async def get_my_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Client: get all their documents."""
    stmt = select(Document).where(Document.client_id == current_user.id).order_by(Document.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/", response_model=List[DocumentResponse])
async def get_all_documents(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: get all documents."""
    stmt = select(Document).order_by(Document.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/client/{client_id}", response_model=List[DocumentResponse])
async def get_client_documents(
    client_id: str,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Admin: get documents for a specific client."""
    stmt = select(Document).where(Document.client_id == client_id).order_by(Document.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/required", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_required_document_slot(
    doc_in: DocumentRequiredCreate,
    db: AsyncSession = Depends(get_db),
    caller: str = Depends(require_admin_or_n8n),
):
    """Admin: create a 'required' document placeholder that client must fill."""
    doc = Document(
        client_id=doc_in.client_id,
        project_id=doc_in.project_id,
        name=doc_in.name,
        original_filename="",
        file_url="",
        file_type="",
        doc_type=doc_in.doc_type,
        source="required",
        status="pending",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    name: str = Form(...),
    project_id: Optional[str] = Form(None),
    doc_type: str = Form("general"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Client: upload a new document."""
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed. Use: {', '.join(ALLOWED_TYPES)}")

    # Read and size-check
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    # Save to disk
    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = UPLOAD_DIR / unique_name
    with open(file_path, "wb") as f:
        f.write(content)

    doc = Document(
        client_id=current_user.id,
        project_id=project_id,
        name=name,
        original_filename=file.filename,
        file_url=f"/uploads/documents/{unique_name}",
        file_type=ext.lstrip("."),
        file_size_bytes=len(content),
        doc_type=doc_type,
        source="uploaded",
        status="review",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return doc


@router.post("/{doc_id}/upload", response_model=DocumentResponse)
async def upload_file_to_slot(
    doc_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Client: upload a file to an existing document slot (e.g. required placeholder)."""
    stmt = select(Document).where(Document.id == doc_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document slot not found")

    if doc.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed. Use: {', '.join(ALLOWED_TYPES)}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    unique_name = f"{uuid.uuid4()}{ext}"
    file_path = UPLOAD_DIR / unique_name
    with open(file_path, "wb") as f:
        f.write(content)

    doc.original_filename = file.filename
    doc.file_url = f"/uploads/documents/{unique_name}"
    doc.file_type = ext.lstrip(".")
    doc.file_size_bytes = len(content)
    doc.status = "review"

    await db.commit()
    await db.refresh(doc)
    return doc



@router.put("/{doc_id}/status", response_model=DocumentResponse)
async def update_document_status(
    doc_id: str,
    status_in: DocumentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin_user),
):
    """Admin: approve or reject a document."""
    stmt = select(Document).where(Document.id == doc_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.status = status_in.status
    doc.admin_notes = status_in.admin_notes
    await db.commit()
    await db.refresh(doc)
    return doc


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Client or admin: delete a document."""
    stmt = select(Document).where(Document.id == doc_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Only owner or admin can delete
    if doc.client_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    # Remove physical file if exists
    if doc.file_url:
        try:
            file_path = Path(doc.file_url.lstrip("/"))
            if file_path.exists():
                file_path.unlink()
        except Exception:
            pass

    await db.delete(doc)
    await db.commit()
