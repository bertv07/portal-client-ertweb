import logging
import secrets
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.routers import notifications, auth, projects, invoices, documents, users, maintenance, meetings, payments, manual_payments

from sqlalchemy import select
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

# Ensure upload dirs exist
Path("uploads/documents").mkdir(parents=True, exist_ok=True)
Path("uploads/invoices").mkdir(parents=True, exist_ok=True)
Path("uploads/manual_payments").mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Serve uploaded files as static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)
app.include_router(projects.router, prefix=settings.API_V1_STR)
app.include_router(invoices.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(users.router, prefix=settings.API_V1_STR)
app.include_router(maintenance.router, prefix=settings.API_V1_STR)
app.include_router(meetings.router, prefix=settings.API_V1_STR)
app.include_router(payments.router, prefix=settings.API_V1_STR)
app.include_router(manual_payments.router, prefix=settings.API_V1_STR)



@app.on_event("startup")
async def startup_event():
    # Seed default users
    async with SessionLocal() as db:
        admin_email = "admin@ertweb.com"
        result = await db.execute(select(User).where(User.email == admin_email))
        admin = result.scalar_one_or_none()
        
        client_email = "client@example.com"
        result_client = await db.execute(select(User).where(User.email == client_email))
        client = result_client.scalar_one_or_none()
        
        if not admin:
            admin_password = settings.ADMIN_DEFAULT_PASSWORD or secrets.token_urlsafe(12)
            if not settings.ADMIN_DEFAULT_PASSWORD:
                logger.warning(
                    "ADMIN_DEFAULT_PASSWORD no configurado — password generada para %s: %s",
                    admin_email, admin_password,
                )
            admin = User(
                email=admin_email,
                name="Alex Admin",
                password_hash=get_password_hash(admin_password),
                role="admin"
            )
            db.add(admin)

        if not client:
            client_password = settings.CLIENT_DEFAULT_PASSWORD or secrets.token_urlsafe(12)
            if not settings.CLIENT_DEFAULT_PASSWORD:
                logger.warning(
                    "CLIENT_DEFAULT_PASSWORD no configurado — password generada para %s: %s",
                    client_email, client_password,
                )
            client = User(
                email=client_email,
                name="John Client",
                password_hash=get_password_hash(client_password),
                role="client"
            )
            db.add(client)
            
        await db.commit()
        await db.refresh(client)
        
        # Seed mock data for client to test the platform features
        from app.models.project import Project
        from app.models.invoice import Invoice
        from app.models.document import Document
        from app.models.maintenance import MaintenancePlan, MaintenancePayment
        from app.models.notification import Notification
        from datetime import date, timedelta, datetime, timezone
        
        proj_check = await db.execute(select(Project).where(Project.client_id == client.id))
        if not proj_check.scalars().first():
            # 1. Projects
            project1 = Project(
                client_id=client.id,
                name="Sitio Web Corporativo",
                description="Desarrollo de landing page y portal web corporativo responsivo con blog y catálogo de productos.",
                project_type="website",
                status="active",
                phase="Desarrollo",
                progress_pct=65,
                estimated_weeks=6,
                remaining_weeks=2,
                started_at=datetime.now(timezone.utc) - timedelta(days=28),
                due_at=datetime.now(timezone.utc) + timedelta(days=14),
                updates_tags="Diseño aprobado, Servidor configurado, Maquetación al 80%"
            )
            project2 = Project(
                client_id=client.id,
                name="Automatización CRM n8n",
                description="Conexión automatizada entre WhatsApp Webhook, CRM Pipedrive y Google Calendar para agendamiento.",
                project_type="automation",
                status="active",
                phase="QA & Pruebas",
                progress_pct=90,
                estimated_weeks=4,
                remaining_weeks=1,
                started_at=datetime.now(timezone.utc) - timedelta(days=21),
                due_at=datetime.now(timezone.utc) + timedelta(days=7),
                updates_tags="API conectadas, Flujo n8n activo, QA final"
            )
            db.add_all([project1, project2])
            await db.commit()
            await db.refresh(project1)
            await db.refresh(project2)
            
            # 2. Document Placeholders & Uploads
            doc1 = Document(
                client_id=client.id,
                project_id=project1.id,
                name="Copia de Identificación Oficial",
                original_filename="",
                file_url="",
                file_type="",
                doc_type="identificación",
                source="required",
                status="pending"
            )
            doc2 = Document(
                client_id=client.id,
                project_id=project1.id,
                name="Logotipo Vectorial (SVG/AI)",
                original_filename="",
                file_url="",
                file_type="",
                doc_type="branding",
                source="required",
                status="pending"
            )
            doc3 = Document(
                client_id=client.id,
                project_id=project1.id,
                name="Contrato de Prestación de Servicios Firmado",
                original_filename="contrato_firmado_john.pdf",
                file_url="/uploads/documents/mock_contrato.pdf",
                file_type="pdf",
                file_size_bytes=1024 * 350,
                doc_type="contrato",
                source="required",
                status="approved"
            )
            db.add_all([doc1, doc2, doc3])
            
            # 3. Invoices
            inv1 = Invoice(
                client_id=client.id,
                project_id=project1.id,
                number="INV-2026-001",
                description="50% Anticipo Desarrollo de Sitio Web Corporativo",
                amount=1250.00,
                currency="USD",
                status="paid",
                due_date=date.today() - timedelta(days=20),
                paid_at=datetime.now(timezone.utc) - timedelta(days=20),
                pdf_url="/uploads/invoices/inv-2026-001.pdf"
            )
            inv2 = Invoice(
                client_id=client.id,
                project_id=project1.id,
                number="INV-2026-002",
                description="50% Saldo Restante - Sitio Web Corporativo",
                amount=1250.00,
                currency="USD",
                status="pending",
                due_date=date.today() + timedelta(days=10)
            )
            inv3 = Invoice(
                client_id=client.id,
                project_id=project2.id,
                number="INV-2026-003",
                description="Pago único - Automatización de CRM n8n",
                amount=800.00,
                currency="USD",
                status="pending",
                due_date=date.today() + timedelta(days=5)
            )
            db.add_all([inv1, inv2, inv3])
            
            # 4. Maintenance Plan & Payments
            plan = MaintenancePlan(
                client_id=client.id,
                plan_name="Plan Mensual de Soporte Premium",
                description="Soporte y mantenimiento para el Sitio Web Corporativo y Servidor VPS.",
                price=150.00,
                currency="USD",
                billing_cycle="monthly",
                start_date=date.today() - timedelta(days=60),
                next_payment_date=date.today() + timedelta(days=15),
                is_active=True,
                tasks_json='["Software Update (Core, Plugins)", "Auditoría Mensual de Seguridad", "Backup Review & Logs", "1h Soporte Telefónico Directo"]'
            )
            db.add(plan)
            await db.commit()
            await db.refresh(plan)
            
            pay1 = MaintenancePayment(
                plan_id=plan.id,
                amount=150.00,
                currency="USD",
                status="paid",
                due_date=date.today() - timedelta(days=45),
                paid_at=datetime.now(timezone.utc) - timedelta(days=45),
                notes="Pago automático Stripe"
            )
            pay2 = MaintenancePayment(
                plan_id=plan.id,
                amount=150.00,
                currency="USD",
                status="paid",
                due_date=date.today() - timedelta(days=15),
                paid_at=datetime.now(timezone.utc) - timedelta(days=15),
                notes="Pago automático Stripe"
            )
            db.add_all([pay1, pay2])
            
            # 5. Notifications
            notif1 = Notification(
                user_id=client.id,
                title="Hito completado:",
                subtitle="Diseño aprobado",
                message="El diseño del proyecto ha sido aprobado. Ahora pasamos a la fase de desarrollo.",
                type="milestone"
            )
            notif2 = Notification(
                user_id=client.id,
                title="Factura emitida",
                message="Se ha generado la factura INV-2026-002 de saldo restante.",
                type="document"
            )
            db.add_all([notif1, notif2])
            
            await db.commit()



@app.get("/")
async def root():
    return {"message": "Welcome to ErtWeb Client Portal API"}
