# Security Hardening & API Protection Specification
## Project: MarketMaster Academy
**Standard**: Comprehensive Defensive Engineering & Zero-Trust Architecture  
**Version**: 1.1.0  

---

### 1. Zero-Trust Authentication & Token Rotation Sequence

```mermaid
sequenceDiagram
    autonumber
    participant Client as Web / Android Client
    participant Proxy as Edge Reverse Proxy / Rate Limiter
    participant Auth as Spring Security JWT Filter
    participant DB as User Database (Argon2id Hash)

    Client->>Proxy: POST /api/v1/auth/login (Email, Password)
    Proxy->>Proxy: Check Rate Limit (Max 5 attempts / 10 min per IP)
    Proxy->>Auth: Forward Credentials
    Auth->>DB: Query User Record by Email
    DB-->>Auth: Return User (Argon2id Hash)
    Auth->>Auth: Verify Argon2id Password Hash
    
    alt Password Mismatch
        Auth-->>Client: 401 Unauthorized (Generic Error Message)
    else Password Correct
        Auth->>Auth: Generate 15-Minute Access Token (HS256)
        Auth->>Auth: Generate 7-Day Refresh Token (256-bit Entropy)
        Auth-->>Client: Return 200 OK:<br/>• Body: Access Token<br/>• Cookie: HttpOnly, Secure, SameSite=Strict Refresh Token
    end

    Note over Client,Auth: After 15 Minutes (Access Token Expires)

    Client->>Auth: POST /api/v1/orders (Expired Access Token)
    Auth-->>Client: 401 Token Expired
    Client->>Auth: POST /api/v1/auth/refresh (HttpOnly Refresh Cookie)
    Auth->>Auth: Invalidate Old Refresh Token & Issue New Refresh Token Pair (Rotation)
    Auth-->>Client: 200 OK (New Access Token & Rotated Cookie)
    Client->>Auth: Retry POST /api/v1/orders (New Access Token)
    Auth-->>Client: 201 Created (Order Processed)
```

---

### 2. Multi-Layer Defensive Security Invariants

```mermaid
flowchart TD
    subgraph Layer1["1. Network & Edge Defense"]
        DDoS["Cloudflare Edge DDoS Filtering"]
        TLS["Strict TLS 1.3 Encryption"]
        CORS["Strict CORS Whitelist (Zero Wildcards)"]
        RateLimit["Redis Token Bucket Rate Limiter"]
    end

    subgraph Layer2["2. Application Gateway Defense"]
        AuthFilter["Stateless JWT Bearer Filter"]
        AntiCSRF["Double-Submit Cookie CSRF Token"]
        CSP["Content Security Policy (CSP) & HSTS"]
        InputSanitizer["XSS & HTML Sanitization Engine"]
    end

    subgraph Layer3["3. Service & Business Defense"]
        ZeroTrust["Zero Frontend Trust (Re-Validate All Quantities & Prices)"]
        IDOR["UUIDv4 & Account Ownership Enforcement"]
        RMSGuard["Pre-Trade Margin Verification"]
    end

    subgraph Layer4["4. Database & Storage Defense"]
        RLS["PostgreSQL Row-Level Security (RLS)"]
        ParamSQL["100% Parameterized PreparedStatements"]
        PrivateBuckets["Private Cloud Storage & Pre-Signed URLs"]
    end

    Layer1 --> Layer2 --> Layer3 --> Layer4
```
