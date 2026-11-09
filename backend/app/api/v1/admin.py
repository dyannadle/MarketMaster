from typing import List, Dict, Any
from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.api.v1.deps import require_admin
from app.models.user import User
from app.models.order import Order
from app.models.position import Position
from app.models.ledger import CashLedger

router = APIRouter()

# Global RMS Emergency Kill-Switch State
_RMS_KILL_SWITCH_ACTIVE = False

class AdjustBalanceRequest(BaseModel):
    new_equity: float = Field(..., gt=0, description="New virtual equity in INR")
    reason: str = Field(..., min_length=3, max_length=200, description="Reason for ledger balance adjustment")

class AdminUserView(BaseModel):
    id: str
    name: str
    email: str
    role: str
    virtualEquity: float
    disciplineScore: int
    status: str
    joinedDate: str

@router.get("/users", response_model=List[AdminUserView])
async def list_users(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Returns registered users across the platform.
    Protected by server-side Rule 4.1 RBAC.
    """
    stmt = select(User).order_by(User.created_at.desc())
    res = await db.execute(stmt)
    users = res.scalars().all()

    output = []
    for u in users:
        output.append(AdminUserView(
            id=u.id,
            name=u.display_name,
            email=u.email,
            role=u.role.lower(),
            virtualEquity=u.virtual_equity,
            disciplineScore=u.discipline_score,
            status="Active" if u.discipline_score >= 70 else "Cool-Down",
            joinedDate=u.created_at.strftime("%Y-%m-%d") if u.created_at else "2026-11-01"
        ))
    return output

@router.post("/users/{user_id}/adjust-balance")
async def adjust_user_balance(
    user_id: str,
    payload: AdjustBalanceRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Adjusts user equity with a double-entry ledger audit record.
    """
    stmt = select(User).where(User.id == user_id)
    res = await db.execute(stmt)
    target_user = res.scalar_one_or_none()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found."
        )

    old_equity = target_user.virtual_equity
    delta = payload.new_equity - old_equity
    target_user.virtual_equity = payload.new_equity

    # Record double-entry ledger adjustment
    ledger_entry = CashLedger(
        id=str(uuid.uuid4()),
        user_id=target_user.id,
        transaction_type="ADMIN_ADJUSTMENT",
        debit_amount=abs(delta) if delta < 0 else 0.0,
        credit_amount=delta if delta > 0 else 0.0,
        balance_after=payload.new_equity,
        description=f"Admin balance adjustment by {admin.email}: {payload.reason}",
        reference_id=admin.id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(ledger_entry)
    await db.commit()
    await db.refresh(target_user)

    return {
        "status": "SUCCESS",
        "user_id": target_user.id,
        "old_equity": old_equity,
        "new_equity": target_user.virtual_equity,
        "adjusted_by": admin.email
    }

@router.get("/system-stats")
async def get_system_stats(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Real-time platform aggregate telemetry for the RMS Admin Dashboard.
    """
    # Total virtual capital
    equity_stmt = select(func.sum(User.virtual_equity))
    equity_res = await db.execute(equity_stmt)
    total_capital = equity_res.scalar_one_or_none() or 0.0

    # User count & avg discipline
    user_stmt = select(func.count(User.id), func.avg(User.discipline_score))
    user_res = await db.execute(user_stmt)
    user_count, avg_discipline = user_res.one_or_none() or (0, 95.0)

    # Order count
    order_stmt = select(func.count(Order.id))
    order_res = await db.execute(order_stmt)
    total_orders = order_res.scalar_one_or_none() or 0

    return {
        "total_capital_managed": round(total_capital, 2),
        "total_users": user_count,
        "average_discipline": round(avg_discipline or 95.0, 1),
        "total_orders_matched": total_orders,
        "rms_kill_switch_active": _RMS_KILL_SWITCH_ACTIVE,
        "matching_engine_status": "HALTED" if _RMS_KILL_SWITCH_ACTIVE else "ONLINE",
        "market_feed_provider": "Yahoo Finance (10s In-Memory TTL)"
    }

@router.post("/rms-kill-switch")
async def toggle_rms_kill_switch(
    active: bool,
    admin: User = Depends(require_admin)
):
    """
    Emergency RMS Platform Kill-Switch: halts order matching across platform.
    """
    global _RMS_KILL_SWITCH_ACTIVE
    _RMS_KILL_SWITCH_ACTIVE = active
    return {
        "status": "SUCCESS",
        "rms_kill_switch_active": _RMS_KILL_SWITCH_ACTIVE,
        "triggered_by": admin.email,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
