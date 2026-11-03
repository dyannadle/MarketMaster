# Mobile Application Specification (Android)
## Project: MarketMaster Academy Native App
**Distribution Channel**: Direct APK Download (GitHub Releases / Website) — ₹0 Publisher Overhead  
**Target SDK**: Android 14 / 15 (API 34/35), Minimum SDK: API 26 (Android 8.0 Oreo)  
**Version**: 1.0.0  

---

### 1. Primary Screen Specifications & User Flows

#### 1.1 Bottom Navigation Bar (5 Primary Tabs)
1. **Learn**: Hierarchy of Levels 0 to 5, course progress bars, lesson bookmarks, and interactive calculators.
2. **Markets**: Live/replay watchlists, market heatmaps, sector performance, and instrument search.
3. **Trade (Terminal)**: Interactive candlestick chart, 5x5 market depth, quick Buy/Sell action buttons, active positions, and open orders.
4. **Gym (Practice)**: Instant access to Rated Blind Replay, Daily Setup Challenge, and Pattern Drills.
5. **Portfolio & Profile**: Virtual equity curve, win-rate breakdown, trading journal, and privacy controls.

---

### 2. Gesture & Interaction Mechanics
* **Pinch-to-Zoom**: Fluid zooming on candlestick chart horizontally (time) and vertically (price scale).
* **Crosshair Long-Press**: Activates inspection crosshair showing Open, High, Low, Close, Volume, and Date of selected candle.
* **Swipe-to-Dismiss / Swipe-to-Action**:
  * Swipe left on open order to Cancel.
  * Swipe right on open position to trigger Quick Square-Off at market.
* **Haptic Feedback**: Crisp tactile vibration on order placement, fill execution, stop-loss hit, and quiz answer verification.

---

### 3. Permissions & System Integration Guidelines
* **Zero Intrusive Permissions**: Does NOT request Contacts, SMS, Phone State, Location, Camera, or Microphone.
* **Notification Permission (`POST_NOTIFICATIONS`)**: Optional permission for user-requested alerts (e.g. Daily Challenge refreshed at 00:00 UTC, Price Alert triggered).
* **Storage Permission**: Uses Android App-Specific Storage (`context.filesDir`) for database and exports. Zero external storage permissions required.
* **Biometric Authentication**: Local biometric authentication (`BiometricPrompt`) to protect user's trading journal and virtual account stats.

