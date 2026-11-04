import math
import numpy as np
import pytest
from app.schemas.quant import BlackScholesRequest, BacktestRequest
from app.services.quant_engine import QuantEngine

def test_black_scholes_at_the_money():
    """Verify ATM Call and Put pricing consistency."""
    req = BlackScholesRequest(
        spot_price=24500.0,
        strike_price=24500.0,
        time_to_expiry_days=7.0,
        volatility=0.15,
        risk_free_rate=0.065
    )
    res = QuantEngine.calculate_black_scholes(req)

    assert res.call_price > 0.0
    assert res.put_price > 0.0
    
    # Delta bounds
    assert 0.4 < res.call_greeks.delta < 0.6
    assert -0.6 < res.put_greeks.delta < -0.4

    # Gamma must be positive and equal
    assert res.call_greeks.gamma > 0.0
    assert res.call_greeks.gamma == res.put_greeks.gamma

    # Vega must be positive
    assert res.call_greeks.vega > 0.0

    # Theta should be negative for buyers (time decay)
    assert res.call_greeks.theta < 0.0
    assert res.put_greeks.theta < 0.0

def test_put_call_parity():
    """
    Validates analytical Put-Call Parity:
    Call - Put = Spot - Strike * exp(-r * T)
    """
    req = BlackScholesRequest(
        spot_price=25000.0,
        strike_price=24800.0,
        time_to_expiry_days=30.0,
        volatility=0.18,
        risk_free_rate=0.065
    )
    res = QuantEngine.calculate_black_scholes(req)

    T = 30.0 / 365.0
    r = 0.065
    lhs = res.call_price - res.put_price
    rhs = 25000.0 - (24800.0 * math.exp(-r * T))

    assert abs(lhs - rhs) < 0.5  # Bounded rounding delta

def test_vectorized_dual_ema_backtest():
    """Verify backtesting engine returns valid performance indicators."""
    req = BacktestRequest(
        strategy_name="Dual_EMA_9_21",
        symbol="NIFTY_FUT",
        fast_period=9,
        slow_period=21,
        atr_stop_multiplier=1.5,
        risk_per_trade=0.01
    )
    res = QuantEngine.run_vectorized_backtest(req)

    assert res.total_bars >= 100
    assert res.total_trades > 0
    assert 0.0 <= res.win_rate_percent <= 100.0
    assert res.profit_factor >= 0.0
    assert len(res.equity_curve) > 5
    assert isinstance(res.sharpe_ratio, float)
    assert isinstance(res.sortino_ratio, float)
