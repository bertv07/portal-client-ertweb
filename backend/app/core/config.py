from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ErtWeb Client Portal API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # DB
    DATABASE_URL: str = "sqlite+aiosqlite:///./ertweb.db"
    
    # Auth
    SECRET_KEY: str = "supersecretkey-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 1 week
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "https://portal.ertweb.com",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
