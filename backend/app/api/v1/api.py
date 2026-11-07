from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.trading import router as trading_router
from app.api.v1.quant import router as quant_router
from app.api.v1.replay import router as replay_router
from app.api.v1.market import router as market_router
from app.api.v1.news import router as news_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication & User"])
api_router.include_router(trading_router, prefix="/trading", tags=["Virtual Trading & Ledger"])
api_router.include_router(quant_router, prefix="/quant", tags=["Quantitative Models & Derivatives"])
api_router.include_router(replay_router, prefix="/replay", tags=["Market Replay & Gym Engine"])
api_router.include_router(market_router, prefix="/market", tags=["Live Yahoo Finance Market Data"])
api_router.include_router(news_router, prefix="/news", tags=["Live Financial News Feed (10-min Refresh)"])


