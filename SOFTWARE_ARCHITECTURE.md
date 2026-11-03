# Software Architecture & Clean Code Blueprint
## Project: MarketMaster Academy
**Standards**: Clean Architecture, Hexagonal / Ports & Adapters  
**Version**: 1.0.0  

---

### 1. Architectural Layers & Dependency Rule

```
┌────────────────────────────────────────────────────────┐
│ 1. Frameworks & Drivers (Web, DB, Devices, UI)        │
│    Next.js UI, Android Jetpack Compose, Spring WebMVC,│
│    PostgreSQL JDBC, Redis Driver, Room ORM            │
├────────────────────────────────────────────────────────┤
│ 2. Interface Adapters (Controllers, Gateways, Present) │
│    REST Controllers, WebSocket Handlers, DTO Mappers,  │
│    Repository Implementations, ViewModels              │
├────────────────────────────────────────────────────────┤
│ 3. Application Business Rules (Use Cases)              │
│    PlaceOrderUseCase, StepReplayUseCase,               │
│    SubmitQuizUseCase, CalculateMarginUseCase           │
├────────────────────────────────────────────────────────┤
│ 4. Enterprise Business Rules (Entities & Value Objects)│
│    Order, Position, Account, Currency, PnL,            │
│    GreeksCalculator, SlippageModel, MarginSchedule     │
└────────────────────────────────────────────────────────┘
```

**The Dependency Rule**: Source code dependencies point strictly inwards towards high-level policies. The domain entity layer has zero knowledge of databases, UI, frameworks, or libraries.

---

### 2. Package Structure (Backend Java / Kotlin)

```
com.marketmaster.academy/
├── domain/
│   ├── model/
│   │   ├── order/ (SimulatedOrder, OrderType, OrderStatus, OrderSide)
│   │   ├── position/ (VirtualPosition, PositionType, MtmSnapshot)
│   │   ├── account/ (VirtualAccount, CashBalance, LedgerEntry)
│   │   ├── learning/ (Course, Module, Concept, Quiz, Assessment)
│   │   └── market/ (Instrument, Ticker, Candle, OrderBookDepth)
│   ├── port/
│   │   ├── in/ (PlaceOrderPort, EvaluateQuizPort, StreamCandlePort)
│   │   └── out/ (OrderRepositoryPort, AccountLedgerPort, MarketDataPort)
│   └── service/ (MatchingEngineService, RmsRiskService, PricingService)
├── application/
│   ├── usecase/ (PlaceOrderService, ReplaySessionService, QuizEvaluationService)
│   └── dto/ (OrderRequestDto, OrderResponseDto, ReplayStateDto)
├── infrastructure/
│   ├── adapter/
│   │   ├── in/web/ (OrderRestController, ReplayWebSocketController)
│   │   ├── out/persistence/ (PostgresOrderRepository, JpaEntityMappers)
│   │   └── out/marketdata/ (CsvHistoricalCandleSource, GbmSyntheticFeeder)
│   └── configuration/ (SecurityConfig, WebSocketConfig, CacheConfig)
```

---

### 3. Frontend Architecture (Next.js 15)

```
src/
├── app/
│   ├── (auth)/login, register, forgot-password
│   ├── (dashboard)/overview, analytics, journal
│   ├── academy/[levelId]/[courseId]/[conceptId]/page.tsx
│   ├── terminal/page.tsx (Interactive Paper Trading Terminal)
│   ├── gym/
│   │   ├── rated/page.tsx (Blind Chart Replay Gym)
│   │   ├── daily/page.tsx (Daily Challenge Setup)
│   │   └── patterns/page.tsx (Pattern Recognition Drills)
│   ├── strategy-lab/page.tsx (TWAP/VWAP/Algo Playground)
│   └── legal/ (privacy-policy, terms, refund, cookies)
├── components/
│   ├── charts/ (TradingViewLightweightChart.tsx, DepthBook.tsx)
│   ├── trading/ (OrderEntryModal.tsx, PositionsTable.tsx, OrdersTable.tsx)
│   ├── academy/ (ConceptPlayer.tsx, CalculatorWidget.tsx, QuizEngine.tsx)
│   └── ui/ (Button, Dialog, Toast, CookieBanner, AccessibilityPill)
├── lib/
│   ├── simulator/ (ClientMatchingEngine.ts, SlippageCalculator.ts)
│   ├── math/ (BlackScholes.ts, TechnicalIndicators.ts)
│   └── api/ (apiClient.ts, webSocketClient.ts)
└── stores/ (useAuthStore.ts, useTradingStore.ts, useReplayStore.ts)
```

