# Frontend Architecture Specification: Stitch-Powered Responsive UI
## Project: MarketMaster Academy
**Framework**: Next.js 15 (App Router), React 19, TypeScript 5.5+, Tailwind CSS v4  
**UI Engine & Prototyping**: Stitch UI AI Platform, Framer Motion, Lucide Icons, TradingView Lightweight Charts  
**Aesthetic Standard**: Institutional Dark Terminal (`#080C14`), Luminous Accent Accents, Responsive Multi-Breakpoint  
**Version**: 2.0.0  

---

### 1. Stitch UI Integration & Design Philosophy

MarketMaster Academy leverages **Stitch UI** to design, prototype, and synthesize production-grade interactive screens and design systems:

* **Institutional Terminal Dark Theme**:
  * Deep background: `slate-950` (`#080C14`) with glassmorphism card containers (`rgba(15, 23, 42, 0.75)` with subtle `border-slate-800/80`).
  * Financial metrics: Emerald green (`#10B981`) for profits and bids; bright rose (`#F43F5E`) for losses and asks; cyan (`#06B6D4`) for order markers and execution cursors.
* **Fluid Responsiveness Across All Form Factors**:
  * **Desktop Terminal (>= 1280px)**: Multi-pane Bloomberg/TradingView workstation layout (Watchlist, 1-min Chart, Level-2 Depth Ladder, Fast Order Dock, and Positions Ledger visible simultaneously).
  * **Tablet / Compact (768px - 1279px)**: Dual-pane collapsible drawer layout with tabbed bottom dock.
  * **Mobile Terminal (< 768px)**: Bottom-sheet execution drawer, quick-swipe timeframe toggles, and thumb-friendly One-Tap Buy/Sell buttons.
* **Micro-Interactions & Gamified Rewards**:
  * **Framer Motion**: Smooth entry/exit animations for modals, price flash animations when bids/asks tick, and animated progress rings for lesson completion.
  * **Discipline Visualizer**: Dynamic glowing ring showing real-time trader discipline score.
  * **Sound & Confetti**: Subtle audio feedback on order execution; canvas-confetti bursts upon mastering a curriculum level or completing a Daily Replay Challenge.

---

### 2. Component Hierarchy & Layout Tree

```mermaid
graph TD
    RootLayout["RootLayout (app/layout.tsx)<br/>• ThemeProvider (Institutional Dark)<br/>• ToastProvider<br/>• SoundFXProvider"]
    
    RootLayout --> TopNav["TopNavBar<br/>• MarketMaster Logo<br/>• Level & XP Mastery Bar<br/>• Virtual Balance Counter (₹10,00,000)<br/>• Discipline Score Ring (92/100)"]
    RootLayout --> SideNav["SideNavBar (Collapsible)<br/>• Terminal (Live Replay)<br/>• ChartingPark Gym<br/>• 6-Level Academy<br/>• Strategy Lab<br/>• Leaderboards<br/>• Settings"]
    
    RootLayout --> MainContent["Dynamic Route Viewport"]
    
    subgraph Viewports["Core Viewports"]
        TerminalPage["/terminal (Stitch Pro Terminal)"]
        GymPage["/gym/replay (Blind Replay Gym)"]
        AcademyPage["/academy/[level]/[concept]"]
        LabPage["/strategy-lab (Pyodide Algo Lab)"]
    end
    
    MainContent --> Viewports

    subgraph TerminalComponents["Terminal Sub-Components (Stitch Synthesized)"]
        Watchlist["WatchlistBar (Tickers & Depth)"]
        Chart["TradingViewChart (Canvas / WebGL)"]
        OrderBook["DepthLadder (5x5 Bids & Asks)"]
        OrderDock["InstantOrderDock (Market, Limit, SL, BO)"]
        PostMortemModal["AutomatedTradePostMortemModal"]
        PositionsTable["ActivePositions & Ledger"]
    end
    
    TerminalPage --> TerminalComponents
```

---

### 3. Client-Side State Management (Zustand Flowchart)

```mermaid
flowchart LR
    subgraph StateStores["Zustand Client Stores"]
        AuthStore["useAuthStore<br/>• User Profile<br/>• JWT Tokens<br/>• Streak Days"]
        TradingStore["useTradingStore<br/>• Active Orders<br/>• Open Positions<br/>• Virtual Cash<br/>• Unrealized PnL"]
        ReplayStore["useReplayStore<br/>• Current Bar Index<br/>• Playback Speed (0.5x-10x)<br/>• IsBlindMode (Boolean)<br/>• Masked Ticker ASSET_X"]
        DisciplineStore["useDisciplineStore<br/>• Discipline Index (0-100)<br/>• Revenge Trade Alert<br/>• CoolDownState"]
    end

    subgraph UIComponents["Subscriber Components"]
        ChartComp["TradingViewCandleChart"]
        DepthComp["MarketDepthLadder"]
        OrderDockComp["InstantOrderDock"]
        HeaderComp["TopAccountBar"]
    end

    TradingStore -->|Select Positions & PnL| OrderDockComp
    TradingStore -->|Select Cash & Equity| HeaderComp
    ReplayStore -->|Select Current Candle| ChartComp
    DisciplineStore -->|Discipline Alert| HeaderComp
```
