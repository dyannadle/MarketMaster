# Quality Assurance & Testing Strategy (QA)
## Project: MarketMaster Academy
**Coverage Target**: Minimum 85% Code Coverage  
**Version**: 1.0.0  

---

### 1. Test Pyramid & Automation Strategy
1. **Unit Tests (JUnit 5, Mockito, Vitest)**: Test domain formulas (Black-Scholes, Greeks, Slippage, Margin, Double-Entry Ledger) in microsecond isolation.
2. **Integration Tests (Spring Boot Test, Testcontainers)**: Test database repositories, Flyway migrations, and Redis caching.
3. **End-to-End (E2E) Tests (Playwright)**: Full browser automation testing user registration, course completion, order placement, and candle replay playback.
4. **Android Instrumentation Tests (Espresso, Compose UI Test)**: Verify UI gestures, offline Room persistence, and bottom navigation.

---

### 2. Critical Regression Test Matrix
* **Double-Entry Reconciliation**: Run 10,000 randomized synthetic trade orders and verify:
  $$\text{Ending Cash} = \text{Starting Cash} + \sum \text{Credits} - \sum \text{Debits}$$
* **Stop-Loss Gap Invariant**: Verify that a stop order during an overnight gap fills at the Open price of the gap candle, not the trigger price.
* **Margin Exhaustion Invariant**: Verify that an account cannot place an order requiring margin exceeding available virtual balance.

