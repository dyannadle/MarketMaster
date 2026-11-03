# Execution Algorithms Specification & Institutional Slicers
## Project: MarketMaster Academy
**Component**: Algorithmic Order Slicing, Strategy Lab & Execution Models  
**Version**: 1.1.0  

---

### 1. TWAP vs VWAP Slicing Comparative Architecture

```mermaid
flowchart TD
    ParentOrder["Parent Institutional Order<br/>(e.g., BUY 50,000 Reliance over 2 Hours)"]
    
    ParentOrder --> SlicerSelector{"Select Slicing Strategy"}
    
    subgraph TWAP_Pipeline["TWAP Execution Engine (Time-Weighted)"]
        SplitEqual["Calculate Equal Child Slices:<br/>Slice Qty = Total Qty / N"]
        TimeInterval["Fixed Time Interval: T = Duration / N"]
        AddJitter["Add Stochastic Time Jitter (± 10%)"]
        DispatchTWAP["Dispatch Child Orders at Scheduled Timestamps"]
    end
    
    subgraph VWAP_Pipeline["VWAP Execution Engine (Volume-Weighted)"]
        LoadHistorical["Query Historical Intraday Volume Profile: w_i = V_i / Sum(V)"]
        WeightSlices["Weight Child Slices based on Historical Curve:<br/>Slice Qty_i = Total Qty * w_i"]
        MonitorVolume["Monitor Real-Time Bar Volume Acceleration"]
        DispatchVWAP["Dispatch Child Orders Weighted by Market Activity"]
    end

    subgraph POV_Pipeline["POV Execution Engine (Participation Rate)"]
        SetRate["Set Target Participation Rate (e.g., 10% of Market Volume)"]
        ListenTicks["Listen to Executed Tape Volume"]
        AdaptiveSend["Dispatch Child Order = Market Volume * 10%"]
        CheckCollar["Check Price Band Collar (P_min <= Price <= P_max)"]
    end

    SlicerSelector -->|TWAP| SplitEqual --> TimeInterval --> AddJitter --> DispatchTWAP
    SlicerSelector -->|VWAP| LoadHistorical --> WeightSlices --> MonitorVolume --> DispatchVWAP
    SlicerSelector -->|POV| SetRate --> ListenTicks --> AdaptiveSend --> CheckCollar
```

---

### 2. Intraday Volume Profile Distribution (VWAP Curve)

Real exchange volume follows a distinct "U-shaped" curve (high volume in the opening and closing 30 minutes, quiet midday lunch period):

```mermaid
xychart-beta
    title "Typical Indian Exchange (NSE) Intraday Volume Distribution (U-Shape)"
    x-axis ["09:15", "09:45", "10:30", "11:30", "12:30", "13:30", "14:15", "15:00", "15:30"]
    y-axis "Percentage of Daily Volume (%)" 0 --> 25
    bar [22, 16, 10, 7, 5, 6, 9, 14, 21]
    line [22, 16, 10, 7, 5, 6, 9, 14, 21]
```

---

### 3. Iceberg Order Execution State Machine

```mermaid
stateDiagram-v2
    [*] --> INITIALIZED: Total Quantity = 10,000, Display Size = 500
    
    INITIALIZED --> ACTIVE_TIER: Expose 500 Shares on Order Book
    
    ACTIVE_TIER --> WAITING_FILL: Order Resting in Matching Queue
    
    WAITING_FILL --> PARTIAL_FILL: Inbound Trades Hit Top of Book
    PARTIAL_FILL --> WAITING_FILL: Active Display Shares Remaining > 0
    
    WAITING_FILL --> TRANCHE_FILLED: Active 500 Shares 100% Filled
    
    TRANCHE_FILLED --> CHECK_REMAINING{"Remaining Parent Qty > 0?"}
    CHECK_REMAINING -->|Yes| ACTIVE_TIER: Reload Next 500 Shares to Book
    CHECK_REMAINING -->|No| COMPLETE: Full 10,000 Shares Filled
    
    COMPLETE --> [*]
```

---

### 4. Cash-Futures Arbitrage Execution Mechanics

```mermaid
sequenceDiagram
    autonumber
    participant ArbBot as Arbitrage Engine
    participant SpotMarket as NSE Cash Equities
    participant FutMarket as NSE Index / Stock Futures
    participant Ledger as Virtual Accounting Core

    Note over ArbBot: Monitor Basis: Spread = Future Price - Spot Price
    ArbBot->>ArbBot: Compute Theoretical Fair Value: F* = S * exp((r - q) * T)
    
    alt Basis > Fair Value + Statutory Taxes (Overpriced Future)
        Note over ArbBot: Arbitrage Opportunity Detected! (Cash & Carry)
        ArbBot->>SpotMarket: Buy Underlying Spot Equities
        SpotMarket-->>ArbBot: Spot Filled @ ₹1,000.00
        ArbBot->>FutMarket: Sell Near-Month Futures Contract
        FutMarket-->>ArbBot: Future Sold @ ₹1,012.00
        Note over ArbBot: Locked-in Gross Spread: ₹12.00 per share
        
        Note over ArbBot,FutMarket: Fast-Forward to Expiry Day (15:30 IST)
        Note over ArbBot: At Expiry: Future Price Converges Identically to Spot Price!
        
        ArbBot->>SpotMarket: Sell Spot Equities @ Final Settlement Price
        ArbBot->>FutMarket: Buy to Close Futures @ Final Settlement Price
        ArbBot->>Ledger: Post Risk-Free Net Arbitrage Profit
    end
```
