from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Query, Body
from pydantic import BaseModel
from app.services.replay_service import ReplayService

router = APIRouter()

class SliceRequest(BaseModel):
    candles: List[Dict[str, Any]]
    current_index: int
    window_size: int = 60

@router.get("/session")
async def generate_session(
    symbol: str = Query("NIFTY_FUT", description="Trading asset symbol or ASSET_X for Blind Mode"),
    bars: int = Query(375, ge=30, le=1000, description="Total number of 1-minute candles"),
    blind_mode: bool = Query(False, description="Mask real timestamp and ticker name for ChartingPark Gym")
):
    """
    Generates realistic 1-minute OHLCV market replay sessions with
    volatility clustering, micro-spreads, and optional Blind Mode masking.
    """
    base_price = 24500.0 if "NIFTY" in symbol else (52000.0 if "BANK" in symbol else 1000.0)
    candles = ReplayService.generate_synthetic_session(
        symbol=symbol,
        base_price=base_price,
        bars=bars,
        blind_mode=blind_mode
    )
    return {
        "symbol": "ASSET_X" if blind_mode else symbol,
        "total_bars": len(candles),
        "blind_mode": blind_mode,
        "candles": candles
    }

@router.post("/slice")
async def slice_candles(req: SliceRequest):
    """
    Slices replay candles up to requested index using Polars.
    Guarantees no future-leak bias during playback drills.
    """
    return ReplayService.slice_replay_window(
        candles=req.candles,
        current_index=req.current_index,
        window_size=req.window_size
    )

