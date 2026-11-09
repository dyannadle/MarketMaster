# MarketMaster Bug Tracker & Remediation Log
> Audit log of discovered bugs, anomalies, severity classifications, root causes, and verified resolutions.

## Severity Classification
- `CRITICAL`: System crash, security vulnerability, data loss, broken core route, or auth bypass.
- `HIGH`: Functional failure in primary trading/options flows, incorrect calculations, or state corruption.
- `MEDIUM`: Degraded user experience, layout overflow, missing telemetry, or performance lag.
- `LOW`: Visual cosmetic defect, minor copy typo, or non-blocking edge case.

---

## Bug Log

### BUG-001: `/challenges` Route Runtime Crash (`ArrowRight is not defined`)
* **Date Reported**: 2026-11-08 17:51 IST
* **Severity**: `CRITICAL`
* **Priority**: `P0`
* **Affected Module**: `frontend/src/routes/challenges.tsx`
* **Symptoms**: Navigating to `localhost:3000/challenges` resulted in the TanStack Router ErrorBoundary displaying *"This page didn't load. Something went wrong on our end."*
* **Root Cause**: `<ArrowRight className="h-4 w-4 text-primary" />` was added to the Rated Mode completion celebration modal without importing `ArrowRight` from `lucide-react`. React threw `ReferenceError: ArrowRight is not defined` during module execution.
* **Resolution**: Imported `ArrowRight` from `lucide-react`, aligned haptic bridge call to `nativeBridge.vibrateStopLoss()`, and resolved TypeScript strict optional property mismatches (`exactOptionalPropertyTypes`).
* **Verification**: Component rendered cleanly without throwing; unit tests in `challenges-render.test.tsx` pass 100%. Status: `RESOLVED AND VERIFIED`.

---

### BUG-002: JSX Variable Interpolation Collision in `PositionSizingVisualizer.tsx`
* **Date Reported**: 2026-11-08 17:55 IST
* **Severity**: `HIGH`
* **Priority**: `P1`
* **Affected Module**: `frontend/src/components/visualizers/PositionSizingVisualizer.tsx`
* **Symptoms**: TypeScript compile error: `Cannot find name 'trade'`.
* **Root Cause**: Math notation `($R_{trade} \le 1.5\%$)` had unescaped braces `{trade}`, which React's JSX parser evaluated as an undeclared JavaScript variable expression instead of literal text.
* **Resolution**: Replaced `{trade}` with clean unescaped string `(R_trade ≤ 1.5%)`.
* **Verification**: `tsc -p frontend/tsconfig.json --noEmit` exited with code 0. Status: `RESOLVED AND VERIFIED`.

---

### BUG-003: Insecure CORS Wildcard with Credentials in FastAPI Backend
* **Date Reported**: 2026-11-09 21:10 IST
* **Severity**: `CRITICAL`
* **Priority**: `P0`
* **Affected Module**: `backend/app/main.py`
* **Symptoms**: Backend CORS middleware configured with `allow_origins=["*"]` and `allow_credentials=True`.
* **Root Cause**: Standard CORS specifications prohibit wildcard origins (`*`) when credentials (cookies, authorization headers) are transmitted. Modern browsers reject responses and it exposes APIs to cross-origin abuse.
* **Resolution**: Configured explicit origin whitelist in `CORSMiddleware` reading from `settings.CORS_ORIGINS` (`http://localhost:3000`, `http://127.0.0.1:3000`, `http://10.0.2.2:3000`, `https://marketmaster.vercel.app`).
* **Verification**: Browser network requests and options preflights strictly validate against origin whitelist. Status: `RESOLVED AND VERIFIED`.

---

### BUG-004: Missing Server-Side Role-Based Access Control (RBAC) on Admin Endpoints
* **Date Reported**: 2026-11-09 21:14 IST
* **Severity**: `CRITICAL`
* **Priority**: `P0`
* **Affected Module**: `backend/app/models/user.py`, `backend/app/api/v1/deps.py`, `backend/app/api/v1/admin.py`
* **Symptoms**: Admin console relied solely on frontend client-side role filtering; backend lacked explicit `role` persistence and role verification dependency (`require_admin`).
* **Root Cause**: `User` model did not store a `role` field (`ADMIN` vs `TRADER`), and admin operations had no server-side role validation.
* **Resolution**: Added `role` column to `User` model, created `require_admin` dependency in `deps.py` verifying that `current_user.role == "ADMIN"` or email is in configured admin whitelist (`dyanndlee05@gmail.com`), and protected all admin actions.
* **Verification**: Non-admin JWT tokens attempting to access `/api/v1/admin/*` are rejected with HTTP 403 Forbidden. Status: `RESOLVED AND VERIFIED`.

---

### BUG-005: Missing Rate Limiting on Authentication & Order Endpoints
* **Date Reported**: 2026-11-09 21:15 IST
* **Severity**: `HIGH`
* **Priority**: `P1`
* **Affected Module**: `backend/app/api/v1/auth.py`, `backend/app/api/v1/trading.py`
* **Symptoms**: Login, registration, and order placement endpoints had no rate limiting, leaving them susceptible to brute-force credential stuffing and order flooding.
* **Root Cause**: Zero-dependency FastAPI app had not implemented an IP/user token bucket rate limiter.
* **Resolution**: Implemented high-performance in-memory sliding window rate limiter middleware with configurable limits per minute per IP.
* **Verification**: Rapid successive requests exceeding limit return HTTP 429 Too Many Requests with `Retry-After` header. Status: `RESOLVED AND VERIFIED`.

---

### BUG-006: Missing `sitemap.xml` and Incomplete Robots Crawling Directive
* **Date Reported**: 2026-11-09 22:12 IST
* **Severity**: `MEDIUM`
* **Priority**: `P3`
* **Affected Module**: `frontend/public/robots.txt`, `frontend/public/sitemap.xml`
* **Symptoms**: Search engines could not discover all static educational and terminal routes; `robots.txt` had no sitemap URL.
* **Root Cause**: `sitemap.xml` was not generated in `frontend/public/`.
* **Resolution**: Created XML sitemap indexing all public educational, market, and simulator routes with `changefreq` and `priority` attributes; updated `robots.txt` with canonical `Sitemap: https://marketmaster.vercel.app/sitemap.xml`.
* **Verification**: Validated XML structure and crawler directives. Status: `RESOLVED AND VERIFIED`.

---

### BUG-007: Missing Security Headers on HTTP Responses
* **Date Reported**: 2026-11-09 22:15 IST
* **Severity**: `HIGH`
* **Priority**: `P1`
* **Affected Module**: `backend/app/main.py`, `frontend/public/_headers`
* **Symptoms**: Backend and frontend HTTP responses lacked `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Strict-Transport-Security`.
* **Root Cause**: Security headers middleware was absent from the FastAPI application stack.
* **Resolution**: Added security headers middleware enforcing `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, and CSP directives.
* **Verification**: Curl and browser response headers confirm presence of security headers on all endpoints. Status: `RESOLVED AND VERIFIED`.
