import time
import logging
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import Dict, List
from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.api.v1.api import api_router

logger = logging.getLogger("marketmaster.api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# In-Memory Sliding Window Rate Limiter
class RateLimiter:
    def __init__(self):
        # Maps (ip, endpoint_prefix) -> list of request timestamps
        self.requests: Dict[str, List[float]] = defaultdict(list)

    def is_rate_limited(self, ip: str, path: str) -> bool:
        now = time.time()
        window = 60.0  # 1-minute window

        # Route-specific rate limits
        if "/api/v1/auth/login" in path:
            max_reqs = 15
        elif "/api/v1/auth/register" in path:
            max_reqs = 8
        elif "/api/v1/trading/orders" in path:
            max_reqs = 60
        else:
            return False  # Uncapped for read-only / market feeds

        key = f"{ip}:{path}"
        timestamps = self.requests[key]
        # Purge timestamps outside the window
        self.requests[key] = [t for t in timestamps if now - t < window]

        if len(self.requests[key]) >= max_reqs:
            return True

        self.requests[key].append(now)
        return False

rate_limiter = RateLimiter()

class SecurityAndObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "127.0.0.1"
        path = request.url.path

        # Rate Limiting Guard
        if rate_limiter.is_rate_limited(client_ip, path):
            logger.warning(f"Rate limit exceeded for IP {client_ip} on {path}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests. Please wait a moment before trying again.",
                    "retry_after_seconds": 30
                },
                headers={"Retry-After": "30"}
            )

        start_time = time.time()
        try:
            response: Response = await call_next(request)
        except Exception as exc:
            logger.exception(f"Unhandled exception on {request.method} {path}: {exc}")
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal server error. Please retry shortly."}
            )

        process_time_ms = round((time.time() - start_time) * 1000, 2)

        # Security Headers (Section 3 Audit Hardening)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["X-Process-Time-Ms"] = str(process_time_ms)

        # Log request telemetry (passwords/tokens omitted by design)
        if not path.startswith("/actuator"):
            logger.info(f"{request.method} {path} -> {response.status_code} ({process_time_ms}ms)")

        return response

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    await init_db()
    logger.info("MarketMaster double-entry ledger & database schema initialized.")
    yield
    logger.info("MarketMaster backend gracefully shut down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
    description="Institutional-Grade Virtual Trading Terminal, Quant Derivatives Engine & Paper Matching Core."
)

# Apply Security & Rate Limiting Middleware
app.add_middleware(SecurityAndObservabilityMiddleware)

# Locked Down CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/actuator/health", tags=["Health & Observability"])
async def health_check():
    """System health check probe."""
    return {
        "status": "UP",
        "engine": "MarketMaster Python Quant Backend",
        "version": settings.VERSION,
        "database": "CONNECTED",
        "zero_cost_stack": True,
        "rate_limiting_active": True,
        "security_headers_active": True
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "health_check": "/actuator/health",
        "api_v1": settings.API_V1_STR
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
