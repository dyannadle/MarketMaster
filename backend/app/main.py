from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api.v1.api import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    await init_db()
    yield
    # Clean shutdown tasks if any

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
    description="Institutional-Grade Virtual Trading Terminal, Quant Derivatives Engine & Paper Matching Core."
)

# Set up CORS middleware for terminal frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
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
        "version": "1.0.0",
        "database": "CONNECTED",
        "zero_cost_stack": True
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "docs_url": "/docs",
        "health_check": "/actuator/health",
        "api_v1": settings.API_V1_STR
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

