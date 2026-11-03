# Order Execution Engine Architecture
## Project: MarketMaster Academy
**Component**: Core Matching Engine & State Processor  
**Version**: 1.0.0  

---

### 1. In-Memory Order Book Data Structures
For each tradable symbol, the matching engine maintains two concurrent balanced tree structures:
```java
// Bids sorted in descending order (highest price first)
private final ConcurrentSkipListMap<BigDecimal, Queue<SimulatedOrder>> bidBook = 
    new ConcurrentSkipListMap<>(Comparator.reverseOrder());

// Asks sorted in ascending order (lowest price first)
private final ConcurrentSkipListMap<BigDecimal, Queue<SimulatedOrder>> askBook = 
    new ConcurrentSkipListMap<>(Comparator.naturalOrder());
```

Each price level holds a `ConcurrentLinkedQueue<SimulatedOrder>` to enforce strict FIFO (First-In, First-Out) time priority among competing simulated orders at identical price ticks.

---

### 2. Multi-Leg & Complex Order Execution
* **Bracket Order (BO)**:
  * Contains Parent Entry Order, Target (Take Profit) Order, and Stop-Loss Order.
  * When Parent Entry Order fills, the engine automatically registers the Target and SL as an OCO (One-Cancels-the-Other) pair.
  * When either Target or SL is executed, the remaining leg is atomically canceled.
* **Cover Order (CO)**:
  * Market or Limit entry order coupled strictly with a mandatory Stop-Loss leg to limit downside risk and maximize intraday leverage.
* **Trailing Stop-Loss**:
  * Trailing step size dynamically ratchets the Stop-Loss price upward for long positions as favorable price extremes are reached, locking in unrealized gains.

