# Security Hardening & API Protection Specification
## Project: MarketMaster Academy
**Standard**: Comprehensive Defensive Engineering Architecture  
**Version**: 1.0.0  

---

### 1. The 10 Inviolable Security Mandates

#### 1. Row-Level Security (RLS)
PostgreSQL RLS policies are enabled on all user-owned tables (`virtual_accounts`, `simulated_orders`, `virtual_positions`, `cash_ledger`).
```sql
ALTER TABLE simulated_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_orders_isolation ON simulated_orders
    FOR ALL
    USING (account_id IN (
        SELECT id FROM virtual_accounts WHERE user_id = auth.uid()
    ));
```

#### 2. Authentication on Every API Route
* Every endpoint except `/auth/login`, `/auth/register`, `/courses` (public view), and `/health` requires a valid JWT Bearer token in the `Authorization` header.
* Global security filter intercepts all requests and rejects unauthenticated or expired tokens with HTTP `401 Unauthorized`.

#### 3. Never Trust the Frontend
* The client is treated as untrusted runtime.
* Prices, quantities, margin requirements, account balances, and lot sizes are recalculated and enforced server-side before any order execution occurs.

#### 4. Strict Rate Limiting (Token Bucket)
* Rate limiting implemented via Redis token bucket (or in-memory fallback):
  * **Auth Routes**: 5 requests per 10 minutes per IP.
  * **Order Placement**: 60 orders per minute per user account.
  * **Market Data APIs**: 120 queries per minute per IP.
  * Violations respond with HTTP `429 Too Many Requests` and `Retry-After` header.

#### 5. Input Sanitization & Parameterized Queries
* 100% of SQL queries executed through Spring Data JPA / PreparedStatement. Raw string concatenation is blocked by ESLint and SonarQube rules.
* User input strings (display names, journal notes) sanitized against XSS using DOMPurify / OWASP Java HTML Sanitizer.

#### 6. Debug Mode Disabled in Production
* `DEBUG=false` and `spring.profiles.active=production`.
* Stack traces, SQL queries, and internal server paths are never exposed in API error payloads (standardized error schema: `{ error: "INTERNAL_ERROR", message: "An unexpected error occurred.", traceId: "<uuid>" }`).

#### 7. Elimination of IDOR (Insecure Direct Object Reference)
* Entity identifiers use non-sequential UUIDv4 instead of sequential auto-incrementing integers (`1, 2, 3...`).
* Every data operation verifies that the authenticated user owns the parent account associated with the requested resource.

#### 8. HTTPS Everywhere & Strict Transport Security
* HTTPS enforced with automatic HTTP $\to$ HTTPS 301 redirection.
* `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` header enabled.

#### 9. CORS Lockdown
* Cross-Origin Resource Sharing (CORS) strictly whitelists explicit production domain origins (`https://marketmaster.academy`). Wildcards (`*`) with credentials (`Access-Control-Allow-Credentials: true`) are prohibited.

#### 10. Audit Logging of Administrative Actions
* All administrative actions (e.g., banning abusive accounts, updating curriculum, broadcasting maintenance notices) create an immutable audit record in `admin_audit_logs` storing admin ID, IP, timestamp, old state, and new state.

---

### 2. Edge, Storage & Form Defenses
* **CAPTCHA on Public Forms**: Cloudflare Turnstile (free tier) protecting registration, password reset, and contact inquiry forms.
* **Private Storage Buckets**: S3 / R2 buckets storing user exports or database backups are private with public access blocked; accessed strictly via pre-signed URLs with 5-minute expiration.
* **File Upload Type Verification**: File uploads (e.g. avatar or journal attachments) validated via magic byte inspection (rejecting `.exe`, `.sh`, `.php` masked as `.png`).
* **Vulnerable Package Audits**: Automated `npm audit` and Snyk/Dependabot scanning executed on every pull request.
* **Webhook Signature Verification**: If external webhooks are configured, signatures are verified using HMAC-SHA256 (`X-Signature-256`) with secret keys.
* **Obfuscation of Admin Pages**: Administrative dashboard routes are protected by role-based access control (RBAC) requiring `role === 'ADMIN'`. Non-admin requests return `404 Not Found` rather than `403 Forbidden` to hide route existence.

