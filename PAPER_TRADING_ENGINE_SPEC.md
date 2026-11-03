# Paper Trading Engine Technical Specification
## Project: MarketMaster Academy
**Component**: Execution, Queue Matching & Fill Simulation Subsystem  
**Version**: 1.0.0  

---

### 1. Engine Core Pipeline & Matching Rules

```
[Incoming Order Request]
       │
       ▼
[1. Validation Filter]
├── Check Active Trading Session
├── Check Price Tick (e.g., 0.05 multiples)
├── Check Lot Size (e.g., NIFTY = 25 or 50)
└── Check RMS Margin (Cash >= Required Margin)
       │ Pass
       ▼
[2. Execution Evaluator]
├── If MARKET Order ──► Calculate Slippage ──► Immediate Fill
└── If LIMIT / STOP ──► Queue into Priority Book
       │
       ▼
[3. Candle Tick Matching (Per Tick/Bar)]
├── Check if High >= Limit Buy or Low <= Limit Sell
├── Simulate Depth Queue Position:
│     Time-in-Book / Bar Volume >= Queue Threshold
└── If Triggered ──► Process Fill (Full or Partial)
       │
       ▼
[4. Double-Entry Accounting Ledger]
├── Debit/Credit Virtual Cash Balance
├── Deduct Brokerage & Taxes (STT, Stamp Duty, GST)
├── Update Virtual Position Record (Avg Price & Net Qty)
└── Emit WebSocket "OrderFilled" Event
```

---

### 2. Algorithmic Slippage Simulation Formula
To ensure paper trading builds real-world discipline rather than unrealistic expectations, market orders apply a dynamic slippage penalty:

$$\text{Slippage (Ticks)} = \max\left(1, \left\lfloor 0.15 \times \left(\frac{Q_{\text{order}}}{V_{\text{bar}} \times 0.02}\right)^{0.65} \times \frac{\text{ATR}_{14}}{\text{Tick Size}}\right\rfloor\right)$$

* For a **BUY** order: $\text{Fill Price} = \text{Ask Price} + (\text{Slippage} \times \text{Tick Size})$
* For a **SELL** order: $\text{Fill Price} = \text{Bid Price} - (\text{Slippage} \times \text{Tick Size})$

---

### 3. Gap Execution Simulation (Overnight & Session Halts)
If an order is a **Stop-Loss Sell** at ₹100.00, and the subsequent candle opens at ₹92.00:
* **Real-World Reality**: The stop is triggered at market, filling at the first available auction price.
* **Simulator Rule**: The fill price is recorded as **₹92.00**, NOT ₹100.00. This teaches learners the critical concept of overnight gap risk and why stop-loss orders do not guarantee execution at the trigger price.

