from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime
from app.core.database import Base

class TradeExecution(Base):
    __tablename__ = "trade_executions"

    id = Column(String(36), primary_key=True, index=True)
    order_id = Column(String(36), index=True, nullable=False)
    user_id = Column(String(36), index=True, nullable=False)
    symbol = Column(String(50), nullable=False)
    side = Column(String(10), nullable=False)  # BUY, SELL
    
    fill_price = Column(Float, nullable=False)
    fill_quantity = Column(Integer, nullable=False)
    slippage = Column(Float, default=0.0, nullable=False)
    
    # Statutory Indian Regulatory Deductions (Simulated)
    stt_tax = Column(Float, default=0.0, nullable=False)
    gst_tax = Column(Float, default=0.0, nullable=False)
    stamp_duty = Column(Float, default=0.0, nullable=False)
    exchange_charges = Column(Float, default=0.0, nullable=False)
    
    executed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

