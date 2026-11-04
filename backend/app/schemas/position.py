from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class PositionResponse(BaseModel):
    id: str
    user_id: str
    symbol: str
    side: str
    quantity: int
    avg_entry_price: float
    current_ltp: float
    unrealized_pnl: float
    realized_pnl: float
    stop_loss: Optional[float]
    trailing_tp: Optional[float]
    is_open: bool
    updated_at: datetime

    class Config:
        from_attributes = True

class PositionExitResponse(BaseModel):
    position_id: str
    symbol: str
    exit_price: float
    realized_pnl: float
    margin_released: float
    discipline_score: int
    post_mortem: dict

