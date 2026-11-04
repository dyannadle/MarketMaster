from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, DateTime, Index
from app.core.database import Base

class CashLedger(Base):
    __tablename__ = "cash_ledger"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), index=True, nullable=False)
    
    # Double-entry transaction fields
    transaction_type = Column(String(50), nullable=False)  # INITIAL_DEPOSIT, MARGIN_LOCK, MARGIN_RELEASE, REALIZED_PNL, TAX_STT, TAX_GST, STAMP_DUTY
    debit_amount = Column(Float, default=0.0, nullable=False)   # Cash deducted
    credit_amount = Column(Float, default=0.0, nullable=False)  # Cash credited
    balance_after = Column(Float, nullable=False)              # Audit running balance
    
    description = Column(String(255), nullable=False)
    reference_id = Column(String(36), nullable=True, index=True)  # Order ID or Position ID
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_user_ledger_date", "user_id", "created_at"),
    )
