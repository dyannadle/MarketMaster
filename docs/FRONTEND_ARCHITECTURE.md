# Frontend Architecture Specification
## Project: MarketMaster Academy
**Framework**: Next.js 15 (App Router), React 19, TypeScript 5.5+, Tailwind CSS v4  
**Version**: 1.1.0  

---

### 1. Component Hierarchy & Layout Tree

```mermaid
graph TD
    RootLayout["RootLayout (app/layout.tsx)<br/>• ThemeProvider (Dark/Light)<br/>• ToastProvider<br/>• CookieConsentBanner"]
    
    RootLayout --> TopNav["TopNavBar<br/>• Brand Logo<br/>• Level & XP Tracker<br/>• Virtual Balance Counter<br/>• Profile Dropdown"]
    RootLayout --> SideNav["SideNavBar (Collapsible)<br/>• Academy<br/>• Terminal<br/>• Replay Gym<br/>• Strategy Lab<br/>• Analytics<br/>• Settings"]
    
    RootLayout --> MainContent["Dynamic Route Viewport"]
    
    subgraph Viewports["Core Viewports"]
        TerminalPage["/terminal (Paper Trading Terminal)"]
        GymPage["/gym/rated (Blind Replay Gym)"]
        AcademyPage["/academy/[level]/[concept]"]
        LabPage["/strategy-lab (Algo Lab)"]
    end
    
    MainContent --> Viewports

    subgraph TerminalComponents["Terminal Viewport Components"]
        Watchlist["WatchlistPane (Tickers & Depth)"]
        Chart["TradingViewChart (Canvas / WebGL)"]
        OrderBook["DepthLadder (5x5 Bids & Asks)"]
        OrderModal["OrderEntryModal (Market, Limit, SL, BO)"]
        PositionsTable["ActivePositions & OpenOrders Pane"]
    end
    
    TerminalPage --> TerminalComponents
```

---

### 2. Client-Side State Management (Zustand Flowchart)

```mermaid
flowchart LR
    subgraph StateStores["Zustand Client Stores"]
        AuthStore["useAuthStore<br/>• User Profile<br/>• JWT Tokens<br/>• Session State"]
        TradingStore["useTradingStore<br/>• Active Orders<br/>• Net Positions<br/>• Cash Balance<br/>• Unrealized PnL"]
        ReplayStore["useReplayStore<br/>• Current Bar Index<br/>• Playback Speed<br/>• IsPlaying (Boolean)<br/>• Active Candle Slice"]
    end

    subgraph UIComponents["Subscriber Components"]
        ChartComp["TradingViewCandleChart"]
        DepthComp["MarketDepthBook"]
        PositionsComp["PositionsTable"]
        HeaderComp["AccountBalanceHeader"]
    end

    TradingStore -->|Select Positions & PnL| PositionsComp
    TradingStore -->|Select Cash & Equity| HeaderComp
    ReplayStore -->|Select Current Candle| ChartComp
    ReplayStore -->|Select Depth| DepthComp
```

---

### 3. Replay Playback Engine State Machine

```mermaid
stateDiagram-v2
    [*] --> STOPPED: Dataset Loaded
    STOPPED --> PLAYING: Click 'Play' (Spacebar)
    
    PLAYING --> PAUSED: Click 'Pause' (Spacebar)
    PAUSED --> PLAYING: Click 'Resume'
    
    PAUSED --> STEPPING: Click 'Step Forward' (Right Arrow)
    STEPPING --> PAUSED: Advance Exactly 1 Bar
    
    PLAYING --> SPEED_CHANGE: Select 2x / 5x / 10x / 60x
    SPEED_CHANGE --> PLAYING: Update Timer Interval
    
    PLAYING --> FINISHED: Cursor reaches final historical bar
    PAUSED --> FINISHED: Cursor reaches final historical bar
    
    FINISHED --> STOPPED: Click 'Reset Session'
```
