from datetime import datetime, timezone
from sqlalchemy import Column, String, Float, Integer, DateTime
from app.core.database import Base
from app.core.config import settings

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    display_name = Column(String(100), nullable=False)
    
    # Financial State
    virtual_equity = Column(Float, default=settings.INITIAL_VIRTUAL_CAPITAL, nullable=False)
    reserved_margin = Column(Float, default=0.0, nullable=False)
    
    # Gamification & Trader Discipline
    discipline_score = Column(Integer, default=settings.DEFAULT_DISCIPLINE_SCORE, nullable=False)
    elo_rating = Column(Integer, default=settings.DEFAULT_ELO_RATING, nullable=False)
    streak_days = Column(Integer, default=1, nullable=False)
    xp_points = Column(Integer, default=0, nullable=False)
    current_level = Column(Integer, default=0, nullable=False)  # Level 0 through 5
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

