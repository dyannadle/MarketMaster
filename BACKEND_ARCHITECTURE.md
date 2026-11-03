# Backend Architecture Specification
## Project: MarketMaster Academy
**Runtime & Framework**: Java 21 LTS / Spring Boot 3.3+  
**Architecture Pattern**: Modular Monolith with Virtual Threads (Project Loom)  
**Version**: 1.0.0  

---

### 1. Technology Choices & High-Concurrency Principles
* **Java 21 Virtual Threads**: Handles 10,000+ concurrent simulated WebSocket connections with near-zero memory footprint compared to OS-level platform threads.
* **Spring Boot 3.3**: Enterprise-grade dependency injection, declarative security, and Spring Data JPA integration.
* **Flyway**: Versioned database migration scripts ensuring idempotent relational schema evolution.
* **Caffeine & Redis**: Dual-tier caching strategy: L1 in-memory microsecond cache (Caffeine) for hot order quotes; L2 distributed Redis cache for user session state and global leaderboard scores.

---

### 2. Service Modules & Inter-Module Interfaces

```
                    ┌───────────────────────────────┐
                    │     Spring Web & Security     │
                    │   (JWT Filter, Rate Limiter)  │
                    └───────────────┬───────────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    ▼                               ▼                               ▼
┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
│     CourseModule      │ │    TradingModule      │ │   MarketDataModule    │
│ • CourseService       │ │ • OrderExecutionService│ │ • CandleFeedService   │
│ • ProgressRepository  │ │ • VirtualLedgerService│ │ • SyntheticGenerator  │
│ • QuizEvaluator       │ │ • RmsCheckService     │ │ • CorporateActionAdj  │
└───────────────────────┘ └───────────────────────┘ └───────────────────────┘
```

**Inter-Service Communication**: In-process synchronous Java method calls across module boundaries using strongly-typed service interfaces. Event communication handled via Spring `ApplicationEventPublisher`.

---

### 3. Background Scheduled Jobs
1. **Daily Challenge Rotator**: Fires daily at 00:00:00 UTC via `@Scheduled(cron = "0 0 0 * * *")` to select 3 new randomized historical scenarios and reset daily competition leaderboards.
2. **RMS Margin Evaluator**: Runs every 1 second during simulated active market hours to check open positions against required maintenance margins and issue automated margin calls.
3. **End-of-Day Settlement Job**: Simulates MTM cash credits/debits, exercises expiring in-the-money options contracts, and accrues overnight interest or roll charges.

