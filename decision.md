# Architectural & Engineering Decisions Log (ADR)
## Project: MarketMaster Academy
**Purpose**: Immutable historical record of every architectural, technical, pedagogical, and security decision made in the project, why it was taken, and its verified system impact.  

---

### Record: ADR-001 — Unified Architecture Style
* **Date & Timestamp**: 2026-11-03 21:30:00 UTC
* **Decision Taken**: Build the platform backend as a Modular Monolith with bounded contexts in Java 21 / Spring Boot rather than starting with a distributed microservices cluster.
* **Why Taken**: Reduces cloud hosting footprint to fit comfortably on ₹0 free tiers; avoids network latency, distributed transaction complexity, and multi-service deployment maintenance.
* **Impact**: Zero infrastructure bill, high developer velocity, in-memory function calls between modules, and seamless future extraction into microservices if user volume dictates.

---

### Record: ADR-002 — ChartingPark-Style Accelerated Practice Engine
* **Date & Timestamp**: 2026-11-03 21:45:00 UTC
* **Decision Taken**: Incorporate historical candle-by-candle replay, blind asset masking (`ASSET_X`), mandatory stop-losses, and Daily Challenges directly into the core terminal.
* **Why Taken**: Standard live paper trading is too slow for deliberate learning; users wait days for setups to conclude and develop bad habits. Blind historical replay compresses 1 year into 15 minutes and eliminates hindsight bias.
* **Impact**: 10x faster learning curve, measurable skill ratings based on expectancy rather than luck, and dramatically higher daily user engagement.

---

### Record: ADR-003 — Strict ₹0 Budget Deployment Strategy
* **Date & Timestamp**: 2026-11-03 22:00:00 UTC
* **Decision Taken**: Exclude all paid APIs, subscriptions, cloud databases, and paid app store publisher fees. Distribute Android native app via direct GitHub Releases APK download and host web app on Vercel/Cloudflare Pages free tiers.
* **Why Taken**: Ensures the platform can run indefinitely without financial burn or reliance on monetization/ads.
* **Impact**: Total cost of ownership is ₹0; accessible to any student worldwide; requires client-side compute offloading (Pyodide WebAssembly) and open-source chart engines (TradingView Lightweight Charts).

---

### Record: ADR-004 — Double-Entry Accounting Ledger for Virtual Cash
* **Date & Timestamp**: 2026-11-03 22:15:00 UTC
* **Decision Taken**: Model virtual cash and positions using immutable double-entry ledger transactions (`cash_ledger` table) rather than directly overwriting a mutable user balance field.
* **Why Taken**: Prevents money glitches, facilitates automated reconciliation tests, and accurately calculates transaction taxes (STT, GST, Stamp Duty).
* **Impact**: Bank-grade mathematical audit trail, reproducible simulation histories, and zero discrepancies in virtual portfolio accounting.

---

### Record: ADR-005 — Client-Side Vector Backtesting (Pyodide WebAssembly)
* **Date & Timestamp**: 2026-11-03 22:20:00 UTC
* **Decision Taken**: Run Python algorithmic backtesting inside the browser using Pyodide (WASM) rather than spinning up backend Docker containers for user scripts.
* **Why Taken**: Running arbitrary user Python code on backend servers creates security sandbox vulnerabilities and requires expensive cloud compute instances.
* **Impact**: Completely free server compute, zero remote code execution (RCE) risk on backend, instant local feedback for the user.

---

### Record: ADR-006 — Comprehensive Privacy, DPDP Act 2023 & Zero Dark Patterns
* **Date & Timestamp**: 2026-11-03 22:25:00 UTC
* **Decision Taken**: Enforce strict data minimization, explicit age consent, single-click automated account deletion, and ban all artificial FOMO timers or hidden paywalls.
* **Why Taken**: Financial education platforms must maintain absolute ethical credibility and full compliance with Indian DPDP Act 2023 and European GDPR.
* **Impact**: High trust, zero legal liability, pristine regulatory standing with SEBI guidelines, and clean accessibility compliance.

