import time
import logging
from typing import Dict, Any, List, Optional
import httpx

logger = logging.getLogger(__name__)

# Standard Indian & Global market symbols
DEFAULT_SYMBOLS = [
    "^NSEI",         # NIFTY 50
    "^NSEBANK",      # BANK NIFTY
    "RELIANCE.NS",   # Reliance Industries
    "HDFCBANK.NS",   # HDFC Bank
    "TCS.NS",        # Tata Consultancy Services
    "INFY.NS",       # Infosys
    "ICICIBANK.NS",  # ICICI Bank
    "GC=F"           # Gold Futures proxy
]

SYMBOL_NAMES = {
    "^NSEI": "NIFTY 50",
    "^NSEBANK": "BANK NIFTY",
    "RELIANCE.NS": "Reliance Industries",
    "HDFCBANK.NS": "HDFC Bank",
    "TCS.NS": "Tata Consultancy Services",
    "INFY.NS": "Infosys",
    "ICICIBANK.NS": "ICICI Bank",
    "GC=F": "Gold Futures (MCX Proxy)"
}

# Baseline anchor prices for fallback
BASELINE_PRICES = {
    "^NSEI": 24200.0,
    "^NSEBANK": 51800.0,
    "RELIANCE.NS": 1280.0,
    "HDFCBANK.NS": 1740.0,
    "TCS.NS": 4120.0,
    "INFY.NS": 1860.0,
    "ICICIBANK.NS": 1260.0,
    "GC=F": 78200.0
}

class MarketDataService:
    """
    Real-time market quote and OHLCV candlestick engine.
    Fetches real live data from Yahoo Finance with resilient in-memory TTL caching
    and zero-crash synthetic fallback.
    """
    _quote_cache: Dict[str, Any] = {}
    _quote_cache_time: float = 0.0
    _CACHE_TTL_SECONDS: float = 10.0  # Cache quotes for 10 seconds to avoid Yahoo rate limits

    _candles_cache: Dict[str, Any] = {}
    _candles_cache_time: Dict[str, float] = {}

    @classmethod
    async def get_quotes(cls, symbols: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        target_symbols = symbols or DEFAULT_SYMBOLS
        now = time.time()

        # Check cache validity
        if cls._quote_cache and (now - cls._quote_cache_time) < cls._CACHE_TTL_SECONDS:
            cached_res = [cls._quote_cache[s] for s in target_symbols if s in cls._quote_cache]
            if len(cached_res) == len(target_symbols):
                return cached_res

        quotes: List[Dict[str, Any]] = []
        try:
            symbols_param = ",".join(target_symbols)
            url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={symbols_param}"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    results = data.get("quoteResponse", {}).get("result", [])
                    for item in results:
                        sym = item.get("symbol", "")
                        price = float(item.get("regularMarketPrice", 0.0) or 0.0)
                        change = float(item.get("regularMarketChange", 0.0) or 0.0)
                        pct = float(item.get("regularMarketChangePercent", 0.0) or 0.0)
                        high = float(item.get("regularMarketDayHigh", price) or price)
                        low = float(item.get("regularMarketDayLow", price) or price)
                        vol = int(item.get("regularMarketVolume", 0) or 0)
                        q = {
                            "symbol": sym,
                            "name": SYMBOL_NAMES.get(sym, item.get("shortName", sym)),
                            "price": round(price, 2),
                            "change": round(change, 2),
                            "change_percent": round(pct, 2),
                            "high": round(high, 2),
                            "low": round(low, 2),
                            "volume": vol,
                            "timestamp": item.get("regularMarketTime", int(now)),
                            "is_live": True
                        }
                        cls._quote_cache[sym] = q
                        quotes.append(q)
                    cls._quote_cache_time = now
        except Exception as e:
            logger.warning(f"Yahoo Finance quote fetch failed ({e}); falling back to simulated live quotes.")

        # If quotes empty (network failure or offline mode), provide high-fidelity fallback
        if not quotes:
            for s in target_symbols:
                base = BASELINE_PRICES.get(s, 24000.0)
                # Small deterministic micro-tick based on timestamp
                tick_offset = ((int(now) % 3600) / 3600.0 - 0.5) * (base * 0.008)
                cur_price = round(base + tick_offset, 2)
                change = round(tick_offset, 2)
                pct = round((change / base) * 100, 2)
                q = {
                    "symbol": s,
                    "name": SYMBOL_NAMES.get(s, s),
                    "price": cur_price,
                    "change": change,
                    "change_percent": pct,
                    "high": round(cur_price * 1.004, 2),
                    "low": round(cur_price * 0.996, 2),
                    "volume": int(1500000 + (int(now) % 1000) * 200),
                    "timestamp": int(now),
                    "is_live": False
                }
                cls._quote_cache[s] = q
                quotes.append(q)
            cls._quote_cache_time = now

        return quotes

    @classmethod
    async def get_candles(
        cls,
        symbol: str = "^NSEI",
        timeframe: str = "1m",
        range_param: str = "1d"
    ) -> Dict[str, Any]:
        """
        Fetches OHLCV candlestick series for interactive terminal charting.
        """
        cache_key = f"{symbol}_{timeframe}_{range_param}"
        now = time.time()

        if cache_key in cls._candles_cache:
            last_t = cls._candles_cache_time.get(cache_key, 0)
            if (now - last_t) < 30.0:  # 30-sec candle cache
                return cls._candles_cache[cache_key]

        interval_map = {"1m": "1m", "5m": "5m", "15m": "15m", "1D": "1d"}
        yf_interval = interval_map.get(timeframe, "1m")

        try:
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval={yf_interval}&range={range_param}"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    chart_res = data.get("chart", {}).get("result", [])
                    if chart_res:
                        item = chart_res[0]
                        timestamps = item.get("timestamp", [])
                        quote_data = item.get("indicators", {}).get("quote", [{}])[0]
                        opens = quote_data.get("open", [])
                        highs = quote_data.get("high", [])
                        lows = quote_data.get("low", [])
                        closes = quote_data.get("close", [])
                        volumes = quote_data.get("volume", [])

                        candles = []
                        for i in range(len(timestamps)):
                            if (
                                opens[i] is not None
                                and highs[i] is not None
                                and lows[i] is not None
                                and closes[i] is not None
                            ):
                                candles.append({
                                    "time": timestamps[i],
                                    "open": round(float(opens[i]), 2),
                                    "high": round(float(highs[i]), 2),
                                    "low": round(float(lows[i]), 2),
                                    "close": round(float(closes[i]), 2),
                                    "volume": int(volumes[i] or 0)
                                })

                        result = {
                            "symbol": symbol,
                            "timeframe": timeframe,
                            "is_live": True,
                            "candles": candles
                        }
                        cls._candles_cache[cache_key] = result
                        cls._candles_cache_time[cache_key] = now
                        return result
        except Exception as e:
            logger.warning(f"Yahoo Finance candle fetch failed for {symbol} ({e}); generating synthetic session.")

        # Fallback to realistic synthetic series anchored to instrument price
        base = BASELINE_PRICES.get(symbol, 24000.0)
        from app.services.replay_service import ReplayService
        synth_candles = ReplayService.generate_synthetic_session(
            symbol=symbol,
            base_price=base,
            bars=60 if timeframe == "1m" else 75,
            blind_mode=False
        )
        fallback_res = {
            "symbol": symbol,
            "timeframe": timeframe,
            "is_live": False,
            "candles": synth_candles
        }
        cls._candles_cache[cache_key] = fallback_res
        cls._candles_cache_time[cache_key] = now
        return fallback_res
