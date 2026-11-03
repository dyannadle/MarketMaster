# High-Level Design (HLD)
## Project: MarketMaster Academy
**Architecture Style**: Modular Monolith with Event-Driven Simulation Workers  
**Version**: 1.0.0  

---

### 1. System Context & Top-Level Architecture

```
                    ┌──────────────────────────────────────────────────┐
                    │               CLIENT APPLICATIONS                │
                    │  Next.js 15 Web Terminal  │  Android Kotlin App  │
                    └────────────┬─────────────────────────┬───────────┘
                                 │ HTTPS / WSS             │ HTTPS / WSS
                                 ▼                         ▼
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY / APPLICATION CORE                              │
│  • Reverse Proxy (Caddy / Nginx)  • JWT Authentication & Session Token Validator     │
│  • IP & Token Rate Limiter        • Input Sanitization & Anti-CSRF Guard              │
└──────────────────────────────────────────┬────────────────────────────────────────────┘
                                           │
         ┌─────────────────────────────────┼────────────────────────────────┐
         ▼                                 ▼                                ▼
┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│  LEARNING ENGINE │             │ SIMULATION CORE  │             │ MARKET DATA HUB  │
│ • Course CMS     │             │ • Order Engine   │             │ • Candle Storage │
│ • Quizzes & Eval │             │ • Matching Queue │             │ • Synthetic Gen  │
│ • User Progress  │             │ • Ledger/Balance │             │ • Level 2 Depth  │
│ • Certification  │             │ • RMS & Margins  │             │ • Corporate Act. │
└────────┬─────────┘             └────────┬─────────┘             └────────┬─────────┘
         │                                │                                │
         └────────────────────────────────┼────────────────────────────────┘
                                          │
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                               PERSISTENCE & DATA LAYER                                │
│ • PostgreSQL (Primary Relational State: Users, Accounts, Positions, Courses)         │
│ • TimescaleDB / Parquet Files (Time-series Candle Archive)                           │
│ • Redis (In-Memory Hot Order Books, Leaderboards, Rate-Limit Tokens)                 │
│ • SQLite (Client-side Android Room Database for Offline Operation)                   │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Subsystem Component Breakdown

#### 2.1 Learning Engine Subsystem
* **Content Provider**: Delivers structured JSON courseware (Levels 0 through 5).
* **Assessment Processor**: Evaluates quiz submissions, tracks skill mastery scores, enforces prerequisites.
* **Certificate Authority**: Issues cryptographically signed educational completion certificates.

#### 2.2 Paper Trading Simulation Subsystem
* **Order Validator**: Validates quantity against lot size, price against tick size, session calendar, and available margin.
* **Virtual Matching Engine**: Implements price-time priority matching with simulated depth exhaustion.
* **Execution & Accounting Ledger**: Records double-entry immutable ledger events for all trade fills, cash deposits, and statutory charges.
* **Risk Management System (RMS)**: Continuous background thread evaluating MTM, margin utilization, and auto-square-off conditions.

#### 2.3 Market Data & Replay Subsystem
* **Candle Feeder**: Streams OHLCV records at requested speed (1x to 60x) into the chart and matching engine.
* **Masking Filter**: Replaces asset names and calendar dates with random placeholders in Rated Mode.
* **Synthetic Generator**: Implements Geometric Brownian Motion (GBM) with jump diffusion to simulate infinite realistic market conditions with zero external data fees.

---

### 3. Integration & Communication Protocols
1. **REST APIs**: Used for idempotent queries (course metadata, user profile, historical trade logs, portfolio summary).
2. **WebSocket (WSS)**: Bidirectional streaming for active candle ticks, live P&L updates, and order execution events.
3. **Internal Event Bus**: In-memory Spring ApplicationEvents / lightweight channel emitting `OrderPlacedEvent`, `OrderFilledEvent`, `MarginCallEvent`, and `LessonCompletedEvent`.

