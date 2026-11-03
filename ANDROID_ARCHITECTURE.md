# Android Architecture Specification
## Project: MarketMaster Academy Android Client
**Platform**: Native Android (API Level 26+ / Android 8.0 to Android 15+)  
**Language**: Kotlin 2.0+  
**UI Framework**: Jetpack Compose (Material 3)  
**Architecture**: MVI / MVVM with Clean Architecture  
**Version**: 1.0.0  

---

### 1. Technology Choices & Libraries
* **Jetpack Compose**: 100% declarative UI with fluid gesture animations for candlestick zooming, depth inspection, and interactive sliders.
* **Kotlin Coroutines & Flow**: Reactive data streams handling high-frequency market candle feeds and asynchronous Room database queries.
* **Room Database**: Complete local SQLite persistence layer for offline course access, local trade history, and saved technical chart setups.
* **Ktor Client / Retrofit 2**: Lightweight HTTP client with Moshi / Kotlinx.serialization and automatic JWT token refresh interceptor.
* **AndroidX Biometric**: Seamless fingerprint and face biometric authentication for local application lock.
* **Vico / Canvas**: High-performance native Android charting engine for candlestick rendering with zero webview overhead.

---

### 2. Module & Clean Architecture Layering

```
app/
├── core/
│   ├── designsystem/ (Colors, Typography, Shapes, CustomTheme, AccessibleComponents)
│   ├── database/ (AppDatabase, Room Entities, DAOs, TypeConverters)
│   ├── network/ (HttpClientProvider, AuthInterceptor, WebSocketManager)
│   └── util/ (GreeksCalculator, FormulaDerivations, CurrencyFormatter)
├── data/
│   ├── repository/ (CourseRepositoryImpl, OrderRepositoryImpl, MarketDataRepoImpl)
│   └── model/ (CourseEntity, OrderEntity, PositionEntity, CandleEntity)
├── domain/
│   ├── model/ (Lesson, Order, Position, Portfolio, SkillRating)
│   ├── repository/ (CourseRepository, OrderRepository, MarketDataRepository)
│   └── usecase/ (PlaceOrderUseCase, StepReplayUseCase, CalculatePnLUseCase)
└── presentation/
    ├── navigation/ (BottomNavBar, AppNavHost, ScreenRoutes)
    ├── academy/ (CourseCatalogScreen, LessonDetailScreen, QuizScreen)
    ├── terminal/ (WatchlistScreen, ChartScreen, OrderBookScreen, OrderEntrySheet)
    ├── gym/ (RatedSessionScreen, DailyChallengeScreen, PatternsScreen)
    ├── analytics/ (PortfolioAnalyticsScreen, TradingJournalScreen)
    └── settings/ (ProfileScreen, SecurityScreen, PrivacyDataScreen)
```

---

### 3. Offline-First Synchronization Strategy
1. **Curriculum Cache**: All 6 Levels of course text, SVG diagrams, and quiz questions are bundled inside local SQLite / pre-packaged Room assets. The app functions 100% offline without requiring internet.
2. **Local Simulation Mode**: If disconnected from network, the order matching engine runs locally on SQLite inside the Android client, allowing practice anytime on airplanes, trains, or low-connectivity zones.
3. **Optimistic Sync**: When network reconnects, local offline trade stats, quiz scores, and journal entries are synchronized with the cloud backend via idempotent reconciliation APIs.

