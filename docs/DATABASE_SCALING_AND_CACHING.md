# Database Scaling & Caching Strategy
## Project: MarketMaster Academy
**RDBMS**: PostgreSQL 16+ (Neon Serverless / Supabase Free Tier)  
**In-Memory Cache**: Redis (Upstash Serverless Free Tier / Local Redis)  
**Version**: 1.1.0  

---

### 1. Multi-Tier Cache-Aside Architecture

```mermaid
flowchart TD
    ClientReq["Client Query (e.g. GET /api/v1/courses or Leaderboard)"] --> CheckL1{"Check L1 Cache<br/>(In-Memory Caffeine Microsecond Cache)"}
    
    CheckL1 -->|Hit| ReturnL1["Return Result (< 1ms Latency)"]
    CheckL1 -->|Miss| CheckL2{"Check L2 Cache<br/>(Redis Distributed Cache)"}
    
    CheckL2 -->|Hit| PopulateL1["Populate L1 Cache"]
    PopulateL1 --> ReturnL2["Return Result (~5ms Latency)"]
    
    CheckL2 -->|Miss| QueryDB[("Query PostgreSQL Database<br/>(Targeted Compound Index Scan)")]
    
    QueryDB --> PopulateL2["Populate L2 Redis Cache (Set TTL)"]
    PopulateL2 --> PopulateL1
    ReturnL2 --> ClientResponse["Return HTTP 200 to Client"]
    ReturnL1 --> ClientResponse
```

---

### 2. Cache Invalidation Event Lifecycle (Sequence Diagram)

```mermaid
sequenceDiagram
    autonumber
    actor Trader as Learner / Trader
    participant OrderService as Order Execution Service
    participant DB as PostgreSQL Database
    participant EventBus as Internal Event Bus
    participant Cache as Redis Cache Store
    participant Client as Trader UI

    Trader->>OrderService: Execute Trade Fill (BUY 50 NIFTY)
    OrderService->>DB: Atomic Update (Positions, Cash Ledger)
    DB-->>OrderService: Commit Success
    
    OrderService->>EventBus: Publish: OrderFilledEvent(accountId, symbol)
    
    par Invalidate Cache
        EventBus->>Cache: DEL marketmaster:account:{accountId}
        EventBus->>Cache: DEL marketmaster:leaderboard:daily
    and Push Real-Time Update
        EventBus->>Client: WebSocket Push: Updated Cash Balance & Open Position
    end
```

---

### 3. Scaling Progression Roadmap (0 to 100,000+ Users)

```mermaid
flowchart LR
    subgraph Tier1["Tier 1: ₹0 Free Tier (0 to 20k Users)"]
        SingleDB["Single PostgreSQL Serverless DB"]
        HikariPool["HikariCP Pool (Max 10 Conns)"]
        ClientWasm["Pyodide WASM Compute Offload"]
    end

    subgraph Tier2["Tier 2: Intermediate (20k to 100k Users)"]
        TimescalePart["TimescaleDB Hypertables (Candle Partitioning)"]
        RedisCluster["Dedicated Redis Cluster"]
        ReadCache["Read-Heavy Edge Caching (99% Hit Ratio)"]
    end

    subgraph Tier3["Tier 3: Enterprise Scale (100k+ Users)"]
        ReadReplicas["PostgreSQL Read Replicas"]
        KafkaStreaming["Kafka Event Streaming Pipeline"]
        GlobalEdge["Global Multi-Region Read Replicas"]
    end

    Tier1 --> Tier2 --> Tier3
```
