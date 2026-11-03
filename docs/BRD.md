# Business Requirements Document (BRD)
## Project: MarketMaster Academy
**Author**: Systems Architecture & Strategy Group  
**Version**: 1.0.0  
**Classification**: Educational Technology & Financial Systems  

---

### 1. Executive Summary & Business Vision
MarketMaster Academy is a unified digital financial university and multi-asset market simulation ecosystem. Its mission is to democratize financial literacy and professional trading acumen across global and Indian markets with absolute risk-free simulation, high-fidelity order execution, and zero financial gatekeeping (operating on a strict ₹0 infrastructure budget).

#### Business Objectives:
1. **Bridge the Theory-Execution Gap**: Eliminate retail trading failure caused by disjointed theory and high-stress live capital execution.
2. **Standardized Pedagogical Mastery**: Provide a 6-tier granular curriculum (Levels 0 through 5) mapped directly to official regulatory frameworks (SEBI, NSE, BSE, MCX, CME, IBKR).
3. **Institutional-Grade Simulation**: Deliver realistic paper trading featuring slippage, liquidity modeling, order-book depth, F&O Greeks, and post-trade statutory charges.
4. **Accessible Multi-Platform Delivery**: Provide full web accessibility (Next.js 15) and a standalone offline-first native Android app (Kotlin + Jetpack Compose) without reliance on paid services or paid app store publisher registrations.

---

### 2. Stakeholder Analysis & User Personas

| Persona | Background | Pain Point | Platform Solution |
| :--- | :--- | :--- | :--- |
| **Beginner Investor** | College student / young professional | Intimidated by jargon, fear of capital loss, vulnerable to social media financial scams. | Level 0 & 1 foundational modules, compounding calculators, risk-free equity paper trading. |
| **Active Swing/Day Trader** | Intermediate retail trader | Inconsistent execution, poor stop-loss placement, misunderstanding of market microstructure. | ChartingPark-style candle replay engine, blind historical charts, Daily Setup Challenges. |
| **Derivatives Trader** | F&O aspirant | High leverage blowouts, IV crush, misunderstand options Greeks and margin shortfalls. | Interactive options payoff simulator, dynamic Greeks matrix, realistic SPAN-style margin engine. |
| **Quantitative Algo Trader** | CS/Finance engineer | Lack of clean historical testbed, unrealistic fill assumptions in basic backtesters. | Level 4 Strategy Lab, Python client-side sandbox (Pyodide), TWAP/VWAP/POV execution slicers. |
| **Compliance & Educator** | Academic / Trainer | Needs vetted, unbiased curriculum conforming to SEBI and exchange standards. | Verifiable courseware, non-commercial educational disclosures, zero gamified dark patterns. |

---

### 3. Core Functional Requirements Scope

#### 3.1 Learning Content Management & Academy
* **Granular Concept Structure**: Every financial concept (e.g., Bid-Ask Spread, Tick Size, Slippage) isolated into an independent 10-point learning unit.
* **Progress Tracking & Verification**: Skill mastery scoring, prerequisite verification, and end-of-module concept assessments.
* **Offline Learning**: Local caching of course text, formulas, and visual calculators on Android devices.

#### 3.2 Market Simulation & Paper Trading
* **Multi-Asset Support**: Indian Equities (NSE/BSE), Equity Derivatives (NIFTY/BANKNIFTY Futures & Options), Commodities (MCX Gold/Silver/Crude), Currencies (USDINR), and Global Macro benchmarks.
* **Order Lifecycle & Mechanics**: Support for Market, Limit, Stop-Loss, Stop-Limit, Bracket Orders (BO), Cover Orders (CO), and GTT (Good Till Triggered).
* **Realistic Execution Model**: Algorithmic slippage based on volume-to-depth ratio and ATR volatility; realistic partial fill simulation.
* **Statutory Post-Trade Cost Ledger**: Automated deduction of simulated Brokerage, STT, Exchange Turnover Fees, SEBI Turnover Fees, Stamp Duty, and GST.

#### 3.3 Strategy Lab & Execution Algorithms
* **Time-Slice Algorithms**: Time-Weighted Average Price (TWAP) and Volume-Weighted Average Price (VWAP).
* **Participation Algorithms**: Percentage of Volume (POV) with Price Band limit envelopes and Slot Distributors.
* **Stealth & Liquidity Seekers**: Iceberg Orders with configurable display sizes, Smart Incognito randomizers, and Cash-Futures Arbitrage detectors.
* **Historical Candle Replay**: Candle-by-candle step forward, play, pause, speed adjustment, with blind mode (hidden ticker and dates) to eliminate hindsight bias.

---

### 4. Regulatory & Non-Functional Business Constraints

1. **Strict Educational Disclaimers**: All screens and statements must unambiguously state: *"Educational simulation only. Virtual currency has no monetary value. No real financial services, securities broking, or investment advisory provided."*
2. **Zero-Cost Budget Guardrail**: System design must function with 100% free open-source software, free cloud tiers (Vercel, Cloudflare, Supabase/Neon), and direct APK distribution.
3. **Data Minimization & Ethical Design**: Zero dark patterns, no gambling mechanics, no predatory ads, explicit age consent, and instantaneous user data deletion mechanisms complying with India DPDP Act 2023 and GDPR.

