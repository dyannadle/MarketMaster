# Risk Management System (RMS) Technical Specification
## Project: MarketMaster Academy
**Author**: Quantitative Risk & RMS Committee  
**Version**: 1.1.0  

---

### 1. RMS Margin Monitoring & Liquidation Lifecycle

```mermaid
flowchart TD
    StartCheck["Periodic RMS Evaluation Loop (Every 1 Second)"] --> FetchAccount["Fetch Account Equity & Open Positions"]
    
    FetchAccount --> CalcMTM["Compute Real-Time Mark-to-Market (MTM):
    Equity = Cash Balance + Unrealized PnL"]
    
    CalcMTM --> CalcReqMargin["Compute Required Maintenance Margin:
    Total Required = Sum(SPAN Margin + Exposure Margin)"]
    
    CalcReqMargin --> ComputeRatio["Calculate Margin Utilization:
    Ratio = (Total Required Margin / Equity) * 100"]
    
    ComputeRatio --> EvalRatio{"Evaluate Margin Ratio"}
    
    EvalRatio -->|< 80%| StateNormal["State: HEALTHY
    • Full trading & new order placement permitted"]
    
    EvalRatio -->|80% to 99%| StateWarning["State: MARGIN CALL WARNING
    • Amber warning pill displayed in UI
    • New risk-increasing positions blocked
    • Warning alert sent via WebSocket"]
    
    EvalRatio -->|>= 100%| StateLiquidation["State: FORCED LIQUIDATION
    • Trigger emergency auto-square-off engine
    • Cancel all resting unexecuted orders
    • Sequentially liquidate open positions"]
    
    StateLiquidation --> RankPositions["Rank Open Positions by Risk Contribution"]
    RankPositions --> SquareOffLoop["Send Aggressive Market Close Orders
    until Margin Utilization drops < 75%"]
    
    SquareOffLoop --> DeductPenalty["Deduct Simulated Auto-Square-Off Fee (₹50)"]
    DeductPenalty --> NotifyUser["Dispatch Critical Liquidation Notification to User"]
```

---

### 2. Multi-Scenario SPAN Margin Risk Matrix

In accordance with official Indian exchange (NSE Clearing) regulations, derivatives margin is calculated across 16 extreme price and implied volatility shift scenarios:

```mermaid
xychart-beta
    title "SPAN Risk Loss Profile Across 16 Scenario Price Shifts"
    x-axis ["-3.0 SD", "-2.2 SD", "-1.5 SD", "-0.7 SD", "0.0 SD (Base)", "+0.7 SD", "+1.5 SD", "+2.2 SD", "+3.0 SD"]
    y-axis "Potential Portfolio Loss (₹ Thousands)" 0 --> 120
    bar [115, 85, 55, 25, 0, 18, 48, 78, 108]
    line [115, 85, 55, 25, 0, 18, 48, 78, 108]
```

* **Maximum Scan Loss**: The worst-case loss across all 16 scenarios determines the base SPAN requirement.
* **Calendar Spread Benefit**: Offsetting near-month and far-month positions receive an 80% margin relief discount to simulate institutional capital efficiency.

---

### 3. Forced Liquidation Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant Engine as RMS Daemon Thread
    participant DB as Virtual Accounts DB
    participant Matching as Order Matching Core
    participant WS as WebSocket Hub
    participant Client as Trader UI

    Engine->>DB: Query Open Positions & Current LTP
    DB-->>Engine: Positions Snapshot: Long 100 NIFTY, Short 200 BANKNIFTY
    Engine->>Engine: Recompute MTM: Account Equity drops to ₹45,000 (Req: ₹50,000)
    Note over Engine: Margin Utilization = 111.1% (Exceeds 100% Threshold!)
    
    Engine->>Matching: Emergency Cancel All Pending Orders
    Matching-->>Engine: Pending Orders Cancelled
    
    Engine->>Matching: Submit Market Order: SELL 100 NIFTY (Square-Off)
    Matching-->>Engine: Order Filled @ Current Bid
    
    Engine->>DB: Update Equity & Blocked Margin
    Note over Engine: Margin Utilization drops to 68% (Safe Zone Restored)
    
    Engine->>WS: Emit Event: FORCED_LIQUIDATION_EXECUTED
    WS-->>Client: Critical Red Banner: "Forced Square-off Executed due to Margin Shortfall"
```
