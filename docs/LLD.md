# Low-Level Design (LLD)
## Project: MarketMaster Academy
**Component**: Core Matching Engine, State Machine & Domain Models  
**Language/Framework**: Java 21 LTS / Spring Boot 3.3 / TypeScript / Kotlin  
**Version**: 1.1.0  

---

### 1. Order Lifecycle State Machine (`stateDiagram-v2`)

The order lifecycle strictly enforces deterministic state transitions. No illegal transitions (e.g. from `CANCELLED` to `FILLED`) are mathematically possible.

```mermaid
stateDiagram-v2
    [*] --> CREATED: User Submits Order
    CREATED --> REJECTED: RMS Margin / Lot Size Failure
    CREATED --> SUBMITTED: Validation & Margin Check Passed
    
    SUBMITTED --> PENDING: Placed in Matching Engine Queue
    
    PENDING --> CANCELLED: User Requests Cancellation
    PENDING --> EXPIRED: Session / Horizon 90-Day Auto-Close
    
    PENDING --> PARTIALLY_FILLED: Depth Exhausted / Partial Match
    PARTIALLY_FILLED --> PARTIALLY_FILLED: Subsequent Partial Match
    PARTIALLY_FILLED --> FILLED: Final Remainder Filled
    
    PENDING --> FILLED: Full Order Executed
    
    FILLED --> ACCOUNTING_COMMITTED: Ledger Posted & Taxes Deducted
    ACCOUNTING_COMMITTED --> [*]
    REJECTED --> [*]
    CANCELLED --> [*]
    EXPIRED --> [*]
```

---

### 2. Comprehensive Domain Class Diagram (`classDiagram`)

```mermaid
classDiagram
    direction TB

    class SimulatedOrder {
        +UUID orderId
        +UUID accountId
        +String symbol
        +AssetClass assetClass
        +OrderSide side
        +OrderType orderType
        +ProductType productType
        +BigDecimal quantity
        +BigDecimal price
        +BigDecimal triggerPrice
        +BigDecimal filledQuantity
        +BigDecimal averageFillPrice
        +OrderStatus status
        +BigDecimal stopLossPrice
        +BigDecimal takeProfitPrice
        +Instant createdAt
        +isFullyFilled() boolean
    }

    class VirtualPosition {
        +UUID positionId
        +UUID accountId
        +String symbol
        +ProductType productType
        +BigDecimal netQuantity
        +BigDecimal buyQuantity
        +BigDecimal buyAverage
        +BigDecimal sellQuantity
        +BigDecimal sellAverage
        +BigDecimal realizedPnL
        +BigDecimal unrealizedPnL
        +updateOnFill(fillPrice, qty, side) void
    }

    class VirtualAccount {
        +UUID accountId
        +UUID userId
        +AccountType accountType
        +BigDecimal initialBalance
        +BigDecimal cashBalance
        +BigDecimal marginBlocked
        +BigDecimal getEquity(unrealizedPnL)
        +getFreeMargin() BigDecimal
    }

    class CashLedgerEntry {
        +UUID entryId
        +UUID accountId
        +TransactionType type
        +BigDecimal amount
        +BigDecimal runningBalance
        +UUID referenceId
        +Instant createdAt
    }

    class MarketDepth {
        +String symbol
        +List~DepthLevel~ bids
        +List~DepthLevel~ asks
        +BigDecimal getSpread()
        +BigDecimal getImbalance()
    }

    VirtualAccount "1" *-- "many" SimulatedOrder : owns
    VirtualAccount "1" *-- "many" VirtualPosition : maintains
    VirtualAccount "1" *-- "many" CashLedgerEntry : audits
    SimulatedOrder ..> MarketDepth : matched against
```

---

### 3. Detailed Matching Engine Algorithm Flowchart

```mermaid
flowchart TD
    StartTick["New Candle or Market Depth Tick Arrives"] --> ReadBook["Inspect Pending Orders for Symbol"]
    
    ReadBook --> OrderTypeCheck{"Order Type?"}
    
    OrderTypeCheck -->|MARKET BUY| ExecMarketBuy["Match against Best Ask<br/>Apply Dynamic Slippage Model"]
    OrderTypeCheck -->|MARKET SELL| ExecMarketSell["Match against Best Bid<br/>Apply Dynamic Slippage Model"]
    
    OrderTypeCheck -->|LIMIT BUY| CheckLimitBuy{"Is High >= Limit Price?"}
    OrderTypeCheck -->|LIMIT SELL| CheckLimitSell{"Is Low <= Limit Price?"}
    
    OrderTypeCheck -->|STOP LOSS| CheckStop{"Has Price Crossed Trigger Price?"}
    
    CheckLimitBuy -->|Yes| SimulateQueue["Simulate Queue Priority<br/>(Time in Book vs Bar Volume)"]
    CheckLimitBuy -->|No| KeepPending["Retain Order in Book as PENDING"]
    
    CheckLimitSell -->|Yes| SimulateQueue
    CheckLimitSell -->|No| KeepPending
    
    CheckStop -->|Yes| ConvertToMarket["Convert to Aggressive Market Order<br/>(Handle Gap Openings)"]
    CheckStop -->|No| KeepPending
    
    SimulateQueue --> CheckLiquidity{"Available Volume >= Order Qty?"}
    CheckLiquidity -->|Full| FullFill["Mark Status: FILLED<br/>Fill Price = Limit Price"]
    CheckLiquidity -->|Partial| PartialFill["Mark Status: PARTIALLY_FILLED<br/>Remainder remains PENDING"]
    
    ExecMarketBuy --> PostLedger["Invoke Double-Entry Accounting Ledger"]
    ExecMarketSell --> PostLedger
    ConvertToMarket --> PostLedger
    FullFill --> PostLedger
    PartialFill --> PostLedger
    
    PostLedger --> BroadcastUpdate["Broadcast Order & Account Update via WebSocket"]
```

---

### 4. Dynamic Algorithmic Slippage Formula & Derivation

In production equity and derivatives markets, large retail market orders deplete order book liquidity, resulting in execution at prices inferior to the quoted top-of-book. MarketMaster Academy implements a non-linear power-law market impact model:

$$\text{Impact Ticks} = \max\left(1, \left\lfloor \alpha \times \left(\frac{Q_{\text{order}}}{V_{\text{bar}} \times \kappa}\right)^{\beta} \times \frac{\text{ATR}_{14}}{\text{Tick Size}}\right\rfloor\right)$$

* $Q_{\text{order}}$: Quantity requested by the trader.
* $V_{\text{bar}}$: Total volume executed in the current bar.
* $\kappa$: Top-of-book participation factor ($\kappa = 0.02$, representing 2% of bar volume resting in top 3 depth tiers).
* $\alpha$: Volatility scaling constant ($\alpha = 0.15$ for Equities, $\alpha = 0.25$ for Options).
* $\beta$: Non-linear elasticity exponent ($\beta = 0.65$, representing concave price impact).
* $\text{ATR}_{14}$: 14-period Average True Range of the instrument.
* $\text{Tick Size}$: ₹0.05 for NSE Equities/Indices.
