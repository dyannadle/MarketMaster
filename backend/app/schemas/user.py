from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    display_name: str = Field(..., min_length=2, max_length=100)
    age_confirmed: bool = Field(..., description="Must confirm age >= 18 or parental consent per Rule 4.2")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    display_name: str
    virtual_equity: float
    reserved_margin: float
    discipline_score: int
    elo_rating: int
    streak_days: int
    xp_points: int
    current_level: int
    role: str = "TRADER"
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

