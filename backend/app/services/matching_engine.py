import uuid
import math
from typing import Tuple, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.order import Order
from app.models.position import Position
from app.models.execution import TradeExecution
from app.models.user import User
from app.schemas.order import OrderCreate, OrderResponse, OrderExecutionResponse
from app.services.ledger_service import LedgerService

class MatchingEngine:
    """
    Virtual Institutional Order Matching Engine with power-law slippage,
    realistic NSE statutory taxes, and behavioral discipline telemetry.
    """

    # Reference market parameters
    BASE_DEPTH = {
        "NIFTY_FUT": 5000.0,
        "BANKNIFTY_FUT": 3000.0,
        "FINNIFTY_FUT": 2000.0,
        "ASSET_X": 1500.0,
    }

    DEFAULT_LTP = {
        "NIFTY_FUT": 24500.0,
        "BANKNIFTY_FUT": 52100.0,
        "FINNIFTY_FUT": 23400.0,
        "ASSET_X": 1000.0,
    }

    @classmethod
    def calculate_power_law_slippage(
        cls,
        quantity: int,
        symbol: str,
        side: str,
        ltp: float,
        k: float = 0.0005,
        alpha: float = 0.6
    ) -> Tuple[float, float]:
        """
        Calculates non-linear market impact slippage:
        slippage_fraction = k * (quantity / depth)^alpha
        Returns (executed_price, slippage_points)
        """
        depth = cls.BASE_DEPTH.get(symbol, 2500.0)
        ratio = max(quantity / depth, 0.001)
        slippage_pct = k * math.pow(ratio, alpha)
        slippage_pts = round(ltp * slippage_pct, 2)

        # Slippage hurts the trader: BUY pays more, SELL receives less
        if side.upper() == "BUY":
            fill_price = round(ltp + slippage_pts, 2)
        else:
            fill_price = round(ltp - slippage_pts, 2)

        return fill_price, slippage_pts

    @classmethod
    def calculate_statutory_deductions(
        cls,
        turnover: float,
        side: str
    ) -> Dict[str, float]:
        """
        NSE India statutory schedule:
        - STT: 0.0125% on futures sell turnover, or 0.0625% on options
        - Exchange charges: 0.00325%
        - GST: 18% on exchange transaction fees
        - Stamp Duty: 0.002% on BUY side turnover
        """
        stt = round(turnover * 0.000125, 2) if side.upper() == "SELL" else 0.0
        exchange_charges = round(turnover * 0.0000325, 2)
        gst = round(exchange_charges * 0.18, 2)
        stamp_duty = round(turnover * 0.00002, 2) if side.upper() == "BUY" else 0.0

        return {
            "stt_tax": stt,
            "exchange_charges": exchange_charges,
            "gst_tax": gst,
            "stamp_duty": stamp_duty,
            "total_deductions": round(stt + exchange_charges + gst + stamp_duty, 2)
        }

    @classmethod
    async def execute_order(
        cls,
        db: AsyncSession,
        user: User,
        order_in: OrderCreate,
        current_ltp: Optional[float] = None
    ) -> OrderExecutionResponse:
        """
        Execute an order end-to-end:
        1. Validate margin requirements
        2. Calculate power-law slippage & statutory taxes
        3. Persist Order and TradeExecution records
        4. Mutate User margin & position records
        5. Update Discipline Score based on risk parameters
        """
        ltp = current_ltp or cls.DEFAULT_LTP.get(order_in.symbol, 24500.0)
        
        # Calculate execution fill price
        fill_price, slippage = cls.calculate_power_law_slippage(
            quantity=order_in.quantity,
            symbol=order_in.symbol,
            side=order_in.side,
            ltp=ltp
        )

        turnover = round(fill_price * order_in.quantity, 2)
        taxes = cls.calculate_statutory_deductions(turnover, order_in.side)
        
        # Margin requirement (10% standard intraday futures margin)
        required_margin = round(turnover * 0.10, 2)
        available_funds = user.virtual_equity - user.reserved_margin

        if available_funds < (required_margin + taxes["total_deductions"]):
            raise ValueError(
                f"Insufficient Margin: Available ₹{available_funds:,.2f} < Required ₹{required_margin + taxes['total_deductions']:,.2f}"
            )

        # 1. Create Order DB Record
        order_id = str(uuid.uuid4())
        order_record = Order(
            id=order_id,
            user_id=user.id,
            symbol=order_in.symbol,
            side=order_in.side.upper(),
            order_type=order_in.order_type.upper(),
            quantity=order_in.quantity,
            limit_price=order_in.limit_price,
            stop_loss=order_in.stop_loss,
            target_price=order_in.target_price,
            status="FILLED",
            filled_quantity=order_in.quantity,
            avg_fill_price=fill_price,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        db.add(order_record)

        # 2. Lock Margin & Deduct Taxes via Double-Entry Ledger
        await LedgerService.lock_margin(db, user, required_margin, order_id)
        await LedgerService.record_statutory_deductions(
            db=db,
            user=user,
            stt=taxes["stt_tax"],
            gst=taxes["gst_tax"],
            stamp_duty=taxes["stamp_duty"],
            exchange_charges=taxes["exchange_charges"],
            reference_id=order_id
        )

        # 3. Create Trade Execution DB Record
        exec_id = str(uuid.uuid4())
        execution_record = TradeExecution(
            id=exec_id,
            order_id=order_id,
            user_id=user.id,
            symbol=order_in.symbol,
            side=order_in.side.upper(),
            fill_price=fill_price,
            fill_quantity=order_in.quantity,
            slippage=slippage,
            stt_tax=taxes["stt_tax"],
            gst_tax=taxes["gst_tax"],
            stamp_duty=taxes["stamp_duty"],
            exchange_charges=taxes["exchange_charges"],
            executed_at=datetime.now(timezone.utc)
        )
        db.add(execution_record)

        # 4. Update / Create Open Position
        stmt = select(Position).where(
            and_(
                Position.user_id == user.id,
                Position.symbol == order_in.symbol,
                Position.is_open == True
            )
        )
        res = await db.execute(stmt)
        existing_pos = res.scalar_one_or_none()

        order_side = order_in.side.upper()
        if existing_pos is None:
            # New position
            pos_side = "LONG" if order_side == "BUY" else "SHORT"
            new_position = Position(
                id=str(uuid.uuid4()),
                user_id=user.id,
                symbol=order_in.symbol,
                side=pos_side,
                quantity=order_in.quantity,
                avg_entry_price=fill_price,
                current_ltp=fill_price,
                unrealized_pnl=0.0,
                realized_pnl=0.0,
                stop_loss=order_in.stop_loss,
                trailing_tp=order_in.target_price,
                is_open=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )
            db.add(new_position)
        else:
            # Modifying existing position (scaling or closing partially)
            is_same_direction = (existing_pos.side == "LONG" and order_side == "BUY") or \
                                (existing_pos.side == "SHORT" and order_side == "SELL")
            
            if is_same_direction:
                # Scale in: compute weighted average entry price
                total_qty = existing_pos.quantity + order_in.quantity
                weighted_avg = ((existing_pos.avg_entry_price * existing_pos.quantity) + (fill_price * order_in.quantity)) / total_qty
                existing_pos.avg_entry_price = round(weighted_avg, 2)
                existing_pos.quantity = total_qty
                if order_in.stop_loss:
                    existing_pos.stop_loss = order_in.stop_loss
                if order_in.target_price:
                    existing_pos.trailing_tp = order_in.target_price
            else:
                # Opposite side: netting / partial exit
                if order_in.quantity >= existing_pos.quantity:
                    # Full close
                    pnl = (fill_price - existing_pos.avg_entry_price) * existing_pos.quantity if existing_pos.side == "LONG" else \
                          (existing_pos.avg_entry_price - fill_price) * existing_pos.quantity
                    existing_pos.realized_pnl += pnl
                    existing_pos.unrealized_pnl = 0.0
                    existing_pos.is_open = False
                    await LedgerService.release_margin(db, user, required_margin, existing_pos.id)
                    await LedgerService.record_pnl(db, user, pnl, existing_pos.id)
                else:
                    # Partial close
                    pnl = (fill_price - existing_pos.avg_entry_price) * order_in.quantity if existing_pos.side == "LONG" else \
                          (existing_pos.avg_entry_price - fill_price) * order_in.quantity
                    existing_pos.realized_pnl += pnl
                    existing_pos.quantity -= order_in.quantity
                    await LedgerService.record_pnl(db, user, pnl, existing_pos.id)

            existing_pos.updated_at = datetime.now(timezone.utc)

        # 5. Discipline Index Updates
        if not order_in.stop_loss:
            user.discipline_score = max(0, user.discipline_score - 5)
        else:
            user.discipline_score = min(100, user.discipline_score + 2)

        user.xp_points += 25
        await db.flush()

        order_resp = OrderResponse.model_validate(order_record)
        return OrderExecutionResponse(
            order=order_resp,
            fill_price=fill_price,
            slippage=slippage,
            stt_tax=taxes["stt_tax"],
            gst_tax=taxes["gst_tax"],
            stamp_duty=taxes["stamp_duty"],
            exchange_charges=taxes["exchange_charges"],
            margin_locked=required_margin,
            discipline_score=user.discipline_score
        )

