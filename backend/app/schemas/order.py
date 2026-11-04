from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class OrderCreate(BaseModel):
    symbol: str = Field(..., example="NIFTY_FUT")
    side: str = Field(..., pattern="^(BUY|SELL)$")
    order_type: str = Field(..., pattern="^(MARKET|LIMIT|STOP_LOSS|BRACKET)$")
    quantity: int = Field(..., gt=0)
    limit_price: Optional[float] = Field(None, gt=0)
    stop_loss: Optional[float] = Field(None, gt=0)
    target_price: Optional[float] = Field(None, gt=0)

class OrderResponse(BaseModel):
    id: str
    user_id: str
    symbol: str
    side: str
    order_type: str
    quantity: int
    limit_price: Optional[float]
    stop_loss: Optional[float]
    target_price: Optional[float]
    status: str
    filled_quantity: int
    avg_fill_price: float
    created_at: datetime

    class Config:
        from_attributes = True

class OrderExecutionResponse(BaseModel):
    order: OrderResponse
    fill_price: float
    slippage: float
    stt_tax: float
    gst_tax: float
    stamp_duty: float
    exchange_charges: float
    margin_locked: float
    discipline_score: int
