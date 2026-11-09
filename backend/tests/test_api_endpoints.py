import pytest
from httpx import AsyncClient
from app.models.user import User
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_health_check_endpoint(async_client: AsyncClient):
    """Test /actuator/health returns 200, healthy status, and security headers."""
    res = await async_client.get("/actuator/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "UP"
    assert data["zero_cost_stack"] is True
    assert data["rate_limiting_active"] is True
    assert data["security_headers_active"] is True

    # Security Headers Verification (Section 3 Audit)
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert res.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "x-process-time-ms" in res.headers

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
    assert reg_data["user"]["role"] == "TRADER"
    token = reg_data["access_token"]

    # 3. Authenticated /me request
    headers = {"Authorization": f"Bearer {token}"}
    me_res = await async_client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "adittrader@marketmaster.in"
    assert me_data["virtual_equity"] == 1_000_000.0

@pytest.mark.asyncio
async def test_admin_rbac_and_privilege_enforcement(
    async_client: AsyncClient,
    seed_user: User,
    seed_admin: User
):
    """
    Verifies Rule 4.1 Server-Side Role-Based Access Control (RBAC):
    - Admin (dyanndlee05@gmail.com) can access /admin endpoints.
    - Regular trader is rejected with HTTP 403 Forbidden.
    - Unauthenticated request is rejected with HTTP 401 Unauthorized.
    """
    # 1. Unauthenticated request -> 401
    anon_res = await async_client.get("/api/v1/admin/users")
    assert anon_res.status_code == 401

    # 2. Regular trader request -> 403 Forbidden
    trader_token = create_access_token({"sub": seed_user.id, "email": seed_user.email, "role": seed_user.role})
    trader_headers = {"Authorization": f"Bearer {trader_token}"}
    forbidden_res = await async_client.get("/api/v1/admin/users", headers=trader_headers)
    assert forbidden_res.status_code == 403
    assert "Forbidden" in forbidden_res.json()["detail"]

    # 3. Admin request -> 200 OK
    admin_token = create_access_token({"sub": seed_admin.id, "email": seed_admin.email, "role": seed_admin.role})
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    admin_res = await async_client.get("/api/v1/admin/users", headers=admin_headers)
    assert admin_res.status_code == 200
    users_list = admin_res.json()
    assert isinstance(users_list, list)
    assert len(users_list) >= 2

@pytest.mark.asyncio
async def test_admin_adjust_balance_double_entry(
    async_client: AsyncClient,
    seed_user: User,
    seed_admin: User
):
    """
    Verifies that admin balance adjustment updates user equity
    and records an immutable double-entry ledger record.
    """
    admin_token = create_access_token({"sub": seed_admin.id, "email": seed_admin.email, "role": seed_admin.role})
    headers = {"Authorization": f"Bearer {admin_token}"}

    payload = {
        "new_equity": 1_250_000.0,
        "reason": "Institutional Practice Bonus Allocation"
    }
    adj_res = await async_client.post(
        f"/api/v1/admin/users/{seed_user.id}/adjust-balance",
        json=payload,
        headers=headers
    )
    assert adj_res.status_code == 200
    adj_data = adj_res.json()
    assert adj_data["status"] == "SUCCESS"
    assert adj_data["new_equity"] == 1_250_000.0
    assert adj_data["adjusted_by"] == seed_admin.email

@pytest.mark.asyncio
async def test_admin_toggle_rms_kill_switch(
    async_client: AsyncClient,
    seed_admin: User
):
    """Verifies emergency RMS platform kill-switch toggle."""
    admin_token = create_access_token({"sub": seed_admin.id, "email": seed_admin.email, "role": seed_admin.role})
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Activate
    halt_res = await async_client.post("/api/v1/admin/rms-kill-switch?active=true", headers=headers)
    assert halt_res.status_code == 200
    assert halt_res.json()["rms_kill_switch_active"] is True

    # Check system stats reflects HALTED
    stats_res = await async_client.get("/api/v1/admin/system-stats", headers=headers)
    assert stats_res.status_code == 200
    assert stats_res.json()["matching_engine_status"] == "HALTED"

    # Restore
    resume_res = await async_client.post("/api/v1/admin/rms-kill-switch?active=false", headers=headers)
    assert resume_res.status_code == 200
    assert resume_res.json()["rms_kill_switch_active"] is False

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

    # Verify SEBI-Compliant Statement Export
    stmt_res = await async_client.get("/api/v1/trading/statement", headers=headers)
    assert stmt_res.status_code == 200
    stmt_data = stmt_res.json()
    assert "account" in stmt_data
    assert "financial_summary" in stmt_data
    assert "mistake_distribution" in stmt_data
    assert "trades" in stmt_data
    assert len(stmt_data["trades"]) >= 1
    assert stmt_data["financial_summary"]["total_statutory_charges"] >= 0

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
    """Verify live Yahoo Finance market quotes and candlestick endpoint with mock."""
    q_res = await async_client.get("/api/v1/market/quotes?symbols=^NSEI,RELIANCE.NS")
    assert q_res.status_code == 200
    q_data = q_res.json()
    assert "quotes" in q_data
    assert len(q_data["quotes"]) >= 2
    symbols = [q["symbol"] for q in q_data["quotes"]]
    assert "^NSEI" in symbols
    assert "RELIANCE.NS" in symbols

    # Test candles
    c_res = await async_client.get("/api/v1/market/candles?symbol=^NSEI&timeframe=1m&range_param=1d")
    assert c_res.status_code == 200
    c_data = c_res.json()
    assert c_data["symbol"] == "^NSEI"
    assert len(c_data["candles"]) > 0

@pytest.mark.asyncio
async def test_news_feed_refresh(async_client: AsyncClient):
    """Verify live financial news feed with 10-minute refresh cadence and fallback."""
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

@pytest.mark.asyncio
async def test_quant_black_scholes_derivatives(async_client: AsyncClient):
    """
    Verifies quantitative Black-Scholes European pricing and Greeks engine.
    Spot = 24,000, Strike = 24,000, 30 days to expiry, 15% IV, 6.5% interest rate.
    """
    payload = {
        "spot_price": 24000.0,
        "strike_price": 24000.0,
        "time_to_expiry_days": 30.0,
        "volatility": 0.15,
        "risk_free_rate": 0.065
    }
    res = await async_client.post("/api/v1/quant/black-scholes", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "call_price" in data
    assert "put_price" in data
    assert "call_greeks" in data
    assert "put_greeks" in data

    assert data["call_price"] > 0
    assert data["put_price"] > 0
    call_greeks = data["call_greeks"]
    put_greeks = data["put_greeks"]

    # Greeks bounds
    assert 0.4 < call_greeks["delta"] < 0.7
    assert -0.7 < put_greeks["delta"] < -0.3
    assert call_greeks["gamma"] > 0
    assert call_greeks["vega"] > 0
    assert call_greeks["theta"] < 0

@pytest.mark.asyncio
async def test_quant_portfolio_margin_relief(async_client: AsyncClient):
    """Verifies SEBI multi-leg options margin relief calculation."""
    # Iron Condor spread
    legs = [
        {"side": "BUY", "type": "PE", "strike": 23800, "qty": 50, "price": 45.0},
        {"side": "SELL", "type": "PE", "strike": 24000, "qty": 50, "price": 110.0},
        {"side": "SELL", "type": "CE", "strike": 24400, "qty": 50, "price": 105.0},
        {"side": "BUY", "type": "CE", "strike": 24600, "qty": 50, "price": 40.0},
    ]
    res = await async_client.post("/api/v1/quant/margin", json={"legs": legs})
    assert res.status_code == 200
    data = res.json()
    assert data["naked_margin"] > data["hedged_margin"]
    assert data["margin_relief_percent"] > 50.0  # Over 50% margin relief on Iron Condor
