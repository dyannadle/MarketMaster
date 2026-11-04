from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class BlackScholesRequest(BaseModel):
    spot_price: float = Field(..., gt=0, example=24500.0)
    strike_price: float = Field(..., gt=0, example=24500.0)
    time_to_expiry_days: float = Field(..., gt=0, example=7.0)
    volatility: float = Field(..., gt=0, le=5.0, example=0.15)
    risk_free_rate: float = Field(default=0.065, ge=0, example=0.065)  # 6.5% RBI repo rate proxy

class GreeksResponse(BaseModel):
    delta: float
    gamma: float
    theta: float
    vega: float
    rho: float

class BlackScholesResponse(BaseModel):
    call_price: float
    put_price: float
    call_greeks: GreeksResponse
    put_greeks: GreeksResponse
    intrinsic_value_call: float
    time_value_call: float

class BacktestRequest(BaseModel):
    strategy_name: str = "Dual_EMA_Crossover"
    symbol: str = "NIFTY_FUT"
    fast_period: int = 9
    slow_period: int = 21
    atr_stop_multiplier: float = 1.5
    risk_per_trade: float = 0.01

class BacktestResponse(BaseModel):
    strategy_name: str
    total_bars: int
    total_trades: int
    win_rate_percent: float
    profit_factor: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown_percent: float
    net_pnl: float
    equity_curve: List[float]
    slippage_savings: float
