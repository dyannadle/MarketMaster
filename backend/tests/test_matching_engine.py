import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.schemas.order import OrderCreate
from app.services.matching_engine import MatchingEngine

def test_power_law_slippage_scaling():
    """Verify slippage increases with order quantity."""
    ltp = 24500.0
    symbol = "NIFTY_FUT"

    # Small order (50 qty = 1 lot)
    fill_small, slip_small = MatchingEngine.calculate_power_law_slippage(50, symbol, "BUY", ltp)
    # Large order (2500 qty = 50 lots)
    fill_large, slip_large = MatchingEngine.calculate_power_law_slippage(2500, symbol, "BUY", ltp)

    assert slip_large > slip_small
    assert fill_large > fill_small
    assert fill_small > ltp

def test_statutory_deductions_calculation():
    """Verify STT applied on SELL side and Stamp Duty on BUY side."""
    buy_taxes = MatchingEngine.calculate_statutory_deductions(1_000_000.0, "BUY")
    assert buy_taxes["stt_tax"] == 0.0
    assert buy_taxes["stamp_duty"] > 0.0
    assert buy_taxes["gst_tax"] > 0.0

    sell_taxes = MatchingEngine.calculate_statutory_deductions(1_000_000.0, "SELL")
    assert sell_taxes["stt_tax"] > 0.0
    assert sell_taxes["stamp_duty"] == 0.0
    assert sell_taxes["exchange_charges"] > 0.0

@pytest.mark.asyncio
async def test_order_execution_and_discipline_update(db_session: AsyncSession, seed_user: User):
    """Verify order execution, margin locking, position creation, and discipline scoring."""
    initial_discipline = seed_user.discipline_score

    order_in = OrderCreate(
        symbol="NIFTY_FUT",
        side="BUY",
        order_type="MARKET",
        quantity=50,
        stop_loss=24400.0,
        target_price=24700.0
    )

    result = await MatchingEngine.execute_order(
        db=db_session,
        user=seed_user,
        order_in=order_in,
        current_ltp=24500.0
    )

    assert result.order.status == "FILLED"
    assert result.fill_price >= 24500.0
    assert result.margin_locked > 0.0
    # Stop-loss was provided -> user rewarded +2 discipline points
    assert seed_user.discipline_score == initial_discipline + 2
    assert seed_user.reserved_margin > 0.0

