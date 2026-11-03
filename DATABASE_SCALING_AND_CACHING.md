# Database Scaling & Caching Strategy
## Project: MarketMaster Academy
**RDBMS**: PostgreSQL 16+ (Neon Serverless / Supabase Free Tier)  
**In-Memory Cache**: Redis (Upstash Serverless Free Tier / Local Redis)  
**Version**: 1.0.0  

---

### 1. Database Query Optimization & Indexing Strategy
* **Index Strategy**: Every query path is backed by targeted compound indexes to guarantee sub-10ms execution on free database tiers:
  * `CREATE INDEX idx_orders_account_status ON simulated_orders(account_id, status);`
  * `CREATE INDEX idx_ledger_account_created ON cash_ledger(account_id, created_at DESC);`
  * `CREATE INDEX idx_user_concept_lookup ON user_concept_progress(user_id, is_completed);`
  * `CREATE INDEX idx_candles_composite ON historical_candles(symbol, timeframe, bucket_timestamp DESC);`
* **Avoid N+1 Query Traps**: Spring Data JPA queries use explicit `@EntityGraph` or `JOIN FETCH` when retrieving accounts with open positions.
* **Pagination**: All lists (orders, trades, ledger entries) enforce keyset or offset pagination (`LIMIT 50 OFFSET ?`) to prevent memory exhaustion.

---

### 2. Connection Pooling Configuration (HikariCP)
To remain strictly within free-tier connection limits (typically 20 max connections):
```properties
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=2
spring.datasource.hikari.idle-timeout=30000
spring.datasource.hikari.max-lifetime=1800000
spring.datasource.hikari.connection-timeout=20000
```

---

### 3. Redis Caching & Invalidation Architecture

```
[Client Query: GET /api/v1/gym/leaderboard]
                │
                ▼
      [Is Cached in Redis?]
         ├── YES ──► Return Cached JSON (0ms DB load)
         │
         └── NO  ──► Query PostgreSQL
                     Write to Redis with TTL = 60 seconds
                     Return Fresh Result
```

#### Cache Invalidation Rules:
* **User Profile & Balance**: Invalidated immediately on order fill or cash transaction event (`marketmaster:account:{accountId}`).
* **Course Hierarchy**: Cached indefinitely (`TTL = 24h`); invalidated only when Admin CMS updates course content (`marketmaster:courses`).
* **Active Replay Ticks**: Cached in microsecond in-memory L1 cache (Caffeine) on the application server.

---

### 4. Database Scaling Roadmap (From ₹0 to High Scale)
1. **Tier 1 (0 to 20,000 Users — ₹0 Budget)**:
   * Single serverless PostgreSQL instance (Neon / Supabase Free Tier) with indexed queries and HikariCP pool.
2. **Tier 2 (20,000 to 100,000 Users)**:
   * Vertical database compute upgrade; activate TimescaleDB hypertable partitioning for historical candle tick storage (`CREATE SELECT create_hypertable('historical_candles', 'bucket_timestamp');`).
3. **Tier 3 (100,000+ Users)**:
   * Introduce Read Replicas: Route all idempotent read queries (`GET /courses`, `GET /candles`) to read replicas, directing write operations exclusively to the primary master.

