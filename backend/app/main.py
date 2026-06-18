from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.routers import notifications, auth

from sqlalchemy import select
from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(notifications.router, prefix=settings.API_V1_STR)

@app.on_event("startup")
async def startup_event():
    # Seed default users
    async with SessionLocal() as db:
        admin_email = "admin@ertweb.com"
        result = await db.execute(select(User).where(User.email == admin_email))
        if not result.scalar_one_or_none():
            admin = User(
                email=admin_email,
                name="Alex Admin",
                password_hash=get_password_hash("admin123"),
                role="admin"
            )
            client = User(
                email="client@example.com",
                name="John Client",
                password_hash=get_password_hash("client123"),
                role="client"
            )
            db.add_all([admin, client])
            await db.commit()

@app.get("/")
async def root():
    return {"message": "Welcome to ErtWeb Client Portal API"}
