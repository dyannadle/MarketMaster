# Product Requirements Document (PRD)
## Project: MarketMaster Academy
**Status**: Approved  
**Version**: 1.0.0  

---

### 1. Product Overview & Key Pillars
MarketMaster Academy provides an end-to-end simulation and education platform combining:
1. **Interactive Digital University**: Structured hierarchy from zero to institutional quant.
2. **High-Fidelity Trading Terminal**: Realistic web and mobile terminal simulating exchange matching, depth, and order queues.
3. **Structured Practice Gym**: ChartingPark-style historical replay, Blind Setup Challenges, and Pattern Drills.
4. **Strategy & Algo Lab**: Systematic backtesting, order slicing algorithms, and custom code sandboxing.
5. **Portfolio, Risk & RMS Dashboard**: Equity curve tracking, drawdown metrics, Sharpe/Sortino ratios, and margin monitoring.

---

### 2. Feature Specifications & User Epics

#### Epic 1: Academy & Interactive Concept Player
* **PRD-ACAD-01**: Concept Unit Page must display ELI5 definition, formal definition, formula derivation, ASCII/SVG visual diagram, worked example, common retail traps, and a 4-question quiz.
* **PRD-ACAD-02**: Interactive embedded calculators (Compounding, Option Payoff, Leverage/Margin, Position Sizing, Bond Yield-to-Maturity).
* **PRD-ACAD-03**: Progression logic unlocking subsequent modules only when prerequisite assessment score $\ge 75\%$.

#### Epic 2: Market Terminal & Paper Trading
* **PRD-TRAD-01**: Multi-asset Watchlist with real-time or historical replay price tickers, change %, bid/ask, and volume.
* **PRD-TRAD-02**: Interactive Candlestick Charts powered by TradingView Lightweight Charts (Timeframes: 1m, 5m, 15m, 1h, 1D).
* **PRD-TRAD-03**: Level 2 Order Book (Market Depth 5x5) displaying simulated buyer/seller queues and order book imbalance.
* **PRD-TRAD-04**: Order Entry Panel supporting Market, Limit, SL, SL-M, Target (TP), Trailing SL, and Bracket Orders.
* **PRD-TRAD-05**: Order Manager with distinct tabs: Open Orders, Executed Fills, Active Positions, Holdings Portfolio, and Cash/Margin Ledger.

#### Epic 3: ChartingPark-Style Structured Practice Gym
* **PRD-GYM-01 (Rated Mode)**:
  * Generates random historical asset with hidden ticker name (`ASSET_X`) and obscured calendar dates.
  * Enforces mandatory Stop-Loss on every trade entry.
  * Maximum hold limit of 90 simulated bars before auto-liquidation.
  * Updates persistent user Skill Rating (Elo/Glicko-2) based on expectancy and risk/reward discipline.
* **PRD-GYM-02 (Daily Challenge)**:
  * 3 standardized historical market scenarios released daily at 00:00 UTC.
  * User submits Long/Short/Skip with defined SL/TP; outcome calculated immediately upon playback.
  * Global daily leaderboard ranked by Net R-multiple achieved.
* **PRD-GYM-03 (Patterns Mode)**:
  * Rapid drills focusing on chart pattern recognition (Double Top, Head & Shoulders, Bull Flag, Fair Value Gap).
  * 30-second decision timer per flashcard setup.

#### Epic 4: Strategy Lab & Execution Algorithms
* **PRD-ALGO-01**: TWAP execution slicer with configurable duration, slice count, and randomized intervals.
* **PRD-ALGO-02**: VWAP execution slicer with historical intraday volume profile matching.
* **PRD-ALGO-03**: POV (Percentage of Volume) execution with maximum participation limit and price band collar.
* **PRD-ALGO-04**: Iceberg order builder with total quantity, disclosed display quantity, and refresh variance.
* **PRD-ALGO-05**: Backtesting workspace with configurable slippage (0.01% - 0.5%), brokerage presets, and benchmark comparisons.

#### Epic 5: Risk Management System (RMS)
* **PRD-RMS-01**: Initial and Maintenance Margin checks preventing order placement if available virtual margin $< \text{Required Margin}$.
* **PRD-RMS-02**: Real-time Mark-to-Market (MTM) calculation across open positions.
* **PRD-RMS-03**: Margin Call warning triggered at $80\%$ margin utilization; forced liquidation triggered at $100\%$ margin utilization.

---

### 3. User Flows & Wireframe Specifications

```
Flow A: Learn -> Practice Loop
[Concept Lesson] -> [Embedded Interactive Widget] -> [Mini-Quiz (4 Qs)] ->
[Click: "Practice in Simulator"] -> [Pre-loaded Replay Setup] -> [Execute Order] ->
[Review Trade P&L & TCA Analysis] -> [Unlock Next Concept]

Flow B: Daily Challenge
[Dashboard: Daily Challenge Card] -> [Load Setup 1/3 (Hidden Asset)] ->
[Analyze Structure & Depth] -> [Place Order with Mandatory SL/TP] ->
[Play Replay to Target/Stop] -> [Repeat for Setup 2 & 3] ->
[View Final Score & Global Rank]
```

