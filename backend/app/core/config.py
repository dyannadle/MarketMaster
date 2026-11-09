import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "MarketMaster Academy Quant Backend"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security & Auth
    SECRET_KEY: str = os.getenv("JWT_SECRET", "marketmaster-enterprise-secret-key-min-32-chars-2026-v2")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Financial Invariants
    INITIAL_VIRTUAL_CAPITAL: float = 1000000.00  # ₹10,00,000.00
    MAX_RISK_PER_TRADE_PERCENT: float = 0.015  # 1.5% max risk enforcement rule
    DEFAULT_DISCIPLINE_SCORE: int = 95
    DEFAULT_ELO_RATING: int = 1500
    
    # Database Configuration (PostgreSQL 16 with fallback to aiosqlite for zero-install testing)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "sqlite+aiosqlite:///./marketmaster.db"
    )
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # CORS & Whitelisted Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://10.0.2.2:3000",
        "https://marketmaster.vercel.app"
    ]

    # Authorized Platform Administrators (Rule 4.1 RBAC Invariant)
    ADMIN_EMAILS: List[str] = [
        "dyanndlee05@gmail.com",
        "dyannadle05@gmail.com",
        "admin@marketmaster.in"
    ]

    class Config:
        case_sensitive = True

settings = Settings()

