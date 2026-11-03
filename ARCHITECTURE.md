# System Architecture Specification
## Project: MarketMaster Academy
**Author**: Enterprise Architecture Board  
**Version**: 1.0.0  

---

### 1. Architectural Philosophy & Design Principles
1. **Modular Monolith First**: Build bounded contexts (Learning, Simulation, MarketData, RMS, Analytics) inside a clean, modular Spring Boot / Next.js architecture before considering microservice network boundaries.
2. **Zero-Cost Infrastructure Principle**: Design every component to run without mandatory cloud billing:
   * Client-side computations (WASM / Pyodide / Android SQLite).
   * Static assets hosted on Vercel / Cloudflare Pages Free Tiers.
   * Database queries optimized for small free-tier PostgreSQL instances (Neon / Supabase).
3. **Double-Entry Accounting Invariance**: Virtual capital behaves identically to banking ledgers:
   $$\sum \text{Debits} = \sum \text{Credits}$$
   Balances are never updated via raw mutable field overwrites; they are reconstructed or checked against immutable ledger entries.
4. **Hindsight-Free Simulation Pipeline**: In replay mode, the client runtime has zero knowledge of upcoming candles, preventing any DOM inspection or memory snooping cheats.

---

### 2. High-Level Bounded Contexts

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BOUNDED CONTEXT TOPOLOGY                        │
├─────────────────────┬──────────────────────────────────────────────────┤
│ BOUNDED CONTEXT     │ PRIMARY RESPONSIBILITIES                         │
├─────────────────────┼──────────────────────────────────────────────────┤
│ 1. Identity & Auth  │ User authentication, JWT issuance, profile,      │
│                     │ session invalidation, privacy data export/delete │
├─────────────────────┼──────────────────────────────────────────────────┤
│ 2. Learning Academy │ Course hierarchy, progress tracking, quiz engine,│
│                     │ concept prerequisite graph, completion certs     │
├─────────────────────┼──────────────────────────────────────────────────┤
│ 3. Market Simulator │ Virtual accounts, order book, fill simulation,   │
│                     │ slippage engine, double-entry cash/trade ledger  │
├─────────────────────┼──────────────────────────────────────────────────┤
│ 4. Practice Gym     │ ChartingPark-style replay, blind asset masking,  │
│                     │ Daily Challenges, pattern recognition drills     │
├─────────────────────┼──────────────────────────────────────────────────┤
│ 5. Strategy Lab     │ Algorithm execution (TWAP/VWAP/POV/Iceberg),     │
│                     │ backtesting engine, performance metrics (Sharpe) │
├─────────────────────┼──────────────────────────────────────────────────┤
│ 6. Risk Engine (RMS)│ Margin requirements, exposure limits, real-time │
│                     │ MTM valuation, automated margin call liquidation │
└─────────────────────┴──────────────────────────────────────────────────┘
```

---

### 3. Data Flow & Security Boundaries
* **Client to Gateway**: Strictly HTTPS / WSS with TLS 1.3.
* **Authentication**: Authorization header carrying `Bearer <JWT>` with 15-minute expiration; refresh tokens stored in secure, HttpOnly, SameSite=Strict cookies.
* **Rate Limiting**: Token bucket algorithm per IP and per User ID (Redis-backed in production, in-memory ConcurrentHashMap for local runtime).

