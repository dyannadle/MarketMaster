# System Architecture Specification & Topology
## Project: MarketMaster Academy
**Author**: Enterprise Architecture Board  
**Version**: 1.1.0  
**Status**: Active Production Standard  

---

### 1. Architectural Philosophy & Core Axioms

MarketMaster Academy is architected as an **Event-Driven Modular Monolith** with client-side compute offloading, designed to deliver institutional-grade financial simulation, sub-millisecond local execution feedback, and zero ongoing cloud operational cost.

```mermaid
graph TD
    subgraph ClientLayer["Client Tier (Cross-Platform)"]
        WebClient["Next.js 15 Web Terminal<br/>(React 19, Lightweight Charts)"]
        AndroidClient["Native Android App<br/>(Kotlin, Jetpack Compose, Room)"]
    end

    subgraph GatewayLayer["API Gateway & Ingress Layer"]
        ReverseProxy["Caddy / Cloudflare Edge Proxy<br/>(TLS 1.3, DDoS Mitigation)"]
        SecurityFilter["Stateless JWT Authenticator &<br/>Token Bucket Rate Limiter"]
    end

    subgraph MonolithCore["Modular Monolith Core (Java 21 / Spring Boot 3.3)"]
        AuthModule["Identity & Access Module"]
        AcademyModule["Curriculum & Quiz Engine"]
        SimModule["Paper Trading & Matching Engine"]
        RmsModule["Risk Management System (RMS)"]
        MarketDataModule["Market Data & Replay Engine"]
        AnalyticsModule["TCA & Portfolio Analytics"]
    end

    subgraph DataLayer["Persistence & Storage Tier (Strict ₹0 Tier)"]
        PostgresDB[("PostgreSQL 16 (Neon / Supabase)<br/>Relational Ledger & Accounts")]
        RedisCache[("Redis (Upstash / Local)<br/>Hot Books & Sessions")]
        ParquetStorage[("Compressed Parquet & CSV Store<br/>Historical Candle Ticks")]
    end

    WebClient -->|HTTPS / WSS| ReverseProxy
    AndroidClient -->|HTTPS / WSS| ReverseProxy
    ReverseProxy --> SecurityFilter
    SecurityFilter --> AuthModule
    SecurityFilter --> AcademyModule
    SecurityFilter --> SimModule
    SecurityFilter --> RmsModule
    SecurityFilter --> MarketDataModule
    SecurityFilter --> AnalyticsModule

    SimModule -->|Double-Entry Audit| PostgresDB
    SimModule -->|Hot Order Queues| RedisCache
    MarketDataModule -->|Replay Feed| ParquetStorage
    RmsModule -->|Margin Verification| PostgresDB
```

---

### 2. Comprehensive Component Interaction Flow (Sequence Diagram)

The following sequence diagram illustrates the complete end-to-end lifecycle of an order: from client placement, through authentication, risk assessment, virtual order book matching, slippage application, to immutable double-entry ledger posting and WebSocket broadcast.

```mermaid
sequenceDiagram
    autonumber
    actor Trader as Learner / Trader
    participant UI as Web/Android Client
    participant GW as API Gateway & Auth Filter
    participant RMS as Risk Management System (RMS)
    participant Engine as Order Execution Engine
    participant Book as Virtual Order Book
    participant Ledger as Cash & Trade Ledger
    participant WS as WebSocket Broadcast Hub

    Trader->>UI: Submit Order (BUY 50 NIFTY Limit @ 24,200)
    UI->>GW: POST /api/v1/orders (Bearer JWT, Payload)
    GW->>GW: Validate JWT, Check Rate Limit, Sanitize
    GW->>RMS: Verify Margin & Position Limits
    alt Margin Shortfall (Required > Available)
        RMS-->>GW: Reject: MARGIN_INSUFFICIENT
        GW-->>UI: 400 Bad Request (Margin Shortfall Details)
        UI-->>Trader: Display Margin Shortfall Alert
    else Margin Sufficient
        RMS-->>Engine: Approve Order Placement
        Engine->>Book: Insert Order into Priority Queue (FIFO)
        Book-->>Engine: Order Queued (Status: PENDING)
        Engine->>UI: Return 201 Created (Order Pending)
        
        Note over Book,Engine: Price Tick Crosses 24,200 or Depth Matches
        
        Engine->>Engine: Calculate Dynamic Slippage & Partial Fill
        Engine->>Ledger: Atomic Transaction (Double-Entry Debit/Credit)
        Ledger->>Ledger: Deduct Brokerage, STT, Exchange Fees, GST
        Ledger-->>Engine: Ledger Posted & Confirmed
        Engine->>Book: Remove / Update Filled Quantity
        Engine->>WS: Emit Event: ORDER_FILLED (Fill Price, Taxes, Net P&L)
        WS-->>UI: Live WebSocket Push (Update Positions & Balance)
        UI-->>Trader: Visual Fill Notification & Haptic Feedback
    end
```

---

### 3. Subsystem Domain Deconstruction

```mermaid
flowchart LR
    subgraph InboundTraffic["Inbound Traffic"]
        direction TB
        ReqA["User Registration & Auth"]
        ReqB["Course Lesson Reading & Quiz"]
        ReqC["Paper Order Placement"]
        ReqD["Historical Replay Streaming"]
    end

    subgraph CoreDomains["Spring Boot Domain Modules"]
        direction TB
        subgraph AuthDomain["1. Auth & Identity"]
            JWT["JWT Token Service"]
            UserRepo["User Profile Repository"]
        end
        subgraph LearningDomain["2. Learning Academy"]
            CourseService["Course & Module Service"]
            QuizEngine["Quiz Grading Engine"]
            CertService["Certificate Authority"]
        end
        subgraph SimDomain["3. Market Simulation"]
            MatchingCore["Price-Time Matching Engine"]
            LedgerService["Virtual Cash Ledger"]
            SlippageCalc["Algorithmic Slippage Model"]
        end
        subgraph RiskDomain["4. RMS & Risk"]
            SpanCalc["SPAN Margin Evaluator"]
            LiquidationEngine["Auto-Square-Off Engine"]
        end
    end

    ReqA --> AuthDomain
    ReqB --> LearningDomain
    ReqC --> SimDomain
    ReqC --> RiskDomain
    ReqD --> SimDomain
```

---

### 4. Data Flow Invariants & Security Boundaries
1. **Zero Secret Leakage**: API keys and database credentials reside exclusively in server-side environment variables. Client bundles (Web JS and Android APK) contain zero credentials.
2. **Replay Integrity**: The client is delivered market data strictly bar-by-bar during replay mode. The entire historical dataset is never sent in advance, preventing clients from inspecting upcoming candles via network sniffers or developer tools.
3. **Double-Entry Ledger Consistency**: Cash balances cannot be directly incremented or decremented; they are mathematical summations of immutable credit and debit rows.
