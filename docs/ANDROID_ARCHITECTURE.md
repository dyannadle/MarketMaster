# Android Architecture Specification
## Project: MarketMaster Academy Native Android Client
**Platform**: Android 8.0+ (API 26 to API 35+)  
**Language & Framework**: Kotlin 2.0+, Jetpack Compose, Coroutines & Flow, Room ORM  
**Version**: 1.1.0  

---

### 1. MVI / Clean Architecture Unidirectional Data Flow

```mermaid
flowchart TD
    UserTouch["User Action (Touch Gesture / Order Submission)"] --> IntentAction["UI Intent (e.g. PlaceOrderIntent, StepReplayIntent)"]
    
    IntentAction --> ViewModel["Jetpack Compose ViewModel<br/>(StateFlow & SharedFlow)"]
    
    ViewModel --> DomainUseCase["Domain UseCase<br/>(e.g., PlaceSimulatedOrderUseCase)"]
    
    DomainUseCase --> Repository["Repository Layer (Single Source of Truth)"]
    
    subgraph DataSources["Data Sources (Offline-First)"]
        LocalDB[("Room Local SQLite Database<br/>• Cached Lessons & Quizzes<br/>• Offline Orders & Ledger")]
        RemoteAPI["Remote Backend API / WebSocket<br/>(Ktor / Retrofit 2)"]
    end
    
    Repository -->|Query Local First| LocalDB
    Repository -->|Sync when Online| RemoteAPI
    
    LocalDB --> Repository
    RemoteAPI --> Repository
    
    Repository --> DomainUseCase
    DomainUseCase --> ViewModel
    
    ViewModel --> UIState["Immutable UIState (StateFlow)"]
    UIState --> ComposeScreen["Compose Screen Recomposition<br/>(Material 3 Components)"]
```

---

### 2. Offline-First Reconnection & Synchronization Sequence

The Android client allows users to study courses and execute simulated paper trades even with zero internet connectivity. When internet access resumes, local state reconciles with the backend.

```mermaid
sequenceDiagram
    autonumber
    participant App as Android Client (Room DB)
    participant NetMonitor as Connectivity Manager
    participant Backend as Spring Boot Cloud API

    Note over App: Device Enters Offline / Airplane Mode
    App->>App: User places trade: BUY 50 NIFTY
    App->>App: Local Matching Engine processes fill in local Room DB
    App->>App: Store sync queue item: [SyncQueue: orderId, fillPrice, timestamp]
    
    Note over NetMonitor: Device Reconnects to Internet (Wi-Fi / 5G)
    NetMonitor->>App: Network Available Callback
    
    App->>Backend: POST /api/v1/sync/reconcile (List of Offline Orders & Quizzes)
    Backend->>Backend: Verify Nonces, Timestamp Sequence & Idempotency
    Backend->>Backend: Merge Offline Ledger Entries into Cloud Database
    Backend-->>App: Return 200 OK (Reconciliation Successful)
    
    App->>App: Clear Local SyncQueue
    Note over App: Cloud & Local State 100% In Sync!
```
