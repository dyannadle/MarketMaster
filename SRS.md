# Software Requirements Specification (SRS)
## Project: MarketMaster Academy
**Standard**: IEEE 830-1998  
**Version**: 1.0.0  

---

### 1. Introduction & System Purpose
This document defines the complete technical, functional, and non-functional requirements for the MarketMaster Academy web application and native Android mobile application.

---

### 2. External Interface Requirements

#### 2.1 User Interfaces
* **Web UI**: Next.js 15, React 19, Tailwind CSS v4, Lucide Icons. Fully responsive across Desktop (1920x1080 to 1280x720) and Mobile Viewports (375px to 430px width).
* **Android UI**: Kotlin 2.0+, Jetpack Compose, Material Design 3, Dark & Light theme support with system default detection.

#### 2.2 Hardware Interfaces
* Standard mobile device touch screen, haptics, and biometric hardware (Fingerprint / Face Unlock via Android BiometricPrompt).
* Standard PC keyboard navigation (WASD / Arrow navigation in Replay Mode, Spacebar for Play/Pause, Esc for Modal Dismissal).

#### 2.3 Software & API Interfaces
* **Market Data Service**: Internal REST & WebSocket endpoints delivering OHLCV candles, ticker quotes, and Level 2 depth.
* **Authentication Provider**: Stateless JWT Auth (HS256/RS256) with refresh token rotation stored in HttpOnly secure cookies (Web) and EncryptedSharedPreferences (Android).
* **Storage**: PostgreSQL (Relational schema), Redis (Session state, rate-limits, and hot quotes), SQLite (Android Room database for offline learning and local replay).

---

### 3. Detailed Functional System Requirements

#### SRS-FR-01: Historical Replay Simulation Engine
* **Input**: Symbol, historical start timestamp, candle timeframe (1m, 5m, 15m, 1h, 1D), replay speed multiplier (1x, 2x, 5x, 10x, 60x).
* **Processing**:
  * Feeds OHLCV bar stream sequentially to the chart and order matching engine.
  * Hides future bars beyond the active replay cursor.
  * Checks resting limit and stop orders against current bar's High/Low/Close.
* **Output**: Real-time position updates, triggered order notifications, and cumulative MTM P&L.

#### SRS-FR-02: Order Execution & Fill Simulation
* **Market Orders**: Executed immediately at current Ask (for Buy) or current Bid (for Sell) with non-linear slippage penalty applied based on order quantity vs available simulated depth.
* **Limit Orders**: Queued in virtual book; triggered when price touches or penetrates limit price. Queue priority simulated using volume-time elapsed heuristics.
* **Stop Orders**: Triggered when LTP crosses Stop Price, immediately converting to Market Order (or Limit Order for SL-Limit).
* **Gaps**: If next candle opens beyond Stop Price, execution occurs at the Open price of the gap candle (simulating real-world gap slippage).

#### SRS-FR-03: Statutory Transaction Cost Calculator
Calculates simulated Indian market regulatory costs per trade:
$$\text{Total Tax} = \text{Brokerage} + \text{STT} + \text{Exchange Fee} + \text{SEBI Fee} + \text{Stamp Duty} + \text{GST}$$

---

### 4. Non-Functional Requirements (NFRs)

#### 4.1 Performance & Latency
* **Chart Rendering**: Maintain 60 FPS scrolling and zooming on both web (Canvas/WebGL) and Android.
* **Replay Step Latency**: $\le 16\text{ ms}$ processing time per candle tick.
* **API Response Time**: 95th percentile response time $\le 120\text{ ms}$ for order placement and portfolio queries.

#### 4.2 Security & Compliance
* **NFR-SEC-01**: Zero plaintext credentials. Passwords hashed using Argon2id or BCrypt ($cost \ge 12$).
* **NFR-SEC-02**: Rate Limiting on all API routes (e.g., 60 req/min for orders, 10 req/min for auth).
* **NFR-SEC-03**: Row Level Security (RLS) on database tables ensuring users can only read/write their own accounts, trades, and journals.
* **NFR-SEC-04**: Strict Content Security Policy (CSP), CORS whitelisting, and anti-CSRF token protection.

#### 4.3 Availability & Zero-Cost Compatibility
* Zero architectural dependencies on paid external APIs. System must execute 100% of simulator operations offline or on standard free cloud tiers.

