# MarketMaster Academy
> **Unified Digital Financial University & Institutional Market Simulation Ecosystem**

MarketMaster Academy combines a 6-tier comprehensive financial education curriculum (Level 0 through Level 5) with a high-fidelity paper trading terminal, historical candle replay engine, algorithmic execution sandbox, and a native Android application—operating under a strict ₹0 infrastructure budget.

---

## Complete Project Documentation

All specifications, architectural designs, API contracts, curriculum maps, security policies, and legal frameworks are centralized in the **[`docs/`](docs/)** directory:

### 1. Requirements & System Design
* [`docs/BRD.md`](docs/BRD.md) — Business Requirements Document
* [`docs/PRD.md`](docs/PRD.md) — Product Requirements Document
* [`docs/SRS.md`](docs/SRS.md) — Software Requirements Specification (IEEE 830)
* [`docs/HLD.md`](docs/HLD.md) — High-Level Architecture Design
* [`docs/LLD.md`](docs/LLD.md) — Low-Level Component Design & UML
* [`docs/USER_STORIES.md`](docs/USER_STORIES.md) — User Epics & Acceptance Criteria

### 2. Architecture & Tech Stack
* [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — System Topology & Bounded Contexts
* [`docs/SOFTWARE_ARCHITECTURE.md`](docs/SOFTWARE_ARCHITECTURE.md) — Hexagonal Clean Architecture
* [`docs/FRONTEND_ARCHITECTURE.md`](docs/FRONTEND_ARCHITECTURE.md) — Next.js 15, React 19, TradingView Lightweight Charts
* [`docs/BACKEND_ARCHITECTURE.md`](docs/BACKEND_ARCHITECTURE.md) — Java 21 LTS, Spring Boot 3.3, Virtual Threads
* [`docs/BACKEND_RUN_INSTRUCTIONS.md`](docs/BACKEND_RUN_INSTRUCTIONS.md) — Local Development & Docker Instructions
* [`docs/ANDROID_ARCHITECTURE.md`](docs/ANDROID_ARCHITECTURE.md) — Native Kotlin 2.0, Jetpack Compose, Room DB
* [`docs/MOBILE_APP_SPEC.md`](docs/MOBILE_APP_SPEC.md) — Android Mobile App Gestures & Offline Specs

### 3. Database & API Contracts
* [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) — PostgreSQL DDL, Indexes & ERD
* [`docs/DATABASE_SCALING_AND_CACHING.md`](docs/DATABASE_SCALING_AND_CACHING.md) — Query Tuning & Redis Caching
* [`docs/API_SPECIFICATION_CONTRACTS.md`](docs/API_SPECIFICATION_CONTRACTS.md) — OpenAPI 3.1 & WebSocket Protocol
* [`docs/API.md`](docs/API.md) — Developer Quick Reference Directory

### 4. Curriculum & Learning Academy
* [`docs/CURRICULUM.md`](docs/CURRICULUM.md) — 6 Levels, 24 Domains, 200+ Granular Micro-Concepts
* [`docs/GLOSSARY.md`](docs/GLOSSARY.md) — 100+ Financial & Microstructure Definitions
* [`docs/CALCULATOR_ALGORITHMS_REFERENCE.md`](docs/CALCULATOR_ALGORITHMS_REFERENCE.md) — Black-Scholes, Compounding & SIP Math

### 5. Simulation, Replay & Matching Engines
* [`docs/PAPER_TRADING_ENGINE_SPEC.md`](docs/PAPER_TRADING_ENGINE_SPEC.md) — Matching Pipeline & Slippage Model
* [`docs/ORDER_EXECUTION_ENGINE.md`](docs/ORDER_EXECUTION_ENGINE.md) — In-Memory Order Book Trees & Depth Queues
* [`docs/TRADING_ENGINE.md`](docs/TRADING_ENGINE.md) — Indian Market Instrument Specs (NSE/BSE/MCX)
* [`docs/ORDER_TYPES_REFERENCE.md`](docs/ORDER_TYPES_REFERENCE.md) — Market, Limit, SL, Bracket, Iceberg Orders
* [`docs/SIMULATOR_ACCOUNTING.md`](docs/SIMULATOR_ACCOUNTING.md) — Double-Entry Ledger, STT, GST, Stamp Duty
* [`docs/RMS.md`](docs/RMS.md) — SPAN & Exposure Margin, Auto-Liquidation
* [`docs/STRATEGY_LAB.md`](docs/STRATEGY_LAB.md) — Client-Side Pyodide Python WASM Sandbox
* [`docs/EXECUTION_ALGORITHMS_SPECIFICATION.md`](docs/EXECUTION_ALGORITHMS_SPECIFICATION.md) — TWAP, VWAP, POV, Iceberg, Arbitrage
* [`docs/HISTORICAL_MARKET_DATA_SPECIFICATION.md`](docs/HISTORICAL_MARKET_DATA_SPECIFICATION.md) — Parquet Storage & Synthetic GBM Data
* [`docs/MARKET_DATA.md`](docs/MARKET_DATA.md) — Data Feeds & WebSocket Ticker Architecture

### 6. Project Rules, Living Decision Log & Changes
* [`docs/rules.md`](docs/rules.md) — Mandatory Development & Compliance Rules
* [`docs/decision.md`](docs/decision.md) — Living ADR Log of All Architectural Decisions
* [`docs/changes.md`](docs/changes.md) — Granular Timestamped Changelog & Version History

### 7. Legal, Privacy & Compliance
* [`docs/PRIVACY_POLICY.md`](docs/PRIVACY_POLICY.md) — DPDP Act 2023 & GDPR Compliance
* [`docs/TERMS_OF_SERVICE.md`](docs/TERMS_OF_SERVICE.md) — Educational Simulation Terms & Disclaimers
* [`docs/REFUND_POLICY.md`](docs/REFUND_POLICY.md) — 100% Free Platform & Zero Monetary Fees
* [`docs/COOKIE_POLICY.md`](docs/COOKIE_POLICY.md) — Cookie Taxonomy & Banner Specifications
* [`docs/SECURITY_COMPLIANCE.md`](docs/SECURITY_COMPLIANCE.md) — SEBI Regulatory Boundaries

### 8. Security, Observability & Admin Operations
* [`docs/SECURITY.md`](docs/SECURITY.md) — OWASP Top 10 Defenses
* [`docs/SECURITY_AND_API_PROTECTION.md`](docs/SECURITY_AND_API_PROTECTION.md) — RLS, JWT Auth, IDOR Elimination
* [`docs/LOGGING_AND_MONITORING.md`](docs/LOGGING_AND_MONITORING.md) — SLF4J, Prometheus, Grafana
* [`docs/OBSERVABILITY_MONITORING.md`](docs/OBSERVABILITY_MONITORING.md) — Morgan + Winston, Sentry, PostHog
* [`docs/ADMIN_PANEL_SPEC.md`](docs/ADMIN_PANEL_SPEC.md) — User Management, CMS, Ledger & Reports
* [`docs/PERFORMANCE_AND_SCALABILITY_PLAN.md`](docs/PERFORMANCE_AND_SCALABILITY_PLAN.md) — Scalability on ₹0 Budget

### 9. UI/UX, Accessibility & SEO
* [`docs/UI_UX_DESIGN_SPECIFICATION.md`](docs/UI_UX_DESIGN_SPECIFICATION.md) — Terminal Design Aesthetic
* [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — Tokens, Typography, Micro-Interactions
* [`docs/ACCESSIBILITY_AND_UI_STANDARDS.md`](docs/ACCESSIBILITY_AND_UI_STANDARDS.md) — WCAG 2.1 AA Compliance
* [`docs/SEO_AND_METADATA_SPEC.md`](docs/SEO_AND_METADATA_SPEC.md) — Open Graph, Sitemap & Search Console

### 10. Build, Test & Deployment
* [`docs/BUILD.md`](docs/BUILD.md) — Build Instructions for Web, JAR, and APK
* [`docs/TESTING.md`](docs/TESTING.md) — Automated Test Commands
* [`docs/QA.md`](docs/QA.md) — Quality Assurance & Reconciliation Testing
* [`docs/APP_TESTING_GUIDELINES.md`](docs/APP_TESTING_GUIDELINES.md) — Mobile Device Matrix & Offline Testing
* [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) — Environment Variable Directory
* [`docs/CONFIGURATION_MANAGEMENT.md`](docs/CONFIGURATION_MANAGEMENT.md) — Secret Management & Feature Flags
* [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Free-Tier Cloud Deployment Topology
* [`docs/PRODUCTION_DEPLOYMENT.md`](docs/PRODUCTION_DEPLOYMENT.md) — Production Release Checklist
* [`docs/ROADMAP.md`](docs/ROADMAP.md) — Phased Release Roadmap (Q1–Q5)
* [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — Contributor Workflow

