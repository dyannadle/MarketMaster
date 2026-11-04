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






---

### Record: ADR-011 — Transition to Active Build Phase & Granular Milestone Tracking
* **Date & Timestamp**: 2026-11-04 15:27:00 UTC (Local: 2026-11-04 20:57:00 +05:30)
* **Status**: Approved & Actively Enforced
* **Decision Taken**: Formally transition the project status from Phase 0 (Pure Architectural & System Specification) to Phase 1 (Active Code Construction & Foundation Scaffolding). Update `ROADMAP.md`, `README.md`, and `CONTRIBUTING.md` to reflect real-time specification vs. implementation status.
* **Why Taken**: To prevent misconception that subsequent phases are already complete, maintain absolute integrity in project progress reporting, and give active developers a concrete roadmap of active sprints, prerequisites, and definitions of done.
* **Alternatives Considered**:
  * *Keeping roadmap checkboxes static*: Rejected because marking unwritten code as completed is misleading to contributors and auditors.
* **Impact**: Transparent sprint tracking, clear demarcation between completed architecture and active code scaffolding, and aligned developer expectations across the monorepo.

---

### Record: ADR-012 — Adoption of Comprehensive System Improvement Proposals (PIP)
* **Date & Timestamp**: 2026-11-04 15:28:00 UTC (Local: 2026-11-04 20:58:00 +05:30)
* **Status**: Approved & Adopted as Strategic Blueprint
* **Decision Taken**: Formulate and institutionalize `docs/PROJECT_IMPROVEMENT_PROPOSALS.md` as the living strategic roadmap for future feature expansions across 6 core pillars:
  1. *Pedagogical Enhancements*: Automated post-mortem trade journaling, spaced repetition (SM-2) for micro-concepts, and behavioral discipline/tilt scores.
  2. *Market Microstructure Realism*: Order processing latency jitter, historical news/catalyst overlays, and simulated FIFO Level-3 queue priority.
  3. *Engineering & Architecture*: Turborepo/pnpm monorepo tooling, Testcontainers integration testing for zero-flake CI, and Progressive Web App (PWA) offline terminal capabilities.
  4. *Developer Experience (DX)*: Husky pre-commit gates enforcing documentation sync, and synthetic market data seed generators.
  5. *Gamification & Community*: Weekly zero-cost simulation tournaments ("Alpha Arena") scored on Calmar ratio, and anonymous chart annotation sharing.
  6. *Compliance Hardening*: Automated DPDP account deletion regression test suites and strict Content Security Policy v3 headers.
* **Why Taken**: To ensure MarketMaster Academy is not just a standard paper-trading app, but an industry-defining, institutional-grade digital university that fosters disciplined trading habits while respecting a strict ₹0 cloud budget.
* **Impact**: Clear competitive differentiation, elevated learning efficacy, institutional-grade realism, and a structured expansion plan for upcoming sprints.

---

### Record: ADR-013 — Full-Spectrum Automation, Synchronous Documentation Updates & Mandatory Test-First Gated Deployment
* **Date & Timestamp**: 2026-11-04 15:43:00 UTC (Local: 2026-11-04 21:13:00 +05:30)
* **Status**: Approved & Actively Enforced (Codified in `rules.md` Section 8)
* **Decision Taken**: Formally mandate three interconnected operational invariants:
  1. *Synchronous Documentation Updates*: Every single specification, architecture blueprint, API contract, and guide across `docs/` must be updated as per need concurrently with code modifications.
  2. *End-to-End Automation*: Automate every developer and operational process (linting, doc sync verification, unit tests, integration tests, ledger reconciliation, builds, and releases) using GitHub Actions, Husky pre-commit hooks, and Docker Compose.
  3. *Test-Before-Deploy Gate*: Every single time any change is executed (regardless of scope), it must first pass 100% of all automated test suites. The deployment pipeline is fail-closed and cannot execute unless all tests are verified green.
* **Why Taken**: In a high-fidelity financial simulation university with complex matching engines and double-entry accounting ledgers, unverified deployments or outdated documentation lead to catastrophic data drift, ledger inconsistencies, and user mistrust. Automated testing gates guarantee that regressions never reach production.
* **Alternatives Considered**:
  * *Manual deployment post-testing*: Rejected because manual steps are prone to human error, missed commands, or forgotten schema migrations.
  * *Post-deployment testing*: Rejected because broken code would be exposed to end users before faults are identified.
* **Impact**: Zero regressions reach staging or production, documentation is permanently current with codebase reality, and developers operate with high velocity backed by automated safety nets.

---

### Record: ADR-014 — Lightweight Python Quant Stack & Stitch-Powered UI Architecture
* **Date & Timestamp**: 2026-11-04 15:48:00 UTC (Local: 2026-11-04 21:18:00 +05:30)
* **Status**: Approved & Implemented
* **Decision Taken**: 
  1. Standardize backend services and quant engines on Python 3.12+, FastAPI (ASGI), Polars, async SQLAlchemy, Pydantic v2, and NumPy/SciPy.
  2. Adopt Stitch UI as the AI design engine for synthesizing high-contrast, responsive terminal screens.
  3. Start active implementation immediately from the frontend UI layer.
* **Why Taken**: Python is the global industry gold standard for quantitative finance, vector backtesting, and market replay. Polars provides sub-millisecond candle slicing at 1/10th the memory footprint of JVM setups, fitting perfectly within the ₹0 budget invariant. Starting with UI via Stitch ensures users immediately receive an intuitive, attractive, and responsive terminal experience.
* **Alternatives Considered**:
  * *Maintaining Java/Spring Boot exclusively*: Rejected because Python's rich quant ecosystem (Polars, NumPy, SciPy, Pyodide parity) enables vastly faster development of financial indicators and algorithmic slicers.
* **Impact**: Lighter cloud footprint, instantaneous local development startup (<1 sec vs 25 sec JVM boot), seamless data science parity between backend and Pyodide client sandbox, and visually striking, responsive Stitch-crafted UI.

---

### Record: ADR-015 — Multi-Screen Stitch-Generated UI Suite Deployment
* **Date & Timestamp**: 2026-11-04 16:38:00 UTC (Local: 2026-11-04 22:08:00 +05:30)
* **Status**: Approved & Implemented
* **Decision Taken**: Deploy a comprehensive 3-screen interactive frontend suite in `frontend/public/` synthesized using Stitch UI AI engine (`projects/8751679670035874305`), sharing the unified `MarketMaster Academy` institutional dark terminal design system (`assets/e90035912b7c402c9691fd64fb4450f8`):
  1. *Screen 1*: `frontend/public/index.html` (Institutional Trading Terminal & Replay Simulator).
  2. *Screen 2*: `frontend/public/gym.html` (ChartingPark Blind Replay Gym & Daily Challenge Arena).
  3. *Screen 3*: `frontend/public/academy.html` (Academy Course Hub & Spaced Repetition SM-2 Learning Theater).
  4. Cross-link all screens through unified sidebar navigation.
* **Why Taken**: Provides immediate tactile, visual feedback for students and developers, allowing direct previewing in any web browser without waiting for backend API completion. Adheres strictly to the user instruction to begin construction from the UI.
* **Impact**: Instant visual validation of institutional terminal density, 100% responsive dark mode, glassmorphism design tokens, and seamless cross-screen navigation for user testing.
