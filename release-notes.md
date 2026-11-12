# MarketMaster Release Notes
> Official release history, version designations, features delivered, and architectural enhancements.

---

### Release v1.0.36 (Current — Native Android Packaging & Standalone APK Assembly)
* **Release Date**: 2026-11-12 22:55 IST
* **Status**: `STABLE / FULLY VERIFIED & AUTOMATED`
* **Key Enhancements**:
  * **Native Android Gradle 8.7 Compilation & APK Assembly**:
    * Provisioned Gradle Wrapper 8.7 (`gradle-wrapper.jar`) and aligned repository modes in `settings.gradle`.
    * Resolved resource linking by provisioning vector launcher icon (`ic_launcher.xml`).
    * Refactored main Android container activity (`MainActivity.java`) with Java 17 to eliminate Kotlin keyword naming restrictions.
    * Successfully assembled standalone debug APK: `android/app/build/outputs/apk/debug/app-debug.apk` (6.31 MB).
  * **Master Verification Engine Verified**:
    * Backend Pytest: 14/14 tests passing (100% green).
    * Frontend Vitest: 60/60 tests passing across 18 suites (100% green).
    * TypeScript: Zero errors (`tsc --noEmit`).
    * Production Nitro Build: 100% clean SSR bundle.
    * Android Container: 74 production assets compiled and synchronized.

---

### Release v1.0.35 (DPDP Right to Erasure Suite, Strict CSP v3 Headers & Synthetic Macro Regimes)
* **Release Date**: 2026-11-12 22:30 IST
* **Status**: `STABLE / FULLY VERIFIED & AUTOMATED`
* **Key Enhancements**:
  * **Option 1: Automated DPDP "Right to Erasure" End-to-End Test Suite & Strict CSP v3 Headers (PIP Part 6.1 & 6.2)**:
    * *DPDP Act 2023 Erasure Regression Suite*: Added `test_dpdp_right_to_erasure_full_cascade` in `backend/tests/test_api_endpoints.py`, verifying atomic cascade deletion across all user data, positions, orders, executions, and ledger records, with immediate JWT token invalidation (401 Unauthorized).
    * *Strict CSP v3 & Security Headers*: Configured `frontend/public/_headers` with `script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net`, `frame-ancestors 'none'`, `cross-origin-opener-policy: same-origin`, and `strict-transport-security`.
  * **Option 2: Pre-Commit Quality Gate & Documentation Synchronization Check (PIP Part 4.1)**:
    * *Pre-Commit Verification Script*: Built `scripts/pre_commit_hook.py` auditing staged changes and alerting if documentation logs (`changes.md`, `decision.md`) are out of sync per Rules 7.1 and 7.2.
  * **Option 3: Synthetic Macro Regime Presets in Strategy Lab (PIP Part 2.3 & 4.2)**:
    * *Macro Synthetic Regimes in `/lab`*: Injected selectable macro market regimes (`NORMAL`, `FLASH_CRASH`, `CHOPPY_MEAN_REVERSION`, `TRENDING_EXPANSION`) into the client vector engine and Pyodide sandbox with Merton jump shocks and volatility multipliers.
  * **Master Verification Engine Verified**:
    * Backend Pytest: **14/14 tests passing (100% green)**.
    * Frontend Vitest: **60/60 tests passing across 18 suites (100% green)**.
    * TypeScript: Zero errors (`tsc --noEmit`).
    * Production Build: 100% clean Nitro SSR bundle.
    * Android Container: 74 production assets compiled and synchronized.

---

### Release v1.0.34 (PWA Offline Replay Terminal, Alpha Desk Peer Setup Forum & Synthetic GBM Engine)
* **Release Date**: 2026-11-12 22:10 IST
* **Status**: `STABLE / FULLY VERIFIED & AUTOMATED`
* **Key Enhancements**:
  * **Option 1: PWA Offline Replay Terminal & IndexedDB Local Storage (PIP Part 3.3)**:
    * *Service Worker & Offline Caching*: Registered `frontend/public/sw.js` providing stale-while-revalidate caching for web assets, icons, fonts, and scripts.
    * *IndexedDB Historical Datasets*: Client-side storage manager (`frontend/src/lib/offline-storage.ts`) caching full 1-minute historical datasets (Nifty 50, Bank Nifty), offline session runs, and sync queues for zero-latency drills on planes or offline commutes.
    * *Reconnection Sync Queue*: Tracks pending unsynced offline replay runs and displays live status badges in the terminal header.
  * **Option 2: 1-Click Interactive Chart Annotation & Anonymous Peer Setup Sharing (PIP Part 5.2)**:
    * *Alpha Desk Peer Setup Forum (`frontend/src/components/challenges/AlphaDeskForum.tsx`)*: Anonymous institutional setup review forum in `/challenges`.
    * *Rule 4.3 Validation & R:R Calculator*: Automatically verifies risk per trade $\le 1.5\%$ and computes exact risk-to-reward ratios before publishing.
    * *Pedagogical Peer Reviews*: Allows fellow traders to score setups on structural invalidation clarity and risk discipline rather than hindsight P&L.
  * **Option 3: Automated Synthetic Geometric Brownian Motion (GBM) Market Data Generator (PIP Part 4.2)**:
    * *High-Fidelity CLI Generator (`scripts/seed_market_data.py`)*: Simulates realistic Merton Jump-Diffusion, GBM drift/volatility, and intraday U-shaped volume liquidity curves (peaks at open 09:15-10:00 & close 14:30-15:30 IST) generating infinite synthetic historical data without large downloads.
  * **Master Verification Engine Verified**:
    * Backend Pytest: 13/13 tests passing (100% green).
    * Frontend Vitest: **60/60 tests passing across 18 suites** (added `alpha-desk-and-offline.test.tsx`).
    * TypeScript: Zero errors (`tsc --noEmit`).
    * Production Build: 100% clean Nitro SSR bundle.
    * Android Container: 74 production assets compiled and synchronized.

---

### Release v1.0.33 (SM-2 Spaced Repetition, Alpha Arena, Level-3 FIFO Queue & Catalyst Overlay)
* **Release Date**: 2026-11-12 21:20 IST
* **Status**: `STABLE / FULLY VERIFIED & AUTOMATED`
* **Key Enhancements**:
  * **Option 2: Spaced Repetition (SM-2) Flashcards & Weekly "Alpha Arena" Tournaments**:
    * *SM-2 Spaced Repetition Engine in `/learn`*: Interactive flashcard drill across Levels 0–5; automatically calculates adaptive recall intervals ($1d \rightarrow 3d \rightarrow 7d \rightarrow 21d$) based on user recall quality.
    * *Weekly "Alpha Arena" Tournaments in `/challenges`*: Mon–Fri IST competition ranked by **Calmar Ratio** and **Risk-Adjusted Return** (instead of raw P&L) so disciplined risk managers beat reckless 100x leverage gamblers.
  * **Option 3: Level-3 FIFO Queue Priority & Historical News Catalyst Overlay**:
    * *FIFO Limit Order Queue Simulation in `/trade`*: Passive limit orders rest at the back of the Level-3 FIFO queue and only fill once preceding contracts drain.
    * *Microstructure Latency Jitter & Catalyst Pins*: Realistic `5ms–50ms` ping jitter displayed on order execution; historical macro news catalysts pinned along replay charts with automatic masking in Blind Mode.
  * **Master Verification Engine Verified**:
    * Backend Pytest: 13/13 tests passing.
    * Frontend Vitest: **57/57 tests passing across 17 suites** (added `sm2-and-alpha-arena.test.tsx` and `microstructure-and-fifo.test.tsx`).
    * TypeScript: Zero errors (`tsc --noEmit`).
    * Production Build: 100% clean Nitro SSR bundle.
    * Android Container: 73 production assets compiled and synchronized.

---

### Release v1.0.32 (Behavioral Trade Journal, Cool-Down Engine & Pyodide Quant Backtester)
* **Release Date**: 2026-11-10 20:15 IST
* **Status**: `STABLE / FULLY VERIFIED & AUTOMATED`
* **Key Enhancements**:
  * **Option 1: Behavioral Trade Journal & Cool-Down Engine (Trader Psychology)**:
    * *Automated Post-Mortem Diagnostics Modal*: Pops up upon closing any position or replay session, prompting the trader to tag execution psychology (`#PlanAdhered`, `#RevengeTrade`, `#MovedStopLoss`, `#FOMOEntry`, `#CutWinnerEarly`) with reflection logging.
    * *Behavioral Mistake Heatmap*: Interactive visual analytics tab on `/portfolio` quantifying exact rupee P&L loss attributable to emotional errors vs. disciplined strategy edge, showing win rates, mistake loss shares, and risk manager coaching advice.
    * *Psychological Cool-Down Protocol*: Automated revenge trading detection ($\ge 2$ losing market orders placed within 45 seconds of a stop-out or loss) locking order execution for a mandatory 3-minute guided breathing and discipline reset with native haptic pulses.
  * **Option 2: Client-Side Pyodide Quant Backtesting Sandbox in `/lab`**:
    * *In-Browser Python Quant Sandbox*: WebAssembly-powered client-side Python execution (Pyodide Python 3.12) embedded in Strategy Lab with offline-first high-speed vector fallback.
    * *Vectorized Strategy Engine & Templates*: 4 institutional templates (Dual EMA 9/21, Bollinger Bands 20/2σ, 15m Opening Range Breakout, Intraday VWAP Mean Reversion) evaluating 375 bars of realistic 1-minute Nifty 50 and Bank Nifty intraday candles.
    * *Interactive Quant Telemetry & Terminal Stdout*: Real-time calculation of Cumulative Return %, Sharpe Ratio, Sortino Ratio, Maximum Drawdown %, Win/Loss Expectancy, and live Python `print()` stdout execution console.
  * **Full-Spectrum Test Automation Verified**:
    * Backend Pytest: 13/13 tests passing.
    * Frontend Vitest: **49/49 tests passing across 15 suites** (added `behavioral-journal.test.tsx` and `pyodide-backtester.test.tsx`).
    * TypeScript: Zero errors (`tsc --noEmit`).
    * Production Build: 100% clean Nitro SSR bundle.
    * Android Assets: 70 production assets compiled and synchronized.

---

### Release v1.0.31 (Full-Spectrum Testing Automation & Master Verification Engine)
* **Release Date**: 2026-11-09 23:30 IST
* **Status**: `STABLE / FULLY AUTOMATED & VERIFIED`
* **Key Enhancements**:
  * **Master Test Automation Orchestrator**: Implemented single-command execution script `scripts/run_all_tests.py` (`pnpm test:all`) that runs Backend Pytest, Frontend Vitest, TypeScript Type Checking, and Production Nitro SSR Build sequentially with unified reporting.
  * **100% Green Backend Pytest Suite**: 13/13 passing automated endpoint tests covering health check, Rule 4.2 age verification, admin RBAC (401/403/200), double-entry ledger balance adjustment, emergency RMS kill-switch, order matching, DPDP erasure, historical replay sessions, Yahoo Finance market data, news feed refresh, Black-Scholes pricing, and multi-leg margin relief.
  * **100% Green Frontend Vitest Suite**: Expanded from 15 tests across 6 suites to **37 tests across 13 suites** covering Admin Console, Position Sizing, Option Greeks, Compounding, Inflation, Order Flow Slippage, Sign In/Up, Forgot Password, Portfolio Statement Exporter (CSV/PDF), Live News Wire, Markets exploration, Learning Academy, and Native Android Haptics Bridge.
  * **TypeScript Static Verification**: Strict zero-error compilation (`tsc -p frontend/tsconfig.json --noEmit`) across all routes and test suites.
  * **Android Container Synchronization**: Synced latest compiled production client bundle into `android/app/src/main/assets/www` (68 assets).

---

### Release v1.0.30 (Production Readiness Hardening & Audit Completion)
* **Release Date**: 2026-11-09 22:30 IST
* **Status**: `STABLE / PRODUCTION READY`
* **Key Enhancements**:
  * **Master 18-Dimension Audit Completed**: Formulated comprehensive audit report covering Website Quality, Mobile Responsiveness, Forms, SEO, Security, Database Architecture, Backend Architecture, Caching, Logging, Testing, Legal/Privacy, Accessibility, Admin Panel, and Cloud Deployments.
  * **Server-Side Role-Based Access Control (RBAC)**: Added `role` column (`ADMIN` vs `TRADER`) in `User` model; established `require_admin` dependency enforcing admin authorization on all RMS and telemetry endpoints with default admin assignment to `dyanndlee05@gmail.com`.
  * **CORS & Security Headers Hardening**: Replaced wildcard CORS with explicit origin whitelist (`settings.CORS_ORIGINS`); injected `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and Content Security Policy headers.
  * **API Rate Limiting Engine**: Implemented sliding-window rate limiter protecting `/api/v1/auth/login`, `/api/v1/auth/register`, and `/api/v1/trading/orders` against brute-force attacks and denial-of-service order floods.
  * **Technical SEO & Sitemap Generation**: Generated `frontend/public/sitemap.xml` mapping all public routes with canonical URLs; updated `frontend/public/robots.txt` with crawler directives and sitemap reference.
  * **Master Tracking Framework**: Established root-level `decision.md`, `changes.md`, `task-tracker.md`, `bug-tracker.md`, and `release-notes.md` per enterprise audit protocol.

---

### Release v1.0.29 (Rated Replay Gym & Institutional Execution Suite)
* **Release Date**: 2026-11-08 18:05 IST
* **Key Enhancements**:
  * **Glicko-2 Trader Skill Rating Engine**: Dynamic rating system calculating skill rating $R$, rating deviation $RD$, and volatility $\sigma$ across 4 institutional tiers (*Novice Scalper*, *Prop Desk Trainee*, *Senior Derivatives Trader*, *Macro Hedge Fund PM*).
  * **Rated Replay Gym**: In-replay execution with mandatory Rule 4.3 Stop-Loss check ($R \le 1.5\%$ / max ₹15,000 risk on ₹10 Lakh equity), live SL/TP hit detection with native haptic vibration, and rated session conclusion modal.
  * **Daily Historical Setups Rotation**: 3 curated market regimes refreshed daily at 00:00 IST with persistent leaderboard tracking.
  * **Institutional Execution Algorithms Suite**: Interactive Strategy Lab components for TWAP micro-slicing with anti-HFT jitter, VWAP intraday U-curve allocation, Iceberg visible/reserve queue, and Cash-Futures Cash-and-Carry basis arbitrage modeling.
  * **Bug Remediation**: Resolved `/challenges` runtime crash (missing `ArrowRight` icon import and strict optional property mismatches).
  * **Test Coverage**: 15/15 Vitest tests passing with 100% green rate.

---

### Release v1.0.28 (Multi-Leg Options Strategy Builder & CI/CD Pipeline)
* **Release Date**: 2026-11-08 17:36 IST
* **Key Enhancements**:
  * **Institutional Strategy Builder**: 1-click structures for Bull Call Spread, Bear Put Spread, Short Straddle, Long Strangle, and Iron Condor.
  * **Interactive Expiry Payoff Curve**: Recharts-based T+0 payoff chart displaying Max Profit, Max Loss, Breakeven strikes, Risk-to-Reward ratio, and Net Greeks ($\Delta, \Theta$).
  * **SEBI Margin Relief Engine**: Portfolio margin calculation modeling reduction from ₹1.2 Lakh to ₹35,000 per lot on hedged structures.
  * **GitHub Actions CI/CD**: Automated `.github/workflows/ci.yml` running unit tests and Nitro production builds on every push to `main`.
  * **Zero-Cost Cloud Deployment**: Render (`render.yaml`) and Vercel (`vercel.json`) configurations.

---

### Release v1.0.27 (Typography & Subpixel Font Polish)
* **Release Date**: 2026-11-08 14:06 IST
* **Key Enhancements**:
  * Overhauled global typography to `Inter` (UI elements) and `JetBrains Mono` (financial data, numbers, strikes).
  * Applied subpixel antialiasing (`-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`, `optimizeLegibility`) eliminating all pixelated font artifacts.
  * Synced 64 production assets to Android container.

---

### Releases v1.0.0 through v1.0.26 (Foundational Architecture & Scaffolding)
* **Key Milestones Delivered**:
  * Dual-Engine Paper Trading Terminal with non-linear power-law slippage and SEBI/Indian tax calculations (STT, Stamp Duty, GST, Exchange charges).
  * Complete 6-tier Financial Curriculum (Level 0 through Level 5) with interactive visualizers.
  * Double-entry immutable cash ledger accounting (`cash_ledger` table).
  * Live Yahoo Finance quote telemetry and 10-minute auto-polling Indian Market News Wire.
  * Android Native Packaging with offline web bundle fallback (`file:///android_asset/www/index.html`) and native hardware haptic feedback bridge (`MarketMasterNative`).
