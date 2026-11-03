# Security Architecture & Safeguards
## Project: MarketMaster Academy
**Standard**: OWASP Top 10 (2021) & ASVS Level 2 Compliance  
**Version**: 1.0.0  

---

### 1. Authentication & Session Security
* **JWT Access Tokens**: Stateless, signed with HMAC-SHA256 (minimum 256-bit secret), 15-minute expiration window.
* **Refresh Tokens**: Cryptographically random 256-bit entropy, stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies. Refresh token rotation enforced on every exchange.
* **Password Hashing**: BCrypt with work factor 12 or Argon2id ($m=65536, t=3, p=4$). Zero plaintext storage.

---

### 2. Injection & Authorization Defenses
* **Zero Trust Frontend**: The backend re-validates all parameters (prices, quantities, margin requirements, account ownership) regardless of frontend checks.
* **Parameterized Queries**: 100% of SQL queries executed through Spring Data JPA / PreparedStatement. Raw string concatenation in SQL strictly prohibited.
* **IDOR (Insecure Direct Object Reference) Prevention**: All account, order, and journal lookups include mandatory session ownership checks:
  ```sql
  SELECT * FROM simulated_orders WHERE id = :orderId AND account_id IN (
      SELECT id FROM virtual_accounts WHERE user_id = :authenticatedUserId
  );
  ```
* **Row-Level Security (RLS)**: Enforced directly at the PostgreSQL database level on Supabase/Neon instances.

---

### 3. API Hardening & Network Defenses
* **Strict CORS Policy**: Whitelists only verified domain origins. Rejects wildcards (`*`) with credentials.
* **Rate Limiting**:
  * `/auth/login`: 5 attempts per 10 minutes per IP (Brute-force mitigation).
  * `/orders`: 60 orders per minute per account.
  * General API: 120 requests per minute per user.
* **Security Headers**:
  ```http
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline';
  ```

