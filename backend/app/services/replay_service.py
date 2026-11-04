import random
import time
from typing import List, Dict, Any, Optional
import polars as pl
import numpy as np

class ReplayService:
    """
    Polars-accelerated Market Replay and Blind Challenge Engine.
    Streams 1-minute OHLCV candles, masks metadata in Blind Mode, and simulates realistic market regimes.
    """

    @staticmethod
    def generate_synthetic_session(
        symbol: str = "NIFTY_FUT",
        base_price: float = 24500.0,
        bars: int = 375,  # 375 minutes in standard NSE trading session (09:15 - 15:30)
        volatility: float = 0.0012,
        blind_mode: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Generates realistic 1-minute OHLCV candles via geometric random walk with volume clusters.
        """
        np.random.seed(int(time.time() * 1000) % 100000)
        
        # Microstructure drift + shocks
        drift = 0.00002
        shocks = np.random.normal(drift, volatility, bars)
        
        # Inject occasional volume/volatility spike (news catalyst)
        spike_indices = np.random.choice(bars, size=max(1, bars // 80), replace=False)
        shocks[spike_indices] *= 3.5

        close_prices = base_price * np.exp(np.cumsum(shocks))
        
        candles = []
        base_timestamp = 1730000000  # Unix timestamp baseline

        for i in range(bars):
            c = float(close_prices[i])
            spread = c * np.random.uniform(0.0005, 0.0025)
            
            o = float(close_prices[i - 1]) if i > 0 else c - (spread * 0.3)
            h = max(o, c) + (spread * np.random.uniform(0.2, 0.8))
            l = min(o, c) - (spread * np.random.uniform(0.2, 0.8))
            v = int(np.random.gamma(shape=2.5, scale=1200))
            if i in spike_indices:
                v *= 5

            candle = {
                "time": base_timestamp + (i * 60) if not blind_mode else i + 1,
                "open": round(o, 2),
                "high": round(h, 2),
                "low": round(l, 2),
                "close": round(c, 2),
                "volume": v
            }
            candles.append(candle)

        return candles

    @staticmethod
    def slice_replay_window(
        candles: List[Dict[str, Any]],
        current_index: int,
        window_size: int = 60
    ) -> Dict[str, Any]:
        """
        Uses Polars to efficiently slice visible candles up to current_index without future-leak bias.
        """
        if not candles:
            return {"visible_candles": [], "has_more": False}

        df = pl.DataFrame(candles)
        clipped_index = min(max(current_index, 1), len(candles))
        
        # Slice up to current bar
        sliced_df = df.slice(max(0, clipped_index - window_size), min(window_size, clipped_index))
        
        return {
            "visible_candles": sliced_df.to_dicts(),
            "current_bar": candles[clipped_index - 1],
            "total_bars": len(candles),
            "current_index": clipped_index,
            "has_more": clipped_index < len(candles)
        }
