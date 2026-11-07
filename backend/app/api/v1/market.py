from typing import List, Optional
from fastapi import APIRouter, Query
from app.services.market_data_service import MarketDataService

router = APIRouter()

@router.get("/quotes")
async def get_quotes(
    symbols: Optional[str] = Query(None, description="Comma-separated symbols, e.g. ^NSEI,^NSEBANK,RELIANCE.NS")
):
    """
    Fetches real-time market quotes from Yahoo Finance with 10s TTL caching
    and synthetic fallback for zero downtime.
    """
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()] if symbols else None
    quotes = await MarketDataService.get_quotes(symbol_list)
    return {
        "quotes": quotes,
        "count": len(quotes),
        "source": "Yahoo Finance (Real-Time API) with Micro-Slippage Fallback"
    }

@router.get("/candles")
async def get_candles(
    symbol: str = Query("^NSEI", description="Symbol to fetch, e.g. ^NSEI, RELIANCE.NS"),
    timeframe: str = Query("1m", description="Timeframe: 1m, 5m, 15m, 1D"),
    range_param: str = Query("1d", description="Historical range: 1d, 5d, 1mo")
):
    """
    Fetches live OHLCV candlestick series for interactive terminal charting.
    """
    return await MarketDataService.get_candles(
        symbol=symbol,
        timeframe=timeframe,
        range_param=range_param
    )
