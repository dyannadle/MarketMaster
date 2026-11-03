# Project Rules & Development Standards
## Project: MarketMaster Academy
**Applies To**: All Developers, Agents, Pull Requests, Architecture & Content Contributors  
**Enforcement**: Mandatory in CI/CD & Code Review  

---

### 1. Zero-Cost Budget Rule
* **Rule 1.1**: Under no circumstances shall any dependency, cloud service, API, or plugin be introduced that requires paid subscription, commercial licensing, or recurrent hosting fees.
* **Rule 1.2**: If a third-party service introduces pricing or reduces its free tier, a self-hosted or client-side fallback must be activated immediately.

---

### 2. Regulatory Compliance & Disclaimers
* **Rule 2.1**: Never display real money symbols or represent virtual funds as withdrawable cash.
* **Rule 2.2**: The persistent educational disclaimer must remain visible across all footers, trading screens, and certificates:
  > *"MarketMaster Academy is an educational market simulation platform. It does not provide investment advisory, financial planning, or broker-dealer services. All capital is virtual."*
* **Rule 2.3**: Never include fake testimonials, fabricated reviews, or unsupported performance claims (e.g. "Become a millionaire in 30 days").

---

### 3. Ethical Design & Anti-Dark-Patterns
* **Rule 3.1**: No artificial urgency, fake countdown timers, or manipulated notification badges.
* **Rule 3.2**: No hidden fees or surprise paywalls.
* **Rule 3.3**: Clear, unambiguous Cancel and Account Deletion buttons must be accessible within 2 clicks from User Settings.

---

### 4. Data Privacy & Minimization (DPDP / GDPR)
* **Rule 4.1 (Data Minimization)**: Only collect email, hashed password, and display name. Never request phone numbers, Aadhaar, PAN, banking credentials, or contacts.
* **Rule 4.2 (Age Consent)**: Explicit checkbox on signup verifying user is at least 18 years of age or has parental guardian consent for minors.
* **Rule 4.3 (Right to Erasure)**: Immediate automated hard deletion of all user records upon trigger of `POST /api/v1/auth/delete-account`.
* **Rule 4.4 (Email Unsubscribe)**: Every automated system email must include a single-click unsubscribe link.

---

### 5. Code Quality & Security Invariants
* **Rule 5.1 (Zero Frontend Trust)**: Every order size, tick price, and margin requirement must be strictly validated on the backend.
* **Rule 5.2 (Parameterized Queries)**: No direct string interpolation into SQL queries.
* **Rule 5.3 (Auth on Every Route)**: All non-public API routes must enforce Bearer JWT validation.
* **Rule 5.4 (Audit Third-Party SDKs)**: Only vetted, open-source SDKs with permissive licenses (MIT, Apache 2.0, BSD) are allowed. No closed-source spyware or ad-trackers.

---

### 6. Accessibility & Inclusivity (WCAG 2.1 AA)
* **Rule 6.1 (Contrast Ratio)**: Text and interactive elements must maintain a minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text against their backgrounds.
* **Rule 6.2 (Alt Text)**: Every SVG diagram, chart image, and icon must have descriptive `alt` text or `aria-label`.
* **Rule 6.3 (Keyboard Navigation)**: All interactive elements, modal dialogs, and trading buttons must be completely navigable via Tab, Enter, Space, and Arrow keys.

---

### 7. Mandatory Living Tracking Protocol (`decision.md` & `changes.md`)
* **Rule 7.1 (Continuous Decision Logging in `decision.md`)**:
  * Every single decision taken about anything in the project (architectural, design, operational, technical, pedagogical, security, or data-related) MUST immediately be recorded in [`decision.md`](decision.md).
  * Each decision entry MUST include:
    1. Unique ADR ID & Title (e.g., `ADR-007`)
    2. Exact Date and Timestamp (ISO 8601 / UTC & Local Time)
    3. Status (`Approved`, `Implemented`, `Superseded`)
    4. Exact Decision Taken
    5. Context & Rationale (Why was this decision taken?)
    6. Alternatives Considered & Why Rejected
    7. Concrete System & Project Impact
* **Rule 7.2 (Granular Change Logging in `changes.md`)**:
  * Every single change made to the project—without exception, covering all small, medium, and big modifications (code edits, file creations, schema changes, bug fixes, refactors, documentation updates, configuration tweaks, or dependency additions)—MUST immediately be logged in [`changes.md`](changes.md).
  * Each change entry MUST record:
    1. Release / Batch Tag
    2. Exact Date and Timestamp (ISO 8601 / UTC & Local Time)
    3. Author / Agent / Contributor Identity
    4. Change Scope & Category (`Small Fix`, `Feature`, `Refactor`, `Schema`, `Security`, `Doc`)
    5. Exact File(s) Created, Modified, or Deleted
    6. Comprehensive Description of the change and functional outcome
* **Rule 7.3 (Zero Unrecorded Actions)**:
  * No development action, code commit, or architectural modification shall be considered complete without contemporaneous, synchronized updates to `decision.md` and `changes.md`.


