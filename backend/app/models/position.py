from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Index
from app.core.database import Base

class Position(Base):
    __tablename__ = "positions"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), index=True, nullable=False)
    symbol = Column(String(50), index=True, nullable=False)
    side = Column(String(10), nullable=False)  # LONG, SHORT
    quantity = Column(Integer, nullable=False)
    
    avg_entry_price = Column(Float, nullable=False)
    current_ltp = Column(Float, nullable=False)
    unrealized_pnl = Column(Float, default=0.0, nullable=False)
    realized_pnl = Column(Float, default=0.0, nullable=False)
    
    stop_loss = Column(Float, nullable=True)
    trailing_tp = Column(Float, nullable=True)
    is_open = Column(Boolean, default=True, index=True, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_user_positions_open", "user_id", "is_open"),
    )

