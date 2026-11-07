from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Query, Body
from pydantic import BaseModel
from app.services.replay_service import ReplayService, HISTORICAL_PRESETS

router = APIRouter()

class SliceRequest(BaseModel):
    candles: List[Dict[str, Any]]
    current_index: int
    window_size: int = 60

@router.get("/presets")
async def get_presets():
    """Returns the catalog of historical institutional market event presets."""
    return {
        "presets": ReplayService.get_preset_catalog()
    }

@router.get("/session")
async def generate_session(
    symbol: str = Query("NIFTY_FUT", description="Trading asset symbol or ASSET_X for Blind Mode"),
    preset_id: Optional[str] = Query(None, description="Named historical event preset (e.g. COVID_CRASH_2020)"),
    bars: int = Query(375, ge=30, le=1000, description="Total number of 1-minute candles"),
    blind_mode: bool = Query(False, description="Mask real timestamp and ticker name for ChartingPark Gym")
):
    """
    Generates realistic 1-minute OHLCV market replay sessions with
    volatility clustering, regime dynamics, historical event shocks, and optional Blind Mode masking.
    """
    preset_info = HISTORICAL_PRESETS.get(preset_id) if preset_id else None

    if preset_info:
        target_symbol = "ASSET_X" if blind_mode else preset_info["instrument"]
        base_price = preset_info["base_price"]
    else:
        target_symbol = "ASSET_X" if blind_mode else symbol
        base_price = 24500.0 if "NIFTY" in symbol else (52000.0 if "BANK" in symbol else 1000.0)

    candles = ReplayService.generate_synthetic_session(
        symbol=target_symbol,
        preset_id=preset_id,
        base_price=base_price,
        bars=bars,
        blind_mode=blind_mode
    )

    return {
        "symbol": target_symbol,
        "preset_id": preset_id,
        "preset_name": preset_info["name"] if preset_info else ("Blind Practice Asset" if blind_mode else "Standard Market Regime"),
        "macro_driver": preset_info["macro_driver"] if (preset_info and not blind_mode) else "Blind historical tape. Trade the order flow, not hindsight.",
        "trading_lesson": preset_info["trading_lesson"] if (preset_info and not blind_mode) else "Maintain strict Rule 4.3 stop-loss discipline.",
        "regime": preset_info["regime"] if (preset_info and not blind_mode) else "Normalized Market Volatility",
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
