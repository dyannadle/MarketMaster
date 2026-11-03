# Design System & Component Library
## Project: MarketMaster Academy
**Tokens**: Typography, Colors, Spacing, Elevation, Micro-Interactions  
**Version**: 1.0.0  

---

### 1. Typography Hierarchy
* **Primary Sans-Serif**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`.
* **Monospace (Prices, Quantities, Code)**: `JetBrains Mono`, `Roboto Mono`, `Fira Code`, `monospace` (Tabular numbers enabled via `font-feature-settings: 'tnum'`).

| Element | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display Heading** | 32px / 2.0rem | 700 Bold | 1.2 | Module landing page headers |
| **Section Title** | 24px / 1.5rem | 600 SemiBold| 1.3 | Card & screen headers |
| **Subtitle / Concept**| 18px / 1.125rem | 600 SemiBold| 1.4 | Concept titles |
| **Body Regular** | 14px / 0.875rem | 400 Regular | 1.5 | General explanations & lesson text |
| **Price / Quantities** | 14px / 0.875rem | 600 Mono | 1.0 | Order book quotes, P&L numbers |
| **Badge / Caption** | 12px / 0.75rem | 500 Medium | 1.4 | Status pills, tooltips |

---

### 2. Core UI Component Specifications
* **Button**: Primary (Filled Blue), Success (Filled Emerald), Danger (Filled Coral), Secondary (Outline Slate), Ghost. States: Default, Hover, Active, Disabled, Loading (with spinner).
* **Card**: 1px subtle slate border (`#1E2638`), 8px border radius, flat surface background (`#111622`).
* **Modal Dialog**: Centered backdrop blur (`backdrop-blur-sm`), accessible focus trap, ESC key dismiss handler, `aria-modal="true"`.
* **Toast Notification**: Positioned bottom-right on Desktop, top-center on Mobile. Auto-dismiss after 4 seconds; supports Info, Success, Warning, Error.

