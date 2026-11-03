# Frontend Architecture Specification
## Project: MarketMaster Academy
**Framework**: Next.js 15 (App Router), React 19, TypeScript 5.5+, Tailwind CSS v4  
**Version**: 1.0.0  

---

### 1. Technology Choices & Design Rationales
* **Next.js 15 App Router**: Server Components (RSC) for lightning-fast initial load of documentation and learning courseware with zero client-side JavaScript overhead.
* **TradingView Lightweight Charts (v4+)**: Open-source, high-performance Canvas-based financial charting engine. 10x lighter and faster than full TradingView charting library, operates with 0 license fees.
* **Zustand**: Minimalist, fast, unopinionated client-side state management for the live paper trading terminal and candle replay state machine.
* **Tailwind CSS v4**: Zero-runtime CSS engine with custom color system adhering to strict WCAG 2.1 AA accessibility contrast standards.

---

### 2. Core Frontend Components & Layout Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        APP LAYOUT (RootLayout)                         │
├────────────────────────────────────────────────────────────────────────┤
│ Top Navigation Bar (Logo, Level Tracker, Virtual Balance, Profile)     │
├───────────────┬────────────────────────────────────────────────────────┤
│ Side Nav      │ Main Viewport Content                                  │
│ • Academy     │ ┌────────────────────────────────────────────────────┐ │
│ • Terminal    │ │ Dynamic Component (Terminal / Lesson / Gym / Lab)  │ │
│ • Replay Gym  │ └────────────────────────────────────────────────────┘ │
│ • Strategy Lab│ Floating Panels: Order Entry Modal | Trade Audio Sfx   │
│ • Analytics   ├────────────────────────────────────────────────────────┤
│ • Settings    │ Footer & System Status / Disclaimers / Cookie Banner   │
└───────────────┴────────────────────────────────────────────────────────┘
```

---

### 3. Client-Side Simulation & State Machines

#### 3.1 Replay State Machine (Zustand)
```typescript
interface ReplayState {
  isPlaying: boolean;
  playbackSpeed: number; // 1x, 2x, 5x, 10x, 60x
  currentBarIndex: number;
  totalBars: number;
  activeCandle: Candle | null;
  historyCandles: Candle[];
  
  // Actions
  loadSession: (datasetId: string, isBlind: boolean) => void;
  play: () => void;
  pause: () => void;
  stepForward: () => void;
  setSpeed: (speed: number) => void;
  resetSession: () => void;
}
```

#### 3.2 Performance & Rendering Optimizations
* **Canvas Virtualization**: Order book depth (Level 2) rendered using optimized Canvas element to avoid React virtual DOM thrashing during 60 FPS tick feeds.
* **Web Workers for Backtesting**: Computational backtests and indicator computations execute inside dedicated Web Workers, preventing UI thread freezing.

