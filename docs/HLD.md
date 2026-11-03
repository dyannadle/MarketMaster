# High-Level Design (HLD)
## Project: MarketMaster Academy
**Architecture Pattern**: Event-Driven Modular Monolith with Virtual Threads  
**Version**: 1.1.0  

---

### 1. Architectural System Context & Ingress Routing

```mermaid
flowchart TD
    UserClient["Learner / Trader (Web & Mobile)"]
    
    subgraph IngressGateway["Ingress & Edge Security Layer"]
        CDN["Cloudflare / Vercel Edge Network<br/>(DDoS Protection, Static Asset Caching)"]
        ReverseProxy["Reverse Proxy & Rate Limiter<br/>(HTTPS Termination, Token Bucket Filter)"]
    end

    subgraph MonolithCore["Modular Monolith Application Core"]
        SecurityLayer["Spring Security & JWT Filter"]
        
        subgraph InternalModules["Spring Boot Service Modules"]
            AuthModule["Auth & Profile Service"]
            AcademyModule["Academy & Assessment Engine"]
            TradingModule["Paper Trading & Order Matching Engine"]
            MarketDataModule["Historical Replay & Data Pipeline"]
            RiskModule["Risk Management (RMS) & Margin Engine"]
            AnalyticsModule["Tearsheet & Performance Analytics"]
        end
        
        InternalBus["Spring Internal Event Bus<br/>(ApplicationEventPublisher)"]
    end

    subgraph DataStorage["Data Persistence Tier"]
        Postgres[("PostgreSQL 16 Database<br/>(Accounts, Orders, Courses, Users)")]
        RedisStore[("Redis In-Memory Store<br/>(Hot Order Books, Leaderboards, Rate Tokens)")]
        ParquetData[("Time-Series Parquet Archive<br/>(Historical Candles & Tick Datasets)")]
    end

    UserClient -->|HTTPS / WSS| CDN
    CDN --> ReverseProxy
    ReverseProxy --> SecurityLayer
    SecurityLayer --> InternalModules

    TradingModule <--> InternalBus
    RiskModule <--> InternalBus
    MarketDataModule <--> InternalBus
    AcademyModule <--> InternalBus

    TradingModule --> Postgres
    TradingModule --> RedisStore
    MarketDataModule --> ParquetData
    AuthModule --> Postgres
```

---

### 2. High-Level Data Pipelines

#### 2.1 Historical Candle Replay Pipeline
The replay engine streams historical candles to the client while simultaneously triggering pending order evaluations in the matching engine.

```mermaid
flowchart LR
    DatasetFile["Historical Parquet / CSV"] --> DataParser["Time-Series Parser & Buffer"]
    DataParser --> SpeedController["Replay Pacing Controller<br/>(1x, 2x, 5x, 10x, 60x Speed)"]
    
    SpeedController --> ScrubbingEngine["Asset & Date Masking Engine<br/>(Blind Mode for Rated Gym)"]
    
    ScrubbingEngine -->|WebSocket Push| ClientChart["Client TradingView Chart<br/>(Renders Bar-by-Bar)"]
    ScrubbingEngine -->|Internal Event| MatchingEngine["Matching Engine<br/>(Evaluates Resting Orders)"]
    
    MatchingEngine -->|If Price Crosses| OrderExecution["Execute Fill & Post to Ledger"]
```

#### 2.2 Double-Entry Accounting Pipeline
Every fill or corporate adjustment triggers an atomic multi-step ledger posting:

```mermaid
flowchart TD
    FillEvent["Trade Fill Event<br/>(Symbol, Side, Qty, FillPrice)"] --> CostCalculator["Statutory Cost Calculator<br/>(Brokerage, STT, Exchange, GST, Stamp Duty)"]
    
    CostCalculator --> LedgerTransaction["Begin Atomic Database Transaction"]
    
    LedgerTransaction --> DebitCredit["Post Double-Entry Records:
    1. Cash Balance Debit / Credit
    2. Tax & Brokerage Deductions
    3. Position Net Quantity & Average Price Adjustment"]
    
    DebitCredit --> Commit["Commit Transaction & Recompute Free Margin"]
    Commit --> Broadcast["Emit WebSocket AccountUpdate Event"]
```

---

### 3. Subsystem Detailed Responsibilities

```mermaid
classDiagram
    class AcademySubsystem {
        +getCourseHierarchy() List~Course~
        +getConceptDetail(conceptId) Concept
        +evaluateQuiz(submission) QuizResult
        +generateCertificate(userId, courseId) Certificate
    }
    class TradingSubsystem {
        +placeOrder(OrderRequest) Order
        +cancelOrder(orderId) Boolean
        +modifyOrder(orderId, ModifyRequest) Order
        +onCandleTick(Candle) void
        +squareOffPosition(positionId) Position
    }
    class RiskSubsystem {
        +validateMarginRequirement(order) MarginCheckResult
        +evaluateAccountMTM(accountId) MtmReport
        +triggerLiquidationEvent(accountId) LiquidationSummary
    }
    class MarketDataSubsystem {
        +streamCandles(sessionId, symbol, speed) Flux~Candle~
        +generateSyntheticSession(parameters) Dataset
        +getHistoricalDepth(symbol, timestamp) MarketDepth
    }

    TradingSubsystem ..> RiskSubsystem : Queries Margin
    TradingSubsystem ..> MarketDataSubsystem : Consumes Ticks
    AcademySubsystem ..> TradingSubsystem : Launches Linked Simulations
```
