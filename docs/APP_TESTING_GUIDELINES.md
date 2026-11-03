# Mobile App Testing Guidelines (Android)
## Project: MarketMaster Academy Android Client
**Standards**: Device Matrix, Offline Testing, Battery & Performance  
**Version**: 1.0.0  

---

### 1. Device Matrix & Compatibility Testing
* **Screen Sizes**:
  * Compact Phones (360x640dp, e.g. Pixel 4a).
  * Standard Phones (390x844dp, e.g. Pixel 7 / Samsung Galaxy S23).
  * Large Foldables & Tablets (600dp+ width, verify adaptive two-pane layout).
* **OS Versions**: Test across Android 8.0 (Oreo, API 26), Android 11 (API 30), and Android 14/15 (API 34/35).

---

### 2. Offline Resilience Testing Checklist
1. Enable Airplane Mode: Ensure all downloaded/cached course modules and lessons are 100% readable.
2. Attempt order placement in Offline Mode: Ensure local matching engine executes order in local SQLite Room database without throwing network crashes.
3. Disable Airplane Mode: Verify background synchronization reconciles local paper trades with cloud ledger seamlessly.

