# Unified Trading Engine Architecture
## Project: MarketMaster Academy
**Component**: End-to-End Trading Subsystem Overview  
**Version**: 1.0.0  

---

### 1. Architectural Scope
The Trading Engine encompasses the complete lifecycle of financial market operations:
1. **Instrument Master**: Contract specifications, lot sizes, tick sizes, expiries, trading hours.
2. **Order Management System (OMS)**: Order validation, state transitions, client communication.
3. **Execution Management System (EMS)**: Matching engine, slippage algorithms, partial fills.
4. **Position Keeper & Portfolio**: Net open positions, realized/unrealized P&L, holdings.
5. **Virtual Clearing & Settlement**: Double-entry cash ledger, corporate action adjustments, expiry settlement.

---

### 2. Supported Asset Classes & Indian Market Specifications

| Asset Class | Symbols / Underlyings | Lot Size | Tick Size | Product Types Supported |
| :--- | :--- | :--- | :--- | :--- |
| **NSE Equities** | Reliance, TCS, HDFC Bank, Infosys, + Nifty 500 | 1 | ₹0.05 | MIS (Intraday), CNC (Cash & Carry) |
| **Index Futures**| NIFTY FUT, BANKNIFTY FUT, FINNIFTY FUT | 25 / 15 / 25 | ₹0.05 | MIS, NRML |
| **Index Options**| Weekly & Monthly Calls/Puts across strikes | 25 / 15 / 25 | ₹0.05 | MIS, NRML |
| **MCX Commodities**| Gold Mini, Silver Mini, Crude Oil, Natural Gas | Standard MCX | ₹1.00 / ₹0.10 | MIS, NRML |
| **NSE Currency** | USDINR, EURINR, GBPINR, JPYINR | 1000 | ₹0.0025 | MIS, NRML |

---

### 3. Expiry & Settlement Mechanics
* **Cash-Settled Derivatives (Index F&O)**:
  * At 15:30 on expiry date, contracts settle against the official index closing price.
  * In-The-Money (ITM) options expire into cash credits/debits based on intrinsic value:
    $$\text{Cash Settlement} = \max(0, \text{Closing Price} - \text{Strike Price}) \times \text{Quantity}$$
  * Out-of-The-Money (OTM) options expire worthless (value = 0).
* **Corporate Actions**:
  * Stock splits, bonus shares, and cash dividends automatically adjust historical charts, active holdings, and pending limit orders to preserve parity.

