# Contributor & Engineering Guidelines
## Project: MarketMaster Academy
**Code of Conduct**: Open, Respectful, Educational, Objective, Rigorous  
**Enforcement**: Mandatory in Code Review, CI/CD, and Pull Requests  

---

### 1. Architectural Principles & Invariants

Every contribution to MarketMaster Academy must uphold four foundational pillars:
1. **Zero-Cost Budget Invariant**: No libraries, cloud dependencies, or external APIs requiring paid subscriptions or commercial licenses may be added.
2. **Zero Frontend Trust**: Never trust client inputs. Margin, order sizes, price ticks, and ledger accounting must be strictly validated on the backend.
3. **Double-Entry Ledger Integrity**: Cash and position balances can never be directly overwritten. All balance adjustments must execute as balanced debit/credit rows in `cash_ledger`.
4. **Synchronous Living Documentation**: Under [Rule 7.1 and 7.2](rules.md), no PR is mergeable unless accompanied by entries in [`decision.md`](decision.md) (if decisions were made) and [`changes.md`](changes.md) (logging all file modifications).

---

### 2. Git Workflow & Branching Strategy

We follow a structured trunk-based feature branching model:

```text
main (stable, production-ready)
 │
 ├── feature/backend-auth-jwt
 ├── feature/replay-engine-slippage
 ├── fix/margin-span-calculation
 └── docs/update-roadmap-milestones
```

#### Branch Naming Conventions:
* `feature/<short-description>`: New functional capabilities or modules.
* `fix/<bug-description>`: Bug fixes or calculation corrections.
* `refactor/<target-module>`: Code restructuring without functional alterations.
* `docs/<topic>`: Documentation, guides, or diagram updates.
* `chore/<task>`: Dependency updates, CI/CD workflow edits, or build scripts.

---

### 3. Commit Message Standards (Conventional Commits)

Commit messages must be concise, descriptive, and follow the Conventional Commits specification:

```text
<type>(<scope>): <short imperative summary>

[optional detailed body explaining why and what changed]

[optional issue/ticket reference]
```

#### Permitted Types:
* `feat`: A new feature or user-facing functionality.
* `fix`: A bug fix or calculation resolution.
* `docs`: Documentation changes only.
* `style`: Formatting, missing semi-colons, white-space changes.
* `refactor`: Code change that neither fixes a bug nor adds a feature.
* `perf`: Code change that improves execution speed or memory footprint.
* `test`: Adding missing tests or correcting existing tests.
* `chore`: Build process or tooling changes.

*Example*:
```bash
feat(engine): implement power-law slippage model based on order book depth

- Added PowerLawSlippageModel calculating impact based on volume ratio.
- Verified test suite with 100%, 50%, and 10% depth queue exhaustion scenarios.
- Updated docs/changes.md with version entry.
```

---

### 4. Code Quality & Standards by Subsystem

#### Frontend (Next.js 15 / React 19 / TypeScript)
* Strict TypeScript enabled (`noImplicitAny: true`, `strictNullChecks: true`).
* Use functional components with React Hooks.
* Manage trading terminal state using Zustand for zero-overhead re-renders.
* Style using Tailwind CSS with dark-mode financial terminal palette tokens.
* Accessibility: Meet WCAG 2.1 AA standards; ensure all buttons and charts support keyboard navigation (`Tab`, `Enter`, `Space`).

#### Backend (Java 21 / Spring Boot 3.3)
* Follow Hexagonal Clean Architecture (Domain ➔ Application ➔ Infrastructure).
* Leverage Java 21 Virtual Threads (`spring.threads.virtual.enabled: true`) for lightweight concurrency.
* Data integrity: Use `BigDecimal` with explicit scale and rounding modes (`RoundingMode.HALF_UP`) for all financial, currency, and quantity calculations. Never use raw floating-point (`float` / `double`).
* Use parameterized queries and Spring Data JPA / jOOQ to guarantee 100% SQL injection prevention.
* Flyway migrations must be backward-compatible and idempotently runnable.

#### Mobile (Android / Kotlin 2.0 / Jetpack Compose)
* Unidirectional Data Flow (MVI/MVVM) with StateFlow and Jetpack Compose.
* Offline-first architecture using Room database for local caching of lessons and completed drills.
* Follow Material Design 3 guidelines with accessible contrast ratios.

---

### 5. Pull Request Checklist

Before submitting a Pull Request, verify each item:
- [ ] Branch is branched from latest `main`.
- [ ] Code compiles cleanly with zero compiler warnings or lint errors.
- [ ] Automated tests pass:
  - Frontend: `npm run test`
  - Backend: `mvn test`
  - Android: `./gradlew testDebugUnitTest`
- [ ] New financial logic has dedicated unit tests covering edge cases (e.g. zero quantities, negative ticks, margin call boundary conditions).
- [ ] Verified that no secrets, API keys, or credentials are hardcoded.
- [ ] Verified that no paid third-party dependencies have been introduced (Rule 1.1).
- [ ] **Mandatory**: Updated [`docs/decision.md`](decision.md) if any architectural or technical decision was made.
- [ ] **Mandatory**: Appended a detailed entry to [`docs/changes.md`](changes.md) documenting all modified files and functional impact.
