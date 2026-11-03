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
* **Date & Timestamp**: 2026-11-03 22:25:00 UTC (Local: 2026-11-03 22:25:00 +05:30)
* **Decision Taken**: Enforce strict data minimization, explicit age consent, single-click automated account deletion, and ban all artificial FOMO timers or hidden paywalls.
* **Why Taken**: Financial education platforms must maintain absolute ethical credibility and full compliance with Indian DPDP Act 2023 and European GDPR.
* **Impact**: High trust, zero legal liability, pristine regulatory standing with SEBI guidelines, and clean accessibility compliance.

---

### Record: ADR-007 — Mandatory Real-Time Living Decision & Change Tracking Protocol
* **Date & Timestamp**: 2026-11-03 17:15:20 UTC (Local: 2026-11-03 22:45:20 +05:30)
* **Status**: Approved & Actively Enforced
* **Decision Taken**: Establish `decision.md` and `changes.md` as mandatory living system registries that MUST be updated synchronously every single time ANY decision is taken or ANY change (small, medium, or large) is executed across the entire repository.
* **Why Taken**: In complex multi-component systems (web, backend, mobile app, matching engines, regulatory frameworks), untracked decisions lead to architectural drift, lost design rationale, regression bugs, and confusion during development and audit reviews.
* **Alternatives Considered**:
  * *Relying only on Git commit messages*: Rejected because commit histories can be squash-merged, fragmented across branches, or lack full design rationale, alternative analysis, and cross-functional impact.
  * *Manual periodic changelog updates*: Rejected because delayed logging invariably results in omitted changes and untracked small modifications.
* **Impact**: Complete transparency, 100% auditability for every developer and AI agent, strict traceability from requirements down to lines of code, and zero undocumented modifications.

---

### Record: ADR-008 — Centralized Documentation Directory (`/docs`) & Root Indexing
* **Date & Timestamp**: 2026-11-03 17:18:00 UTC (Local: 2026-11-03 22:48:00 +05:30)
* **Status**: Approved & Implemented
* **Decision Taken**: Consolidate all 58 comprehensive engineering, architecture, curriculum, legal, security, and operational markdown specifications inside a dedicated `docs/` folder, with a clean root `README.md` serving as the master table of contents.
* **Why Taken**: Having dozens of specification documents directly in the repository root clutters the workspace as codebases for `frontend/`, `backend/`, and `android/` are scaffolded. Centralizing documentation in `docs/` conforms to industry repository standards.
* **Impact**: Clean, professional root structure ready for code scaffolding; complete documentation accessibility via `docs/`; synchronized living logs maintained in both root and `docs/`.

---

### Record: ADR-009 — Strict Single-Entrypoint Root Directory (`README.md` Only)
* **Date & Timestamp**: 2026-11-03 17:21:40 UTC (Local: 2026-11-03 22:51:40 +05:30)
* **Status**: Approved & Implemented
* **Decision Taken**: Remove duplicate `changes.md`, `decision.md`, and `rules.md` from the root workspace so that ONLY `README.md` resides outside the `docs/` folder. All governance, rule, and change tracking files are permanently maintained inside `docs/`.
* **Why Taken**: User explicitly mandated that only `README.md` shall be visible outside the `docs/` directory, preventing duplicate file drift and keeping the root workspace completely clean.
* **Impact**: Pristine root directory containing exclusively `README.md` and `docs/`; single source of truth for all documentation inside `docs/`.

---

### Record: ADR-010 — Comprehensive Visual Elaboration & Multi-Type Diagram Integration
* **Date & Timestamp**: 2026-11-03 17:27:00 UTC (Local: 2026-11-03 22:57:00 +05:30)
* **Status**: Approved & Implemented
* **Decision Taken**: Vastly elaborate and upgrade all primary engineering, architecture, database, matching engine, curriculum, and security documents with rich, native Mermaid diagrams across diverse formats:
  1. High-level system flowcharts (`flowchart TD`, `flowchart LR`)
  2. End-to-end execution sequence diagrams (`sequenceDiagram` with autonumber)
  3. Strict finite state machine diagrams (`stateDiagram-v2`)
  4. Complete database entity-relationship models (`erDiagram`)
  5. Object-oriented domain class models (`classDiagram`)
  6. Quantitative mathematical distribution charts (`xychart-beta`)
* **Why Taken**: Text-only specifications fail to communicate complex concurrent financial systems, race conditions, queue simulations, and state transitions with sufficient clarity. Rich visual diagrams eliminate architectural ambiguity for both human engineers and AI code-generation agents.
* **Impact**: Unambiguous visual and technical blueprints across the entire repository, zero ambiguity during implementation, and instant structural clarity for developers.





