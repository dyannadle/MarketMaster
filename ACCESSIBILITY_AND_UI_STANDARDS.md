# Accessibility & UI Standards (WCAG 2.1 AA)
## Project: MarketMaster Academy
**Standard**: Web Content Accessibility Guidelines (WCAG) 2.1 Level AA  
**Version**: 1.0.0  

---

### 1. Contrast Ratios & Visual Accessibility
* **Normal Text ($< 18\text{pt}$)**: Minimum contrast ratio of **$4.5:1$** against background color.
* **Large Text ($\ge 18\text{pt}$ or $14\text{pt}$ Bold)**: Minimum contrast ratio of **$3.0:1$**.
* **Financial Chart Colors**:
  * Bullish Emerald (`#10B981` on `#0B0E14` dark background): Contrast ratio **$7.2:1$** (Exceeds AAA).
  * Bearish Coral (`#EF4444` on `#0B0E14` dark background): Contrast ratio **$4.9:1$** (Passes AA).
* **Colorblind Friendly Mode**: Toggle in settings providing a Color Vision Deficiency palette (Cobalt Blue for bullish up-moves, Amber Orange for bearish down-moves).

---

### 2. Comprehensive Keyboard Navigation
* **Focus Indicators**: All interactive elements (buttons, inputs, tabs, chart control toggles) feature a visible 2px electric-blue outline (`focus-visible:ring-2 focus-visible:ring-blue-500`) when focused via keyboard.
* **Replay Controls Keyboard Shortcuts**:
  * `Spacebar`: Play / Pause historical candle replay.
  * `Arrow Right`: Step forward exactly 1 candle bar.
  * `Arrow Left`: Step backward 1 candle bar.
  * `B`: Open Buy order modal.
  * `S`: Open Sell order modal.
  * `Escape`: Dismiss any open dialog, modal, or drawer.
* **Tab Order**: Logical top-to-bottom, left-to-right DOM tab index sequence with zero keyboard traps.

---

### 3. Screen Reader & Non-Text Content (Alt Text)
* All informational SVG graphics and interactive chart components declare `role="img"` with meaningful `aria-label`:
  * *Example*: `<svg role="img" aria-label="Line chart illustrating compound interest over 30 years with principal ₹1,00,000 growing to ₹30,00,000">`
* Purely decorative icons declare `aria-hidden="true"`.
* Form inputs are strictly linked with `<label htmlFor="inputId">`.

---

### 4. Official Business Details & Contact Notice
* Displayed permanently in the website footer:
  * **Entity**: MarketMaster Academy Open Education Initiative
  * **Email**: `contact@marketmaster.academy` / `support@marketmaster.academy`
  * **Operational Model**: 100% Free Open Educational Software & Market Simulation Sandbox
  * **Hosting Location**: Distributed Cloudflare / Vercel Edge Global Nodes

