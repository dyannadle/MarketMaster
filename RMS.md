# Risk Management System (RMS) Technical Specification
## Project: MarketMaster Academy
**Author**: Quantitative Risk & RMS Committee  
**Version**: 1.0.0  

---

### 1. Margin Models & Exposure Checks

#### 1.1 Equity Delivery (CNC - Cash and Carry)
* **Requirement**: 100% upfront cash required.
* **Margin Check**: $\text{Available Cash} \ge \text{Quantity} \times \text{Limit Price}$.

#### 1.2 Equity Intraday (MIS - Margin Intraday Square-off)
* **Requirement**: Leverage of up to 5x (20% initial margin) provided on approved liquid large-cap stocks.
* **Margin Check**: $\text{Required Margin} = \frac{\text{Quantity} \times \text{Price}}{5}$.

#### 1.3 Derivatives (F&O) SPAN & Exposure Margin
* **SPAN Margin (Standard Portfolio Analysis of Risk)**:
  * Calculates maximum portfolio loss across 16 extreme volatility and price scenario shifts.
* **Exposure Margin**:
  * An additional safety buffer (e.g. 3% to 5% of contract value) mandated by exchange regulations to absorb unforeseen fat-tail shocks.
* **Total Required Margin**:
  $$\text{Total Margin} = \text{SPAN Margin} + \text{Exposure Margin}$$

---

### 2. RMS Liquidation & Margin Call Lifecycle

```
[Real-Time MTM Monitoring Thread]
           │
           ▼
Calculate Margin Utilization:
Utilization % = (Margin Blocked / Account Equity) * 100
           │
           ├─ If Utilization < 80%  ──► [NORMAL STATE] (Full order functionality)
           │
           ├─ If Utilization >= 80% ──► [MARGIN CALL WARNING]
           │                            • Visual Alert Pill in UI
           │                            • New position expansion blocked
           │
           └─ If Utilization >= 100% ─► [FORCED LIQUIDATION EVENT]
                                        • Trigger auto-square-off of open positions
                                        • Liquidate highest-risk F&O positions first
                                        • Post RMS penalty fee (simulated ₹50)
```

---

### 3. Exposure Limits & Circuit Filters
* **Single Stock Concentration Limit**: Maximum 25% of virtual account equity can be allocated to a single non-index equity instrument.
* **Exchange Circuit Breakers**:
  * Simulated market-wide circuit limits at 10%, 15%, and 20% index drops.
  * Individual stock circuit bands (2%, 5%, 10%, 20%) halt continuous trading and convert order matching into periodic call auctions.

