import uuid
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.ledger import CashLedger
from app.models.user import User

class DoubleEntryAccountingError(Exception):
    """Raised when double-entry financial integrity is violated."""
    pass

class LedgerService:
    @staticmethod
    async def get_balance(db: AsyncSession, user_id: str) -> float:
        """Calculate live cash balance from cumulative ledger debits and credits."""
        stmt = select(
            func.coalesce(func.sum(CashLedger.credit_amount), 0.0) -
            func.coalesce(func.sum(CashLedger.debit_amount), 0.0)
        ).where(CashLedger.user_id == user_id)
        result = await db.execute(stmt)
        return float(result.scalar() or 0.0)

    @staticmethod
    async def record_entry(
        db: AsyncSession,
        user_id: str,
        transaction_type: str,
        debit: float = 0.0,
        credit: float = 0.0,
        description: str = "",
        reference_id: Optional[str] = None
    ) -> CashLedger:
        """
        Record an immutable double-entry ledger entry.
        Strict Invariant: Exactly one of debit or credit must be positive (or both 0 for neutral annotations).
        """
        current_balance = await LedgerService.get_balance(db, user_id)
        new_balance = current_balance + credit - debit

        entry = CashLedger(
            id=str(uuid.uuid4()),
            user_id=user_id,
            transaction_type=transaction_type,
            debit_amount=round(float(debit), 4),
            credit_amount=round(float(credit), 4),
            balance_after=round(float(new_balance), 4),
            description=description,
            reference_id=reference_id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(entry)
        await db.flush()
        return entry

    @staticmethod
    async def deposit_initial_capital(
        db: AsyncSession,
        user: User,
        amount: float = 1_000_000.0
    ) -> CashLedger:
        """Credit initial virtual trading capital into user ledger."""
        entry = await LedgerService.record_entry(
            db=db,
            user_id=user.id,
            transaction_type="INITIAL_DEPOSIT",
            debit=0.0,
            credit=amount,
            description="Initial virtual capital allocation for paper trading",
            reference_id="GENESIS_DEPOSIT"
        )
        user.virtual_equity = amount
        user.reserved_margin = 0.0
        await db.flush()
        return entry

    @staticmethod
    async def lock_margin(
        db: AsyncSession,
        user: User,
        amount: float,
        order_id: str
    ) -> CashLedger:
        """Lock collateral margin when an order or position is initiated."""
        available_cash = user.virtual_equity - user.reserved_margin
        if available_cash < amount:
            raise ValueError(f"Insufficient funds: Available ₹{available_cash:,.2f} < Required ₹{amount:,.2f}")

        user.reserved_margin += amount
        entry = await LedgerService.record_entry(
            db=db,
            user_id=user.id,
            transaction_type="MARGIN_LOCK",
            debit=amount,
            credit=0.0,
            description=f"Collateral locked for order execution",
            reference_id=order_id
        )
        await db.flush()
        return entry

    @staticmethod
    async def release_margin(
        db: AsyncSession,
        user: User,
        amount: float,
        position_id: str
    ) -> CashLedger:
        """Release collateral margin upon position closure."""
        released = min(user.reserved_margin, amount)
        user.reserved_margin = max(0.0, user.reserved_margin - released)

        entry = await LedgerService.record_entry(
            db=db,
            user_id=user.id,
            transaction_type="MARGIN_RELEASE",
            debit=0.0,
            credit=released,
            description=f"Collateral released from position closure",
            reference_id=position_id
        )
        await db.flush()
        return entry

    @staticmethod
    async def record_pnl(
        db: AsyncSession,
        user: User,
        realized_pnl: float,
        position_id: str
    ) -> CashLedger:
        """Record realized profit or loss from closed position."""
        user.virtual_equity += realized_pnl
        if realized_pnl >= 0:
            entry = await LedgerService.record_entry(
                db=db,
                user_id=user.id,
                transaction_type="REALIZED_PROFIT",
                debit=0.0,
                credit=realized_pnl,
                description=f"Realized gain on position {position_id[:8]}",
                reference_id=position_id
            )
        else:
            entry = await LedgerService.record_entry(
                db=db,
                user_id=user.id,
                transaction_type="REALIZED_LOSS",
                debit=abs(realized_pnl),
                credit=0.0,
                description=f"Realized loss on position {position_id[:8]}",
                reference_id=position_id
            )
        await db.flush()
        return entry

    @staticmethod
    async def record_statutory_deductions(
        db: AsyncSession,
        user: User,
        stt: float,
        gst: float,
        stamp_duty: float,
        exchange_charges: float,
        reference_id: str
    ) -> float:
        """Deduct realistic Indian regulatory taxes and exchange transaction charges."""
        total_taxes = round(stt + gst + stamp_duty + exchange_charges, 4)
        if total_taxes > 0:
            user.virtual_equity -= total_taxes
            await LedgerService.record_entry(
                db=db,
                user_id=user.id,
                transaction_type="STATUTORY_TAXES",
                debit=total_taxes,
                credit=0.0,
                description=f"Regulatory STT(₹{stt:.2f}) GST(₹{gst:.2f}) Stamp(₹{stamp_duty:.2f}) Exch(₹{exchange_charges:.2f})",
                reference_id=reference_id
            )
            await db.flush()
        return total_taxes

    @staticmethod
    async def verify_integrity(db: AsyncSession, user_id: str) -> bool:
        """
        Double-Entry Audit Invariant:
        Sum of all credits minus sum of all debits must match the last recorded balance_after.
        """
        stmt_sum = select(
            func.coalesce(func.sum(CashLedger.credit_amount), 0.0),
            func.coalesce(func.sum(CashLedger.debit_amount), 0.0)
        ).where(CashLedger.user_id == user_id)
        res_sum = await db.execute(stmt_sum)
        total_credit, total_debit = res_sum.one()

        calculated_balance = round(float(total_credit) - float(total_debit), 4)

        stmt_last = select(CashLedger.balance_after)\
            .where(CashLedger.user_id == user_id)\
            .order_by(CashLedger.created_at.desc(), CashLedger.id.desc())\
            .limit(1)
        res_last = await db.execute(stmt_last)
        last_balance = res_last.scalar()

        if last_balance is not None and abs(calculated_balance - round(float(last_balance), 4)) > 1e-4:
            raise DoubleEntryAccountingError(
                f"Ledger reconciliation failed: Sum diff={calculated_balance} vs Audit trail={last_balance}"
            )
        return True
