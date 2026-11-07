import random
import time
from typing import List, Dict, Any, Optional
import polars as pl
import numpy as np

# Catalog of institutional market event presets
HISTORICAL_PRESETS = {
    "COVID_CRASH_2020": {
        "id": "COVID_CRASH_2020",
        "name": "March 2020 Covid Crash & Circuit Breaker",
        "date_str": "23 March 2020",
        "instrument": "NIFTY_FUT",
        "base_price": 9800.0,
        "regime": "Extreme Panic & Volatility Spike (India VIX > 80)",
        "macro_driver": "Nationwide lockdown announced; global liquidity squeeze triggers 10% lower circuit breaker on open, followed by institutional capitulation and sharp short-squeeze intraday.",
        "trading_lesson": "Trading during high-IV circuit breaker regimes requires strictly reduced position size (0.5% risk) and avoiding knife-catching until multi-timeframe rejection confirms.",
        "drift": -0.00035,
        "volatility": 0.0035,
        "shock_type": "waterfall_crash"
    },
    "ELECTION_DAY_2024": {
        "id": "ELECTION_DAY_2024",
        "name": "June 2024 Lok Sabha Counting Day Shock",
        "date_str": "04 June 2024",
        "instrument": "NIFTY_FUT",
        "base_price": 23250.0,
        "regime": "Event-Risk High-IV Spike & Sharp V-Shape Reversal",
        "macro_driver": "Exit polls projected 400+ seats, but early counting trends showed coalition uncertainty. Nifty crashed 1,300 pts (-6%) in the morning before massive institutional value buying sparked a 600 pt recovery.",
        "trading_lesson": "Event-day implied volatility crush: buying expensive OTM options at open results in 90% theta/IV wipeout even if market rebounds.",
        "drift": -0.00015,
        "volatility": 0.0028,
        "shock_type": "v_shape_reversal"
    },
    "RBI_RATE_HIKE_2022": {
        "id": "RBI_RATE_HIKE_2022",
        "name": "RBI Surprise 40 bps Off-Cycle Repo Rate Hike",
        "date_str": "04 May 2022",
        "instrument": "BANKNIFTY_FUT",
        "base_price": 36150.0,
        "regime": "Flash Macro Disruption & Liquidity Shock",
        "macro_driver": "Governor Shaktikanta Das convened an unscheduled press conference at 14:00 IST to announce an emergency 40 bps repo rate hike to 4.40% to combat 7.8% CPI inflation, sending Bank Nifty into a 650-point tailspin.",
        "trading_lesson": "Macro press conferences demand flat risk posture or defensive delta-neutral spreads; stops get jumped by 40-50 points due to order book evacuation.",
        "drift": -0.0001,
        "volatility": 0.0018,
        "shock_type": "afternoon_flash_crash"
    },
    "ADANI_SHOCK_2023": {
        "id": "ADANI_SHOCK_2023",
        "name": "Adani Hindenburg Shockwave & Margin Unwind",
        "date_str": "27 Jan 2023",
        "instrument": "NIFTY_FUT",
        "base_price": 18100.0,
        "regime": "Idiosyncratic Contagion & Liquidity Evacuation",
        "macro_driver": "Short seller report sparks massive institutional block liquidations, margin calls across leveraged domestic accounts, and severe bid-ask widening in conglomerate counters.",
        "trading_lesson": "Respect momentum support breaks; when structural accounting or balance sheet fears emerge, mean-reversion systems fail repeatedly.",
        "drift": -0.0002,
        "volatility": 0.0022,
        "shock_type": "trending_breakdown"
    },
    "BUDGET_RALLY_2021": {
        "id": "BUDGET_RALLY_2021",
        "name": "Union Budget 2021 Capex Euphoria Rally",
        "date_str": "01 Feb 2021",
        "instrument": "NIFTY_FUT",
        "base_price": 13650.0,
        "regime": "One-Way Trend Day & Institutional Capex Squeeze",
        "macro_driver": "No new taxes and a 34.5% surge in capital expenditure targets triggered an unprecedented 650-point one-way trending intraday expansion, completely wiping out short gamma straddle sellers.",
        "trading_lesson": "Never counter-trend fade an institutional trend day; pyramid winning positions and trail stops below 15-minute swing lows.",
        "drift": 0.00045,
        "volatility": 0.0015,
        "shock_type": "one_way_rally"
    }
}

class ReplayService:
    """
    Polars-accelerated Market Replay and Blind Challenge Engine.
    Streams 1-minute OHLCV candles, masks metadata in Blind Mode, and simulates realistic market regimes.
    """

    @classmethod
    def get_preset_catalog(cls) -> List[Dict[str, Any]]:
        return list(HISTORICAL_PRESETS.values())

    @staticmethod
    def generate_synthetic_session(
        symbol: str = "NIFTY_FUT",
        preset_id: Optional[str] = None,
        base_price: float = 24500.0,
        bars: int = 375,  # 375 minutes in standard NSE trading session (09:15 - 15:30)
        volatility: float = 0.0012,
        blind_mode: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Generates realistic 1-minute OHLCV candles via geometric random walk with volume clusters
        and regime-specific shocks.
        """
        np.random.seed(int(time.time() * 1000) % 100000)
        preset = HISTORICAL_PRESETS.get(preset_id) if preset_id else None

        if preset:
            drift = preset["drift"]
            vol = preset["volatility"]
            base = preset["base_price"] if not blind_mode else 1000.0
            shock_type = preset["shock_type"]
        else:
            drift = 0.00002
            vol = volatility
            base = base_price if not blind_mode else 1000.0
            shock_type = "standard"

        shocks = np.random.normal(drift, vol, bars)

        # Apply realistic historical intraday dynamics based on scenario shock_type
        if shock_type == "waterfall_crash":
            # Steep morning plunge, followed by choppy bottoming
            shocks[0:60] -= 0.0008
            shocks[60:120] *= 2.5
            shocks[240:320] += 0.0004  # late short covering bounce
        elif shock_type == "v_shape_reversal":
            # 0 to 180 min aggressive selloff, then strong 180 to 375 min institutional rebound
            shocks[0:150] -= 0.0006
            shocks[150:200] *= 3.0
            shocks[200:375] += 0.00065
        elif shock_type == "afternoon_flash_crash":
            # Calm morning, sudden 14:00 shock (bar 285)
            shock_point = 285
            shocks[shock_point:shock_point + 30] -= 0.0022
            shocks[shock_point:shock_point + 30] *= 3.0
        elif shock_type == "trending_breakdown":
            # Consistent downward stair-stepping with failed bounces
            for b_idx in range(50, bars, 60):
                shocks[b_idx:b_idx + 15] -= 0.0009
        elif shock_type == "one_way_rally":
            # Strong relentless upward expansion with micro pullbacks
            shocks[15:100] += 0.0005
            shocks[120:250] += 0.0004
            shocks[250:375] += 0.0003

        close_prices = base * np.exp(np.cumsum(shocks))
        candles = []
        base_timestamp = 1730000000  # Unix timestamp baseline

        for i in range(bars):
            c = float(close_prices[i])
            spread = c * np.random.uniform(0.0005, 0.0022)

            o = float(close_prices[i - 1]) if i > 0 else c - (spread * 0.3)
            h = max(o, c) + (spread * np.random.uniform(0.2, 0.8))
            l = min(o, c) - (spread * np.random.uniform(0.2, 0.8))
            v = int(np.random.gamma(shape=2.5, scale=1200))

            # Volume spikes during rapid moves
            if abs(c - o) > (base * 0.0015):
                v *= 4

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

        sliced_df = df.slice(max(0, clipped_index - window_size), min(window_size, clipped_index))

        return {
            "visible_candles": sliced_df.to_dicts(),
            "current_bar": candles[clipped_index - 1],
            "total_bars": len(candles),
            "current_index": clipped_index,
            "has_more": clipped_index < len(candles)
        }
