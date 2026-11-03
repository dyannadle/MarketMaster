# Logging, Observability & Monitoring Specification
## Project: MarketMaster Academy
**Stack**: Winston + Morgan (Frontend/BFF), SLF4J + Logback (Backend), Prometheus, Grafana, Sentry, PostHog  
**Version**: 1.0.0  

---

### 1. Structured Logging Strategy
* **HTTP Access Logs (Morgan / Spring Filter)**: Logs method, path, status, latency (ms), client IP (masked for GDPR/DPDP), user agent.
* **Application Event Logs (Winston / Logback)**: JSON-formatted logs with standardized schema:
  ```json
  {
    "timestamp": "2026-11-03T16:30:00.123Z",
    "level": "INFO",
    "service": "simulation-engine",
    "traceId": "c4b8e219-4821-4f11",
    "userId": "d9812-3211",
    "action": "ORDER_MATCHED",
    "symbol": "NIFTY24NOV24500CE",
    "qty": 50,
    "price": 124.50
  }
  ```

---

### 2. Metrics & Telemetry (Prometheus & Grafana)
* **JVM Metrics**: Heap memory utilization, Virtual Thread count, GC pause durations.
* **Simulation Metrics**:
  * `marketmaster_orders_total{status="FILLED|REJECTED|CANCELLED"}`
  * `marketmaster_matching_latency_seconds_bucket`
  * `marketmaster_active_replay_sessions_gauge`
* **Error Tracking (Sentry)**:
  * Automatic capture of unhandled client and server exceptions with full stack traces, release versions, and breadcrumbs. Zero PII transmitted.
* **Product Analytics (PostHog)**:
  * Privacy-respecting tracking of lesson completion funnels, Daily Challenge participation, and practice retention rates.

