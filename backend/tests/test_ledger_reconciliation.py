import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.services.ledger_service import LedgerService, DoubleEntryAccountingError

@pytest.mark.asyncio
async def test_initial_deposit_and_audit(db_session: AsyncSession, seed_user: User):
    """Verify initial deposit balances and audit integrity."""
    balance = await LedgerService.get_balance(db_session, seed_user.id)
    assert balance == 1_000_000.0
    assert await LedgerService.verify_integrity(db_session, seed_user.id) is True

@pytest.mark.asyncio
async def test_margin_lock_and_release(db_session: AsyncSession, seed_user: User):
    """Verify margin locking debit and release credit."""
    # Lock ₹1,50,000 margin
    await LedgerService.lock_margin(db_session, seed_user, amount=150_000.0, order_id="ORD_001")
    assert seed_user.reserved_margin == 150_000.0

    # Release margin
    await LedgerService.release_margin(db_session, seed_user, amount=150_000.0, position_id="POS_001")
    assert seed_user.reserved_margin == 0.0

    # Verify double-entry integrity
    assert await LedgerService.verify_integrity(db_session, seed_user.id) is True

@pytest.mark.asyncio
async def test_realized_pnl_and_tax_accounting(db_session: AsyncSession, seed_user: User):
    """Verify PnL crediting and statutory tax deductions."""
    initial_balance = await LedgerService.get_balance(db_session, seed_user.id)

    # Record profit of ₹25,000
    await LedgerService.record_pnl(db_session, seed_user, realized_pnl=25_000.0, position_id="POS_001")
    
    # Record statutory tax deduction of ₹150.50
    await LedgerService.record_statutory_deductions(
        db=db_session,
        user=seed_user,
        stt=100.0,
        gst=25.5,
        stamp_duty=10.0,
        exchange_charges=15.0,
        reference_id="TAX_001"
    )

    new_balance = await LedgerService.get_balance(db_session, seed_user.id)
    expected_balance = initial_balance + 25_000.0 - 150.5
    assert abs(new_balance - expected_balance) < 0.01
    assert await LedgerService.verify_integrity(db_session, seed_user.id) is True

@pytest.mark.asyncio
async def test_high_volume_transaction_loop_integrity(db_session: AsyncSession, seed_user: User):
    """
    Simulates 250 diverse financial operations (locks, releases, profits, losses, taxes)
    and verifies that the zero-sum audit invariant holds without drift.
    """
    import random
    random.seed(42)

    for i in range(250):
        action = random.choice(["LOCK_RELEASE", "PROFIT", "LOSS", "TAX"])
        if action == "LOCK_RELEASE":
            amt = random.uniform(5000, 50000)
            await LedgerService.lock_margin(db_session, seed_user, amt, f"ORD_{i}")
            await LedgerService.release_margin(db_session, seed_user, amt, f"POS_{i}")
        elif action == "PROFIT":
            pnl = random.uniform(500, 15000)
            await LedgerService.record_pnl(db_session, seed_user, pnl, f"POS_{i}")
        elif action == "LOSS":
            loss = -random.uniform(500, 10000)
            await LedgerService.record_pnl(db_session, seed_user, loss, f"POS_{i}")
        elif action == "TAX":
            await LedgerService.record_statutory_deductions(
                db=db_session,
                user=seed_user,
                stt=20.0,
                gst=5.0,
                stamp_duty=2.0,
                exchange_charges=3.0,
                reference_id=f"TAX_{i}"
            )

    # Strict audit check
    assert await LedgerService.verify_integrity(db_session, seed_user.id) is True
