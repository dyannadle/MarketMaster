# UI/UX Design Specification
## Project: MarketMaster Academy
**Visual Standard**: Institutional Financial Terminal meets Clean Modern SaaS  
**Accessibility Level**: WCAG 2.1 AA Compliance  
**Version**: 1.0.0  

---

### 1. Aesthetic Identity & Theme Modes
* **Dark Mode (Default)**: Deep terminal charcoal (`#0B0E14`), slate borders (`#1E2638`), crisp high-contrast text (`#F0F4F8`). Optimized for extended screen time and technical analysis.
* **Light Mode (Optional)**: Warm crisp paper off-white (`#F8FAFC`), cool slate dividers (`#E2E8F0`), deep obsidian typography (`#0F172A`).
* **Zero Dark Patterns**:
  * No countdown timers inducing false FOMO.
  * No hidden fees or fake gamification traps.
  * Every virtual trade clearly labeled: `"SIMULATED PAPER TRADE"`.

---

### 2. High-Contrast Accessible Financial Color System
* **Bullish (Up / Buy)**: `#10B981` (Emerald Green, Contrast Ratio $\ge 4.5:1$ against dark background).
* **Bearish (Down / Sell)**: `#EF4444` (Vibrant Coral Red, Contrast Ratio $\ge 4.5:1$).
* **Accent / Brand**: `#3B82F6` (Electric Blue).
* **Warning / Margin Alert**: `#F59E0B` (Amber Orange).
* **Colorblind Friendly Mode**: Supports Deuteranopia and Protanopia palettes (Blue for Bullish, Orange for Bearish).

---

### 3. Responsive Breakpoints & Viewport Layouts
* **Desktop ($> 1280\text{px}$)**: Multi-pane terminal layout (Left: Watchlist, Center: Interactive Chart & Replay Controls, Right: Order Entry & Depth Book, Bottom: Open Positions & Ledger).
* **Tablet ($768\text{px} - 1279\text{px}$)**: 2-column layout with tabbed bottom sheet.
* **Mobile ($< 768\text{px}$)**: Single-column view with bottom navigation bar (5 primary tabs) and swipe-up modal sheets for order placement and market depth.

