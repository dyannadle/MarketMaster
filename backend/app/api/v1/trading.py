from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.api.v1.deps import get_current_user
from app.models.user import User
from app.models.order import Order
from app.models.position import Position
from app.models.execution import TradeExecution
from app.schemas.order import OrderCreate, OrderResponse, OrderExecutionResponse
from app.schemas.position import PositionResponse, PositionExitResponse
from app.services.matching_engine import MatchingEngine
from app.services.ledger_service import LedgerService

router = APIRouter()

@router.post("/orders", response_model=OrderExecutionResponse, status_code=status.HTTP_201_CREATED)
async def place_order(
    order_in: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits a trading order to the virtual matching engine with realistic power-law slippage,
    margin verification, and statutory tax calculations.
    """
    try:
        execution = await MatchingEngine.execute_order(
            db=db,
            user=current_user,
            order_in=order_in
        )
        await db.commit()
        return execution
    except ValueError as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Order execution error: {str(e)}")

@router.get("/orders", response_model=List[OrderResponse])
async def list_orders(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lists order history for the authenticated user."""
    stmt = select(Order).where(Order.user_id == current_user.id)
    if status:
        stmt = stmt.where(Order.status == status.upper())
    stmt = stmt.order_by(Order.created_at.desc()).limit(limit)
    res = await db.execute(stmt)
    orders = res.scalars().all()
    return [OrderResponse.model_validate(o) for o in orders]

@router.get("/positions", response_model=List[PositionResponse])
async def list_positions(
    is_open: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lists all open or closed positions for the authenticated user."""
    stmt = select(Position).where(Position.user_id == current_user.id)
    if is_open is not None:
        stmt = stmt.where(Position.is_open == is_open)
    stmt = stmt.order_by(Position.updated_at.desc())
    res = await db.execute(stmt)
    positions = res.scalars().all()
    return [PositionResponse.model_validate(p) for p in positions]

@router.post("/positions/{position_id}/exit", response_model=PositionExitResponse)
async def exit_position(
    position_id: str,
    exit_price: Optional[float] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Exits an open position at market price, releases margin, credits/debits realized P&L,
    and returns an automated post-mortem diagnostic assessment.
    """
    stmt = select(Position).where(
        and_(
            Position.id == position_id,
            Position.user_id == current_user.id,
            Position.is_open == True
        )
    )
    res = await db.execute(stmt)
    position = res.scalar_one_or_none()

    if not position:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Open position not found."
        )

    # Determine exit price with power-law slippage
    close_side = "SELL" if position.side == "LONG" else "BUY"
    ltp = exit_price or MatchingEngine.DEFAULT_LTP.get(position.symbol, 24500.0)
    actual_exit_price, slippage = MatchingEngine.calculate_power_law_slippage(
        quantity=position.quantity,
        symbol=position.symbol,
        side=close_side,
        ltp=ltp
    )

    # Realized PnL computation
    if position.side == "LONG":
        pnl = round((actual_exit_price - position.avg_entry_price) * position.quantity, 2)
    else:
        pnl = round((position.avg_entry_price - actual_exit_price) * position.quantity, 2)

    # Taxes on exit
    turnover = actual_exit_price * position.quantity
    taxes = MatchingEngine.calculate_statutory_deductions(turnover, close_side)
    margin_to_release = round(position.avg_entry_price * position.quantity * 0.10, 2)

    # Double-entry ledger updates
    await LedgerService.release_margin(db, current_user, margin_to_release, position.id)
    await LedgerService.record_pnl(db, current_user, pnl, position.id)
    await LedgerService.record_statutory_deductions(
        db=db,
        user=current_user,
        stt=taxes["stt_tax"],
        gst=taxes["gst_tax"],
        stamp_duty=taxes["stamp_duty"],
        exchange_charges=taxes["exchange_charges"],
        reference_id=f"EXIT_{position.id}"
    )

    # Mark position closed
    position.is_open = False
    position.realized_pnl += pnl
    position.unrealized_pnl = 0.0
    position.current_ltp = actual_exit_price
    position.updated_at = datetime.now(timezone.utc)

    # Automated Post-Mortem Diagnostics
    has_followed_plan = True
    tags = []
    if pnl < 0:
        if not position.stop_loss:
            tags.append("#NoStopLoss")
            has_followed_plan = False
            current_user.discipline_score = max(0, current_user.discipline_score - 10)
        else:
            tags.append("#ControlledRisk")
            current_user.discipline_score = min(100, current_user.discipline_score + 3)
    else:
        tags.append("#ProfitableExit")
        current_user.discipline_score = min(100, current_user.discipline_score + 5)
        current_user.xp_points += 50

    post_mortem = {
        "tags": tags,
        "pnl": pnl,
        "slippage_points": slippage,
        "followed_plan": has_followed_plan,
        "verdict": "Great discipline! Trade executed according to plan." if has_followed_plan else "Review risk parameters: entering without stop loss degrades long-term expectancy."
    }

    await db.commit()

    return PositionExitResponse(
        position_id=position.id,
        symbol=position.symbol,
        exit_price=actual_exit_price,
        realized_pnl=pnl,
        margin_released=margin_to_release,
        discipline_score=current_user.discipline_score,
        post_mortem=post_mortem
    )

@router.get("/ledger/audit")
async def verify_ledger(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    r"""
    On-demand Double-Entry Ledger Reconciliation Audit.
    Enforces that $\sum Debits - \sum Credits == BalanceAfter$.
    """
    is_valid = await LedgerService.verify_integrity(db, current_user.id)
    balance = await LedgerService.get_balance(db, current_user.id)
    return {
        "status": "HEALTHY" if is_valid else "CORRUPTED",
        "user_id": current_user.id,
        "audited_balance": balance,
        "reconciled": is_valid
    }

@router.get("/statement")
async def get_trading_statement(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates a SEBI-compliant itemized trade ledger statement with statutory deductions
    (STT, GST, Stamp Duty, Exchange Charges) and psychological mistake distribution.
    """
    # 1. Fetch trade executions
    exec_stmt = select(TradeExecution).where(TradeExecution.user_id == current_user.id).order_by(TradeExecution.executed_at.desc())
    exec_res = await db.execute(exec_stmt)
    executions = exec_res.scalars().all()

    # 2. Fetch positions for realized P&L and behavioral stats
    pos_stmt = select(Position).where(Position.user_id == current_user.id).order_by(Position.updated_at.desc())
    pos_res = await db.execute(pos_stmt)
    positions = pos_res.scalars().all()

    items = []
    total_turnover = 0.0
    total_stt = 0.0
    total_stamp = 0.0
    total_exchange = 0.0
    total_gst = 0.0
    total_realized_pnl = 0.0

    # Mistake distribution tracking
    mistake_counts = {
        "#NoStopLoss": 0,
        "#RevengeRisk": 0,
        "#Overleveraged": 0,
        "#CutWinnerEarly": 0,
        "#ControlledRisk": 0,
        "#ProfitableExit": 0
    }

    for pos in positions:
        total_realized_pnl += pos.realized_pnl
        if not pos.stop_loss:
            mistake_counts["#NoStopLoss"] += 1
        if pos.realized_pnl > 0:
            mistake_counts["#ProfitableExit"] += 1
        else:
            mistake_counts["#ControlledRisk"] += 1

    for e in executions:
        turnover = round(e.fill_price * e.fill_quantity, 2)
        total_charges = round(e.stt_tax + e.stamp_duty + e.exchange_charges + e.gst_tax, 2)
        
        total_turnover += turnover
        total_stt += e.stt_tax
        total_stamp += e.stamp_duty
        total_exchange += e.exchange_charges
        total_gst += e.gst_tax

        items.append({
            "id": e.id,
            "order_id": e.order_id,
            "timestamp": int(e.executed_at.timestamp()),
            "datetime_iso": e.executed_at.isoformat(),
            "symbol": e.symbol,
            "side": e.side,
            "quantity": e.fill_quantity,
            "fill_price": e.fill_price,
            "turnover": turnover,
            "stt": round(e.stt_tax, 2),
            "stamp_duty": round(e.stamp_duty, 2),
            "exchange_charges": round(e.exchange_charges, 2),
            "gst": round(e.gst_tax, 2),
            "total_charges": total_charges,
            "slippage": e.slippage,
            "net_amount": round(turnover + total_charges if e.side == "BUY" else turnover - total_charges, 2)
        })

    # Calculate mistake distribution percentages
    total_evaluated = sum(mistake_counts.values()) or 1
    mistake_distribution = [
        {
            "tag": tag,
            "count": count,
            "percentage": round((count / total_evaluated) * 100, 1),
            "severity": "CRITICAL" if tag in ["#NoStopLoss", "#RevengeRisk", "#Overleveraged"] else "HEALTHY"
        }
        for tag, count in mistake_counts.items()
    ]

    return {
        "account": {
            "user_id": current_user.id,
            "display_name": current_user.display_name,
            "email": current_user.email,
            "virtual_equity": current_user.virtual_equity,
            "discipline_score": current_user.discipline_score,
            "statement_date": datetime.now(timezone.utc).strftime("%d-%b-%Y")
        },
        "financial_summary": {
            "total_trades": len(items),
            "total_turnover": round(total_turnover, 2),
            "total_stt": round(total_stt, 2),
            "total_stamp_duty": round(total_stamp, 2),
            "total_exchange_charges": round(total_exchange, 2),
            "total_gst": round(total_gst, 2),
            "total_statutory_charges": round(total_stt + total_stamp + total_exchange + total_gst, 2),
            "gross_realized_pnl": round(total_realized_pnl, 2),
            "net_realized_pnl": round(total_realized_pnl - (total_stt + total_stamp + total_exchange + total_gst), 2)
        },
        "mistake_distribution": mistake_distribution,
        "trades": items
    }

