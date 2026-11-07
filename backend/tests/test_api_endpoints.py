import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check_endpoint(async_client: AsyncClient):
    """Test /actuator/health returns 200 and healthy status."""
    res = await async_client.get("/actuator/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "UP"
    assert data["zero_cost_stack"] is True

@pytest.mark.asyncio
async def test_user_registration_age_rule_and_genesis_capital(async_client: AsyncClient):
    """
    Test registration enforces Rule 4.2 (mandatory age confirmation)
    and seeds initial virtual equity of ₹10,00,000.
    """
    # 1. Reject without age confirmation
    bad_payload = {
        "email": "underage@marketmaster.in",
        "password": "Password123!",
        "display_name": "Junior",
        "age_confirmed": False
    }
    bad_res = await async_client.post("/api/v1/auth/register", json=bad_payload)
    assert bad_res.status_code == 400
    assert "Rule 4.2" in bad_res.json()["detail"]

    # 2. Accept with valid age confirmation
    valid_payload = {
        "email": "adittrader@marketmaster.in",
        "password": "Password123!",
        "display_name": "Adit",
        "age_confirmed": True
    }
    reg_res = await async_client.post("/api/v1/auth/register", json=valid_payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["virtual_equity"] == 1_000_000.0
    token = reg_data["access_token"]

    # 3. Authenticated /me request
    headers = {"Authorization": f"Bearer {token}"}
    me_res = await async_client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "adittrader@marketmaster.in"
    assert me_data["virtual_equity"] == 1_000_000.0

@pytest.mark.asyncio
async def test_trading_order_flow_and_position_exit(async_client: AsyncClient):
    """Full lifecycle: register -> place order -> check positions -> exit position -> verify ledger."""
    # Register
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "scalper@marketmaster.in",
            "password": "Password123!",
            "display_name": "Scalper",
            "age_confirmed": True
        }
    )
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Place Order
    order_payload = {
        "symbol": "NIFTY_FUT",
        "side": "BUY",
        "order_type": "MARKET",
        "quantity": 50,
        "stop_loss": 24450.0,
        "target_price": 24650.0
    }
    order_res = await async_client.post("/api/v1/trading/orders", json=order_payload, headers=headers)
    assert order_res.status_code == 201
    order_data = order_res.json()
    assert order_data["order"]["status"] == "FILLED"
    assert order_data["margin_locked"] > 0

    # Query Positions
    pos_res = await async_client.get("/api/v1/trading/positions?is_open=true", headers=headers)
    assert pos_res.status_code == 200
    positions = pos_res.json()
    assert len(positions) == 1
    pos_id = positions[0]["id"]
    assert positions[0]["quantity"] == 50
    assert positions[0]["side"] == "LONG"

    # Exit Position
    exit_res = await async_client.post(f"/api/v1/trading/positions/{pos_id}/exit", headers=headers)
    assert exit_res.status_code == 200
    exit_data = exit_res.json()
    assert exit_data["position_id"] == pos_id
    assert "post_mortem" in exit_data

    # Audit Ledger Integrity
    audit_res = await async_client.get("/api/v1/trading/ledger/audit", headers=headers)
    assert audit_res.status_code == 200
    assert audit_res.json()["status"] == "HEALTHY"
    assert audit_res.json()["reconciled"] is True

@pytest.mark.asyncio
async def test_dpdp_erasure_endpoint(async_client: AsyncClient):
    """Verify Rule 4.3: DPDP Right to Erasure completely purges account."""
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "delete_me@marketmaster.in",
            "password": "Password123!",
            "display_name": "EphemeralUser",
            "age_confirmed": True
        }
    )
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Delete account
    del_res = await async_client.post("/api/v1/auth/delete-account", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "SUCCESS"

    # Subsequent /me request should be rejected (401 unauthorized / user purged)
    me_res = await async_client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 401

@pytest.mark.asyncio
async def test_replay_session_and_polars_slice(async_client: AsyncClient):
    """Verify replay candle generation and Polars-based slicing."""
    # Generate session
    sess_res = await async_client.get("/api/v1/replay/session?symbol=NIFTY_FUT&bars=100&blind_mode=true")
    assert sess_res.status_code == 200
    sess_data = sess_res.json()
    assert sess_data["symbol"] == "ASSET_X"
    assert sess_data["total_bars"] == 100
    candles = sess_data["candles"]
    assert len(candles) == 100

    # Slice window up to bar 25
    slice_payload = {
        "candles": candles,
        "current_index": 25,
        "window_size": 20
    }
    slice_res = await async_client.post("/api/v1/replay/slice", json=slice_payload)
    assert slice_res.status_code == 200
    slice_data = slice_res.json()
    assert len(slice_data["visible_candles"]) == 20
    assert slice_data["current_index"] == 25
    assert slice_data["has_more"] is True

@pytest.mark.asyncio
async def test_replay_presets_catalog(async_client: AsyncClient):
    """Verify historical market event presets catalog and preset session generation."""
    res = await async_client.get("/api/v1/replay/presets")
    assert res.status_code == 200
    data = res.json()
    assert "presets" in data
    presets = data["presets"]
    assert len(presets) >= 5
    ids = [p["id"] for p in presets]
    assert "COVID_CRASH_2020" in ids
    assert "ELECTION_DAY_2024" in ids
    assert "RBI_RATE_HIKE_2022" in ids

    # Test COVID crash preset session
    covid_res = await async_client.get("/api/v1/replay/session?preset_id=COVID_CRASH_2020&bars=120")
    assert covid_res.status_code == 200
    covid_data = covid_res.json()
    assert "March 2020" in covid_data["preset_name"]
    assert len(covid_data["candles"]) == 120

@pytest.mark.asyncio
async def test_market_data_quotes_and_candles(async_client: AsyncClient):
    """Verify live Yahoo Finance market quotes and candlestick endpoint with fallback."""
    q_res = await async_client.get("/api/v1/market/quotes?symbols=^NSEI,RELIANCE.NS")
    assert q_res.status_code == 200
    q_data = q_res.json()
    assert "quotes" in q_data
    assert len(q_data["quotes"]) >= 2
    symbols = [q["symbol"] for q in q_data["quotes"]]
    assert "^NSEI" in symbols
    assert "RELIANCE.NS" in symbols
    for q in q_data["quotes"]:
        assert q["price"] > 0
        assert "change" in q
        assert "volume" in q

    # Test candles
    c_res = await async_client.get("/api/v1/market/candles?symbol=^NSEI&timeframe=1m&range_param=1d")
    assert c_res.status_code == 200
    c_data = c_res.json()
    assert c_data["symbol"] == "^NSEI"
    assert len(c_data["candles"]) > 0

@pytest.mark.asyncio
async def test_news_feed_refresh(async_client: AsyncClient):
    """Verify live financial news feed with 10-minute refresh cadence."""
    news_res = await async_client.get("/api/v1/news/feed")
    assert news_res.status_code == 200
    news_data = news_res.json()
    assert "items" in news_data
    assert news_data["count"] > 0
    assert news_data["refresh_interval_minutes"] == 10
    first = news_data["items"][0]
    assert "title" in first
    assert "sentiment" in first
    assert first["sentiment"] in ["BULLISH", "BEARISH", "NEUTRAL"]


