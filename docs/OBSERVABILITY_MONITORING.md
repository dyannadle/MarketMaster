# Observability, Logging & Monitoring Specification
## Project: MarketMaster Academy
**Tools**: Winston, Morgan, SLF4J, Prometheus, Grafana, Sentry, PostHog  
**Version**: 1.1.0  

---

### 1. Dual-Layer Logging & Telemetry Pipeline

```mermaid
flowchart TD
    InboundReq["Inbound Client Request"] --> MorganLogger["Morgan HTTP Ingress Middleware<br/>(Method, Path, Status, Response Time ms, Anonymized IP)"]
    
    MorganLogger --> RouteHandler["Application Service / Controller"]
    
    RouteHandler --> WinstonLogger["Winston Application Logger<br/>(Structured JSON, Log Level, TraceID, UserID)"]
    
    WinstonLogger --> ConsoleOut["Console Stream (Local Dev)"]
    WinstonLogger --> FileOut["Rolling File Transports (/logs/app.log)"]
    
    RouteHandler --> MetricsCollector["Prometheus Micrometer Exporter"]
    MetricsCollector --> MetricsEndpoint["/actuator/prometheus Endpoint"]
    MetricsEndpoint --> PrometheusServer["Prometheus Time-Series Scraper"]
    PrometheusServer --> GrafanaDashboard["Grafana Operational Dashboards"]

    RouteHandler --> ExceptionCheck{"Unhandled Exception?"}
    ExceptionCheck -->|Yes| SentrySDK["Sentry Error SDK<br/>(Captures Stack Trace, Release, Scrubbed Context)"]
    SentrySDK --> SentryCloud["Sentry Alert Center"]
    ExceptionCheck -->|No| SuccessResponse["Return HTTP 200/201"]
```

---

### 2. Error Reporting & Triage Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant Client as Web / Android App
    participant Controller as Spring Boot Controller
    participant Sentry as Sentry Telemetry Hub
    participant Devs as Engineering Alerts (Slack / Email)

    Client->>Controller: Place Order Request
    Controller->>Controller: Execution Exception (e.g. Database Connection Drop)
    
    Controller->>Sentry: Capture Exception(Error, TraceId, Breadcrumbs)
    Note over Sentry: Automatic PII Scrubbing (Email, Token stripped)
    
    Sentry->>Devs: Dispatch Real-Time Incident Notification
    
    Controller-->>Client: Standardized Safe JSON Error Response:<br/>{ error: "INTERNAL_SERVER_ERROR", traceId: "abc-123" }
    Note over Client: Zero Internal Stack Traces Leaked to User
```
