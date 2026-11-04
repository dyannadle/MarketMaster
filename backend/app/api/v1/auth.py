import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User
from app.models.order import Order
from app.models.position import Position
from app.models.execution import TradeExecution
from app.models.ledger import CashLedger
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse
from app.services.ledger_service import LedgerService
from app.api.v1.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """
    Registers a new user and automatically allocates ₹10,00,000 initial virtual capital
    with an audited double-entry ledger genesis transaction.
    """
    if not user_in.age_confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Under Rule 4.2, age >= 18 or parental consent confirmation is mandatory."
        )

    # Check if user exists
    stmt = select(User).where(User.email == user_in.email)
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        display_name=user_in.display_name,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(user)
    await db.flush()

    # Credit ₹10,00,000 genesis capital
    await LedgerService.deposit_initial_capital(db, user, amount=1_000_000.0)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(data={"sub": user.id, "email": user.email})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
async def login(
    user_in: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Authenticates user and issues JWT bearer token."""
    stmt = select(User).where(User.email == user_in.email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = create_access_token(data={"sub": user.id, "email": user.email})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile and real-time financial stats."""
    return UserResponse.model_validate(current_user)

@router.post("/delete-account", status_code=status.HTTP_200_OK)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    DPDP 'Right to Erasure' compliance endpoint (Rule 4.3).
    Cascades atomic deletion across all user data, positions, orders, executions, and ledger records.
    """
    user_id = current_user.id
    
    # Cascade deletions
    await db.execute(delete(TradeExecution).where(TradeExecution.user_id == user_id))
    await db.execute(delete(Order).where(Order.user_id == user_id))
    await db.execute(delete(Position).where(Position.user_id == user_id))
    await db.execute(delete(CashLedger).where(CashLedger.user_id == user_id))
    await db.execute(delete(User).where(User.id == user_id))
    
    await db.commit()
    return {"status": "SUCCESS", "message": "All personal data and trading records permanently erased."}

