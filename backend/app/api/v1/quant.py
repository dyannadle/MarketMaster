from fastapi import APIRouter, HTTPException, status
from app.schemas.quant import (
    BlackScholesRequest,
    BlackScholesResponse,
    BacktestRequest,
    BacktestResponse,
    MarginReliefRequest,
    MarginReliefResponse
)
from app.services.quant_engine import QuantEngine

router = APIRouter()

@router.post("/black-scholes", response_model=BlackScholesResponse)
async def compute_black_scholes(request: BlackScholesRequest):
    """
    Computes analytical European Call & Put option prices along with
    Delta, Gamma, Vega, Theta, and Rho Greeks using SciPy/NumPy.
    """
    try:
        return QuantEngine.calculate_black_scholes(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quant valuation error: {str(e)}"
        )

@router.post("/margin", response_model=MarginReliefResponse)
async def calculate_portfolio_margin(request: MarginReliefRequest):
    """
    Computes SEBI portfolio margin requirements and capital savings for multi-leg option strategies.
    """
    try:
        return QuantEngine.calculate_margin(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Margin calculation error: {str(e)}"
        )

@router.post("/backtest", response_model=BacktestResponse)
async def run_backtest(request: BacktestRequest):
    """
    Executes a vectorized Dual-EMA algorithmic trading backtest with
    Sharpe/Sortino calculation, maximum drawdown, and equity curves.
    """
    try:
        return QuantEngine.run_vectorized_backtest(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Backtest error: {str(e)}"
        )

