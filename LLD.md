# Low-Level Design (LLD)
## Project: MarketMaster Academy
**Component**: Core Simulation & Accounting Domain Models  
**Language/Framework**: Java 21 / Spring Boot / TypeScript / Kotlin  
**Version**: 1.0.0  

---

### 1. Class & Interface Diagrams

#### 1.1 Order & Position Domain Models (UML Representation)

```
┌────────────────────────────────────────────────────────┐
│                        <<interface>>                   │
│                        OrderEngine                     │
├────────────────────────────────────────────────────────┤
│ + placeOrder(request: OrderPlacementRequest): Order    │
│ + cancelOrder(orderId: UUID): boolean                  │
│ + modifyOrder(orderId: UUID, req: ModifyRequest): Order│
│ + onMarketTick(tick: MarketTick): void                 │
│ + evaluatePendingOrders(candle: OHLCVCandle): void     │
└───────────────────────────▲────────────────────────────┘
                            │ implements
┌───────────────────────────┴────────────────────────────┐
│                  DefaultOrderEngine                    │
├────────────────────────────────────────────────────────┤
│ - pendingOrders: ConcurrentSkipListMap<Price, Order>   │
│ - activePositions: ConcurrentHashMap<Symbol, Position> │
│ - riskManager: RiskManagementService                   │
│ - accountingLedger: VirtualAccountingLedger           │
├────────────────────────────────────────────────────────┤
│ + processFill(order: Order, fillPrice: BigDecimal)     │
│ + applySlippage(order: Order, depth: MarketDepth): dec │
└────────────────────────────────────────────────────────┘
```

---

### 2. Concrete Data Structures & State Machine

#### 2.1 Order State Transition State Machine
```
   [CREATED]
       │ Validate margin & session
       ▼
   [SUBMITTED]
       │ Placed in virtual order book
       ▼
   [PENDING] ──(User Cancel / Expire)──► [CANCELLED]
       │ Price cross / Triggered
       ▼
 ┌───────────────┐
 │ EXECUTION     │
 └───────┬───────┘
         ├─ Partial Fill ──────► [PARTIALLY_FILLED] (re-enters pending)
         └─ Full Fill ─────────► [FILLED] ──► [ACCOUNTING POSTED]
```

#### 2.2 Domain Entities (Java Record Definitions)

```java
// Core Order Representation
public record SimulatedOrder(
    UUID orderId,
    UUID accountId,
    String symbol,
    AssetClass assetClass,      // EQUITY, FUTURES, OPTIONS, COMMODITY, FOREX
    OrderSide side,             // BUY, SELL
    OrderType orderType,         // MARKET, LIMIT, SL_MARKET, SL_LIMIT
    ProductType productType,    // INTRADAY_MIS, DELIVERY_CNC, MARGIN_NRML
    BigDecimal quantity,
    BigDecimal price,           // Limit price (null for Market)
    BigDecimal triggerPrice,    // Stop price (null for non-stop)
    BigDecimal filledQuantity,
    BigDecimal averageFillPrice,
    OrderStatus status,
    Instant createdAt,
    Instant updatedAt
) {}

// Position Representation
public record VirtualPosition(
    UUID positionId,
    UUID accountId,
    String symbol,
    ProductType productType,
    BigDecimal netQuantity,     // Positive for Long, Negative for Short
    BigDecimal averageBuyPrice,
    BigDecimal averageSellPrice,
    BigDecimal realizedPnL,
    BigDecimal unrealizedPnL,
    BigDecimal initialMarginBlocked,
    Instant lastUpdatedAt
) {}
```

---

### 3. Execution Algorithms Logic Flowcharts

#### 3.1 TWAP Slicing Engine
```
Input: TotalQuantity (Q), TotalDurationMinutes (T), Slices (N)
SliceQuantity = Q / N
TimeInterval = T / N minutes

Loop i = 1 to N:
    Schedule execution at (StartTime + (i - 1) * TimeInterval + RandomJitter)
    When triggered:
        Check Market State & Order Book
        Send Child Limit Order at Current Best Bid/Ask
        Wait for fill or timeout (60 seconds)
        If timeout: convert remainder to aggressive market order
```

#### 3.2 Slippage Calculation Function
```java
public BigDecimal calculateSlippage(BigDecimal requestedPrice, BigDecimal orderQty, BigDecimal avgDailyVolume, BigDecimal atr14, OrderSide side) {
    // Non-linear market impact model
    double volumeRatio = orderQty.doubleValue() / Math.max(1.0, avgDailyVolume.doubleValue() * 0.01);
    double impactTicks = Math.pow(volumeRatio, 0.6) * 0.15 * (atr14.doubleValue() / 0.05);
    BigDecimal slippageAmount = BigDecimal.valueOf(Math.max(0.0, impactTicks * 0.05));
    
    return side == OrderSide.BUY 
        ? requestedPrice.add(slippageAmount) 
        : requestedPrice.subtract(slippageAmount);
}
```

