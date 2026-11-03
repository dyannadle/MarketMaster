# Performance & Scalability Plan
## Project: MarketMaster Academy
**Target**: 10,000+ Concurrent Virtual Traders on ₹0 Infrastructure  
**Version**: 1.0.0  

---

### 1. Zero-Cost Architectural Scalability Principles
1. **Compute Offloading to Clients**:
   * Heavy backtesting computations and technical indicators are executed in the user's browser using WebAssembly / Pyodide / Web Workers.
   * Eliminates the need for expensive high-CPU cloud instances.
2. **CDN Edge Caching**:
   * 100% of course lessons, SVG diagrams, and historical candle archives are cached globally on Cloudflare / Vercel Edge networks (99% cache hit ratio).
3. **Database Query Optimization & Connection Pooling**:
   * HikariCP connection pool configured with 10 connections for free PostgreSQL tiers.
   * Strict compound indexes on `(account_id, status)` and `(user_id, concept_id)` preventing full table scans.
4. **Cache Validation & Invalidation**:
   * Cache-Aside pattern via Redis for hot quotes and user profile stats.
   * TTL of 60 seconds on leaderboard rankings; immediate event-driven invalidation on order placement.

