import sys
from pathlib import Path
from typing import AsyncGenerator
import pytest
import pytest_asyncio
import httpx
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.core.database import Base, get_db
from app.main import app
from app.models.user import User
from app.core.security import get_password_hash
from app.services.ledger_service import LedgerService

TEST_DATABASE_URL = "sqlite+aiosqlite:///file:testmemdb?mode=memory&cache=shared&uri=true"

@pytest_asyncio.fixture(scope="function")
async def test_engine():
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()

@pytest_asyncio.fixture(scope="function")
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    async_session = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        yield session

@pytest_asyncio.fixture(scope="function")
async def async_client(test_engine) -> AsyncGenerator[AsyncClient, None]:
    async_session = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        async with async_session() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()

@pytest_asyncio.fixture(autouse=True)
def mock_external_network(monkeypatch):
    """
    Mocks external outbound HTTP requests (Yahoo Finance quotes and charts).
    Ensures tests are 100% offline, deterministic, and execute in under 1 second.
    """
    async def noop():
        pass
    monkeypatch.setattr("app.main.init_db", noop)

    orig_get = httpx.AsyncClient.get

    async def mock_get(self, url, *args, **kwargs):
        url_str = str(url)
        if "query1.finance.yahoo.com/v7/finance/quote" in url_str:
            mock_json = {
                "quoteResponse": {
                    "result": [
                        {
                            "symbol": "^NSEI",
                            "shortName": "NIFTY 50",
                            "regularMarketPrice": 24250.0,
                            "regularMarketChange": 120.5,
                            "regularMarketChangePercent": 0.50,
                            "regularMarketDayHigh": 24300.0,
                            "regularMarketDayLow": 24180.0,
                            "regularMarketVolume": 250000000,
                            "regularMarketTime": 1731170000
                        },
                        {
                            "symbol": "RELIANCE.NS",
                            "shortName": "Reliance Industries",
                            "regularMarketPrice": 1285.0,
                            "regularMarketChange": 15.0,
                            "regularMarketChangePercent": 1.18,
                            "regularMarketDayHigh": 1290.0,
                            "regularMarketDayLow": 1270.0,
                            "regularMarketVolume": 6500000,
                            "regularMarketTime": 1731170000
                        }
                    ]
                }
            }
            return httpx.Response(200, json=mock_json, request=httpx.Request("GET", url))
        elif "query1.finance.yahoo.com/v8/finance/chart" in url_str:
            now = 1731170000
            mock_chart = {
                "chart": {
                    "result": [
                        {
                            "meta": {"symbol": "^NSEI", "regularMarketPrice": 24250.0},
                            "timestamp": [now + i * 60 for i in range(10)],
                            "indicators": {
                                "quote": [
                                    {
                                        "open": [24200.0 + i for i in range(10)],
                                        "high": [24210.0 + i for i in range(10)],
                                        "low": [24195.0 + i for i in range(10)],
                                        "close": [24205.0 + i for i in range(10)],
                                        "volume": [1000 + i * 50 for i in range(10)]
                                    }
                                ]
                            }
                        }
                    ]
                }
            }
            return httpx.Response(200, json=mock_chart, request=httpx.Request("GET", url))
        elif "feeds.finance.yahoo.com" in url_str:
            # Trigger clean fallback to CURATED_INDIAN_MARKET_BULLETINS
            return httpx.Response(500, request=httpx.Request("GET", url))
        return await orig_get(self, url, *args, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

@pytest_asyncio.fixture(scope="function")
async def seed_user(db_session: AsyncSession) -> User:
    import uuid
    from datetime import datetime, timezone

    user = User(
        id=str(uuid.uuid4()),
        email="trader@marketmaster.in",
        hashed_password=get_password_hash("SecretPassword123!"),
        display_name="ProTrader",
        role="TRADER",
        virtual_equity=1_000_000.0,
        reserved_margin=0.0,
        discipline_score=85,
        elo_rating=1200,
        streak_days=3,
        xp_points=150,
        current_level=1,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db_session.add(user)
    await db_session.flush()
    await LedgerService.deposit_initial_capital(db_session, user, amount=1_000_000.0)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest_asyncio.fixture(scope="function")
async def seed_admin(db_session: AsyncSession) -> User:
    import uuid
    from datetime import datetime, timezone

    admin = User(
        id=str(uuid.uuid4()),
        email="dyanndlee05@gmail.com",
        hashed_password=get_password_hash("AdminPassword123!"),
        display_name="AdminDeepak",
        role="ADMIN",
        virtual_equity=1_000_000.0,
        reserved_margin=0.0,
        discipline_score=100,
        elo_rating=1800,
        streak_days=10,
        xp_points=5000,
        current_level=5,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db_session.add(admin)
    await db_session.flush()
    await LedgerService.deposit_initial_capital(db_session, admin, amount=1_000_000.0)
    await db_session.commit()
    await db_session.refresh(admin)
    return admin
