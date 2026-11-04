# Comprehensive Testing Strategy & Automated Quality Gates
## Project: MarketMaster Academy
**Frameworks**: Vitest (Web), JUnit 5 & AssertJ (Backend), Testcontainers (DB/Cache), Playwright (E2E), Compose Test (Android)  
**Execution Policy**: Mandatory 100% Pass Rate Prior to Deployment ([Rule 8.1](rules.md))  
**Master CI/CD Specification**: Detailed in [`AUTOMATION_AND_CICD_SPEC.md`](AUTOMATION_AND_CICD_SPEC.md)  

---

### 1. Test Architecture & Hierarchy

MarketMaster Academy employs a multi-tiered test pyramid ensuring zero regressions in order execution, risk calculations, or double-entry virtual accounting:

```text
               ▲
              / \
             /E2E\             Level 5: Playwright End-to-End Terminal Smoke Tests
            /-----\
           / Integ \           Level 4: Testcontainers (PostgreSQL 16 & Redis 7)
          /---------\
         / Reconcile \         Level 3: Double-Entry Ledger Zero-Sum Financial Invariants
        /-------------\
       / Unit Tests    \       Level 2: Backend Domain & Execution Algorithms (JUnit 5)
      /-----------------\
     / Static & Linter   \     Level 1: TypeScript, ESLint, Spotless, Living Doc Sync
    -----------------------
```

---

### 2. Running Automated Test Suites Locally

#### Full-Stack Test Execution (Single Command)
```bash
# Execute all local test suites (Frontend + Backend)
npm run test:all
```

#### 1. Frontend Web Tests (Vitest + React Testing Library)
```bash
cd frontend
npm run test           # Interactive watch mode
npm run test -- --run  # Single CI pass with coverage
```

#### 2. Backend Unit & Financial Reconciliation Tests (JUnit 5)
```bash
cd backend
mvn test
# Specifically run double-entry ledger reconciliation tests
mvn test -Dtest=ReconciliationTest
```

#### 3. Integration Tests with Testcontainers (PostgreSQL 16 + Redis 7)
```bash
cd backend
mvn verify -Pintegration-tests
```

#### 4. End-to-End Trading Flow Smoke Tests (Playwright)
```bash
cd frontend
npx playwright test
```

#### 5. Native Android Unit & Compose UI Tests
```bash
cd android
./gradlew testDebugUnitTest
./gradlew connectedAndroidTest
```

---

### 3. Automated Documentation & Living Audit Checks

Before committing, run the automated documentation sync check:
```bash
# Verifies that docs/changes.md has been updated if any code files were modified
npm run check:doc-sync
```

---

### 4. Mandatory Pre-Deployment Test Gate (Fail-Closed)

Under [Rule 8.1](rules.md), GitHub Actions halts any deployment pipeline immediately upon any single failure:
* ❌ Broken unit test ➔ **Deploy Aborted**
* ❌ Double-entry ledger rounding drift > ₹0.00 ➔ **Deploy Aborted**
* ❌ Playwright order placement timeout ➔ **Deploy Aborted**
* ❌ Missing `docs/changes.md` entry ➔ **Merge Blocked**
