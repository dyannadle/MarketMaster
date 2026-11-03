# Cookie Policy & Consent Framework
## Project: MarketMaster Academy
**Compliance**: ePrivacy Directive (EU), GDPR, India DPDP Act 2023  
**Effective Date**: November 3, 2026  

---

### 1. What Are Cookies?
Cookies are small alphanumeric text files stored on your browser or device that allow web applications to remember your session authentication, preferences, and security state.

---

### 2. Cookie Classification & Purpose Matrix

| Category | Lifespan | Purpose | Consent Required? |
| :--- | :--- | :--- | :--- |
| **Strictly Necessary (Essential)** | Session / 7 Days | Authentication JWT tokens (`__Host-mma-session`), CSRF protection tokens (`__Host-mma-csrf`), rate-limiting cookies. | **No** (Exempt under GDPR/ePrivacy as essential for service delivery) |
| **Functional / Preference** | 30 Days | Theme preference (`mma-theme`: dark/light), chart configuration, audio sound effects toggle. | **Yes** (Opt-in via Cookie Banner) |
| **Analytics (Privacy-Preserving)** | 90 Days | Anonymous usage metrics, page load speeds, lesson completion funnels (PostHog self-hosted with IP masking). | **Yes** (Opt-in via Cookie Banner) |
| **Marketing / Advertising** | None | **WE DO NOT USE ANY ADVERTISING COOKIES.** | **N/A** |

---

### 3. Cookie Consent Banner Specification
* **Banner Display**: Fixed bottom banner appearing upon first visit.
* **Consent Controls**:
  * `[Accept All]`
  * `[Reject Non-Essential]`
  * `[Customize Preferences]` (Granular toggles for Functional and Analytics cookies).
* **Strict Prior Blocking**: No analytics or preference scripts fire until explicit positive consent is granted.
* **Revocation**: Users can click the persistent `"Cookie Settings"` link in the footer at any time to modify or revoke consent.

