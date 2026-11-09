# MarketMaster Release Notes
> Official release history, version designations, features delivered, and architectural enhancements.

---

### Release v1.0.30 (Current — Production Readiness Hardening & Audit Completion)
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
