# Admin Panel Technical Specification
## Project: MarketMaster Academy
**Access Control**: Role-Based (`role === 'ADMIN'`), Multi-Factor Authentication (MFA) Enforced  
**Version**: 1.1.0  

---

### 1. Administrative Workflow & RBAC State Machine

```mermaid
flowchart TD
    AdminLogin["Admin Access Request (MFA Authenticated)"] --> RBACCheck{"Role Verification:<br/>role == 'ADMIN'?"}
    
    RBACCheck -->|No| Return404["Return HTTP 404 Not Found<br/>(Hides existence of admin portal)"]
    RBACCheck -->|Yes| AdminDashboard["Admin Console Home"]
    
    AdminDashboard --> Module1["1. User Management<br/>• Search, Lock, Reset Virtual Balance<br/>• GDPR/DPDP Hard Deletion Trigger"]
    AdminDashboard --> Module2["2. Content CMS<br/>• Markdown Course Editor<br/>• Interactive Widget Configurator<br/>• Quiz Authoring & Translations"]
    AdminDashboard --> Module3["3. Market & Ledger Audit<br/>• Inspect Active Orders & Positions<br/>• Audit Double-Entry Cash Ledger<br/>• Manual Circuit Breaker Trigger"]
    AdminDashboard --> Module4["4. Platform Notifications<br/>• Broadcast System Maintenance<br/>• Dispatch Targeted Push Alerts"]
    AdminDashboard --> Module5["5. Reports & Compliance<br/>• Export Student Progress Logs<br/>• Regulatory Audit Tearsheets"]
    
    Module1 --> AuditLog["Log Action in admin_audit_logs<br/>(AdminID, Timestamp, Action, Diff)"]
    Module2 --> AuditLog
    Module3 --> AuditLog
    Module4 --> AuditLog
    Module5 --> AuditLog
```

---

### 2. User Data Erasure (Right to be Forgotten) Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant Admin as Admin / User Request
    participant Controller as AdminUserController
    participant DB as PostgreSQL Core DB
    participant Audit as Admin Audit Logger

    Admin->>Controller: POST /api/v1/admin/users/{userId}/hard-delete
    Controller->>Controller: Verify SuperAdmin Permission & Confirmation Nonce
    
    Controller->>DB: Begin Atomic Deletion Transaction
    DB->>DB: DELETE FROM user_concept_progress WHERE user_id = :id
    DB->>DB: DELETE FROM cash_ledger WHERE account_id IN (SELECT id FROM virtual_accounts WHERE user_id = :id)
    DB->>DB: DELETE FROM simulated_orders WHERE account_id IN (SELECT id FROM virtual_accounts WHERE user_id = :id)
    DB->>DB: DELETE FROM virtual_positions WHERE account_id IN (SELECT id FROM virtual_accounts WHERE user_id = :id)
    DB->>DB: DELETE FROM virtual_accounts WHERE user_id = :id
    DB->>DB: DELETE FROM users WHERE id = :id
    DB-->>Controller: Cascade Deletion Complete
    
    Controller->>Audit: Record Audit Log Entry: { admin: "admin-1", action: "HARD_DELETE_USER", target: :id }
    Controller-->>Admin: 200 OK (User Data Permanently Expunged)
```
