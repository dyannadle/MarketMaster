from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime, Index
from app.core.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), index=True, nullable=False)
    symbol = Column(String(50), index=True, nullable=False)  # NIFTY_FUT, BANKNIFTY_FUT, ASSET_X
    side = Column(String(10), nullable=False)                 # BUY, SELL
    order_type = Column(String(20), nullable=False)           # MARKET, LIMIT, STOP_LOSS, BRACKET
    
    quantity = Column(Integer, nullable=False)
    limit_price = Column(Float, nullable=True)
    stop_loss = Column(Float, nullable=True)
    target_price = Column(Float, nullable=True)
    
    status = Column(String(20), default="PENDING", nullable=False)  # PENDING, FILLED, REJECTED, CANCELLED
    filled_quantity = Column(Integer, default=0, nullable=False)
    avg_fill_price = Column(Float, default=0.0, nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        Index("idx_user_orders_status", "user_id", "status"),
    )
