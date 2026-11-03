# Strategy Lab & Backtesting Framework
## Project: MarketMaster Academy
**Component**: Quantitative Research, Python Sandbox & Strategy Validation  
**Version**: 1.0.0  

---

### 1. Strategy Lab Architecture Overview
The Strategy Lab provides learners and quantitative researchers with a secure, browser-based and serverless environment to design, test, optimize, and deploy algorithmic trading strategies without infrastructure overhead.

```
┌────────────────────────────────────────────────────────┐
│                   CLIENT-SIDE SANDBOX                  │
│  • Pyodide (Python 3.11 running in WebAssembly)        │
│  • NumPy, pandas, SciPy, statsmodels, talib-wasm       │
│  • Local Execution: 0 Server CPU costs, 0 API latency   │
└───────────────────────────┬────────────────────────────┘
                            │ Feed historical candles
                            ▼
┌────────────────────────────────────────────────────────┐
│              VECTORIZED & EVENT-DRIVEN ENGINE          │
│  • Signal Generation: df['signal'] = (sma_fast > sma_slow)
│  • Realistic Fill Simulation: Spread, Slippage, Fees   │
│  • Equity Curve & Drawdown Calculation                 │
└───────────────────────────┬────────────────────────────┘
                            │ Output metrics
                            ▼
┌────────────────────────────────────────────────────────┐
│               TEARSHEET & RISK REPORTING               │
│  • Sharpe Ratio, Sortino Ratio, Calmar Ratio           │
│  • Win Rate (%), Profit Factor, Expectancy             │
│  • Maximum Drawdown (%) & Underwater Chart             │
└────────────────────────────────────────────────────────┘
```

---

### 2. Standardized Performance Metrics & Formulas

#### 2.1 Sharpe Ratio (Risk-Adjusted Excess Return)
$$\text{Sharpe} = \frac{R_p - R_f}{\sigma_p} \times \sqrt{252}$$
* $R_p$: Annualized Strategy Return
* $R_f$: Risk-Free Rate (e.g. 6.5% RBI 91-day T-bill yield)
* $\sigma_p$: Annualized Standard Deviation of Strategy Daily Returns

#### 2.2 Profit Factor & Expectancy
$$\text{Profit Factor} = \frac{\sum \text{Gross Winning Trades}}{\sum |\text{Gross Losing Trades}|}$$

$$\text{Expectancy} = (P_{\text{win}} \times \text{Avg Win}) - (P_{\text{loss}} \times |\text{Avg Loss}|)$$

#### 2.3 Maximum Drawdown (MDD)
$$\text{MDD} = \max_{t \in (0, T)} \left( \frac{\text{Peak}_t - \text{Trough}_t}{\text{Peak}_t} \right) \times 100$$

