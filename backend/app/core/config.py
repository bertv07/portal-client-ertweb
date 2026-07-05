from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ErtWeb Client Portal API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # DB
    DATABASE_URL: str = "sqlite+aiosqlite:///./ertweb.db"
    
    # Auth
    SECRET_KEY: str  # obligatorio via .env — sin valor por defecto inseguro
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 1 week

    # Seed / demo (opcional — si no se define se genera una password aleatoria al arrancar)
    ADMIN_DEFAULT_PASSWORD: str | None = None
    CLIENT_DEFAULT_PASSWORD: str | None = None
    
    # URL base del backend (para construir URLs absolutas de archivos que n8n puede abrir)
    BACKEND_BASE_URL: str = "http://localhost:8000"

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "https://portal.ertweb.com",
    ]

    # PayPal
    PAYPAL_CLIENT_ID: str = ""
    PAYPAL_CLIENT_SECRET: str = ""
    PAYPAL_MODE: str = "sandbox"  # sandbox | live

    # Binance Pay — cuenta receptora de pagos manuales
    BINANCE_ID: str = ""
    BINANCE_EMAIL: str = ""
    BINANCE_NAME: str = ""

    # n8n — Automatización
    # N8N_WEBHOOK_BASE_URL: URL base de n8n (sin slash final)
    # N8N_API_KEY: clave que n8n envía en X-N8N-API-Key para aprobar/rechazar pagos
    N8N_WEBHOOK_BASE_URL: str = "http://localhost:5678"
    N8N_API_KEY: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
