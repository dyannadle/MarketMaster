# Admin Panel Technical Specification
## Project: MarketMaster Academy
**Access Control**: Role-Based (`role === 'ADMIN'`), Multi-Factor Authentication (MFA) Enforced  
**Version**: 1.0.0  

---

### 1. Core Administrative Modules

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ADMIN PANEL NAVIGATION                          │
├─────────────────────┬──────────────────┬───────────────────────────────┤
│ 1. User Management  │ 2. Content CMS   │ 3. Ledger & Order Monitor     │
│ 4. Notification Hub │ 5. Reports & BI  │ 6. Audit & Security Logs      │
└─────────────────────┴──────────────────┴───────────────────────────────┘
```

#### 1. User Management Module
* Search users by Email, Display Name, Skill Rating, or Account Status.
* View user learning history, completed modules, and trading journal stats.
* Administrative Actions: Reset virtual balance, lock/ban abusive accounts, force password reset, trigger complete account deletion.

#### 2. Content CMS & Course Control
* Visual WYSIWYG / Markdown editor for creating and editing Courses, Modules, and Concepts.
* Add/edit interactive calculator widgets, SVG formulas, and 4-question quizzes.
* Manage translations (English, Hindi, Marathi) and regulatory review schedule dates.

#### 3. Simulation Ledger & Order Audit
* Real-time inspection of active simulated orders, positions, and MTM snapshots across all virtual accounts.
* Inspection of double-entry cash ledger debits/credits for reconciliation verification.
* Manual market halt / simulated circuit breaker trigger for maintenance drills.

#### 4. Notification & Announcement Hub
* Compose and dispatch platform-wide announcements (e.g. "New F&O Greeks Module Released", "Weekly Replay Challenge Live").
* Deliver targeted in-app notifications and push notifications to Android devices.

#### 5. Reports & Analytics
* Macro platform metrics: Total Registered Learners, Daily Active Replay Users, Course Completion Funnel, Most Failed Quiz Questions.
* Export compliance reports to CSV for regulatory and educational audit verification.

#### 6. Administrative Audit Trail
* Every admin action is automatically recorded in `admin_audit_logs` with admin ID, timestamp, target entity, IP address, and JSON diff of changes.

