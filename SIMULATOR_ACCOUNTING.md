# Virtual Accounting & Ledger Specification
## Project: MarketMaster Academy
**Standard**: Double-Entry Financial Accounting Ledger  
**Version**: 1.0.0  

---

### 1. Double-Entry Accounting Philosophy
To ensure mathematical precision, MarketMaster Academy models virtual cash using banking-standard immutable ledger transactions. Virtual balances are never modified via arbitrary updates (`UPDATE balance = balance + 100`). Instead, every financial event creates a cryptographically auditable debit/credit journal entry.

```
┌────────────────────────────────────────────────────────┐
│                   LEDGER INVARIANT                     │
│                                                        │
│  Current Cash Balance = Starting Balance               │
│                       + Sum(Credits)                   │
│                       - Sum(Debits)                    │
└────────────────────────────────────────────────────────┘
```

---

### 2. Statutory Cost Calculation Matrix (Indian Markets)

```java
public record TradeCharges(
    BigDecimal brokerage,
    BigDecimal stt,
    BigDecimal exchangeTurnoverFee,
    BigDecimal sebiTurnoverFee,
    BigDecimal stampDuty,
    BigDecimal gst,
    BigDecimal totalCharges
) {}
```

#### Detailed Breakdown by Product Type:
1. **Equity Delivery (CNC)**:
   * Brokerage: Zero (Free discount broker model).
   * STT: 0.1% on both Buy and Sell turnover.
   * Exchange Fee: 0.00345% of total turnover.
   * Stamp Duty: 0.015% on Buy turnover only.
   * SEBI Charges: ₹10 per crore (0.0001%).
   * GST: 18% applied to (Brokerage + Exchange Fee + SEBI Fee).
2. **Equity Intraday (MIS)**:
   * Brokerage: ₹20 or 0.03% per executed order (whichever is lower).
   * STT: 0.025% on Sell turnover only.
   * Stamp Duty: 0.003% on Buy turnover.
3. **Futures & Options (F&O)**:
   * Futures STT: 0.0125% on Sell turnover.
   * Options STT: 0.0625% on Sell premium turnover. If exercised ITM, 0.125% on intrinsic settlement value.
   * Exchange Fee: 0.053% of premium turnover (Options).

---

### 3. Mark-to-Market (MTM) Real-Time Accounting
$$\text{Realized P&L} = \sum (\text{Sell Quantity} \times \text{Sell Price}) - \sum (\text{Buy Quantity} \times \text{Buy Price}) - \text{Total Charges}$$

$$\text{Unrealized P&L} = (\text{LTP} - \text{Average Cost Price}) \times \text{Net Open Quantity}$$

$$\text{Account Equity} = \text{Cash Balance} + \text{Unrealized P&L}$$

