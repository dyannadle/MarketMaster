import time
import logging
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import Dict, List
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.api.v1.api import api_router

logger = logging.getLogger("marketmaster.api")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# In-Memory Sliding Window Rate Limiter
class RateLimiter:
    def __init__(self):
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
        self.requests[key] = [t for t in timestamps if now - t < window]

        if len(self.requests[key]) >= max_reqs:
            return True

        self.requests[key].append(now)
        return False

rate_limiter = RateLimiter()

class SecurityAndObservabilityMiddleware:
    """
    High-Performance Pure ASGI Middleware.
    Enforces security headers, rate limiting, and request latency logging
    without BaseHTTPMiddleware task group deadlocks in async test runners.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        client = scope.get("client")
        client_ip = client[0] if client else "127.0.0.1"
        path = scope.get("path", "")

        # 1. Rate Limiting Check
        if rate_limiter.is_rate_limited(client_ip, path):
            logger.warning(f"Rate limit exceeded for IP {client_ip} on {path}")
            response = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests. Please wait a moment before trying again.",
                    "retry_after_seconds": 30
                },
                headers={"Retry-After": "30"}
            )
            await response(scope, receive, send)
            return

        start_time = time.time()

        # 2. Inject Security Headers and Measure Latency
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                process_time_ms = round((time.time() - start_time) * 1000, 2)
                headers = list(message.get("headers", []))
                headers.extend([
                    (b"x-content-type-options", b"nosniff"),
                    (b"x-frame-options", b"DENY"),
                    (b"referrer-policy", b"strict-origin-when-cross-origin"),
                    (b"x-xss-protection", b"1; mode=block"),
                    (b"x-process-time-ms", str(process_time_ms).encode()),
                ])
                message["headers"] = headers
                status_code = message.get("status", 200)
                if not path.startswith("/actuator"):
                    logger.info(f"{scope.get('method')} {path} -> {status_code} ({process_time_ms}ms)")
            await send(message)

        await self.app(scope, receive, send_wrapper)

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

# Apply Security & Rate Limiting ASGI Middleware
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
