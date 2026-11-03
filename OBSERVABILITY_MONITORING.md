# Observability, Logging & Monitoring Specification
## Project: MarketMaster Academy
**Tools**: Winston, Morgan, SLF4J, Prometheus, Grafana, Sentry, PostHog  
**Version**: 1.0.0  

---

### 1. Dual-Layer Logging Architecture (Morgan + Winston)

```
[Incoming HTTP Request]
           │
           ▼
[1. Morgan HTTP Middleware]
├── Method, URL, HTTP Status, Response Time (ms)
├── Content-Length, User-Agent, Anonymized Remote IP
└── Streams access log to /logs/access.log
           │
           ▼
[Application Processing Logic]
           │
           ▼
[2. Winston Application Logger]
├── Structured JSON Output
├── Context Metadata: traceId, userId, accountId
├── Log Levels: debug, info, warn, error
└── Streams errors to /logs/error.log & Sentry
```

#### Winston Configuration Snippet:
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ],
});
```

---

### 2. Monitoring & Metrics (Prometheus & Grafana)
* **Prometheus Exporter (`/actuator/prometheus` or `/metrics`)**:
  * `http_requests_total{method, handler, status}`
  * `http_request_duration_seconds{quantile="0.95"}`
  * `jvm_memory_used_bytes{area="heap"}`
  * `marketmaster_active_virtual_positions_count`
  * `marketmaster_orders_executed_total{side, asset_class}`
  * `marketmaster_slippage_ticks_histogram`
* **Grafana Dashboards**:
  1. **System Health**: CPU, RAM, Thread counts, HTTP error rate (5xx).
  2. **Simulator Performance**: Order matching latency, active WebSocket replay connections, queue depths.
  3. **Learning Funnel**: Daily Active Learners, Quiz pass/fail rates, course completion trends.

---

### 3. Error Tracking (Sentry)
* Configured on both Next.js frontend (`@sentry/nextjs`) and Spring Boot backend (`sentry-spring-boot-starter`).
* Automatic exception grouping, breadcrumbs, source maps upload, and release tagging.
* Strict PII scrubbers configured to strip passwords, auth tokens, and email addresses before payload dispatch.

---

### 4. Product Analytics (PostHog)
* Privacy-first, cookie-less session analytics tracking user progression:
  * Event: `concept_started` { level, course_id, concept_id }
  * Event: `quiz_submitted` { concept_id, score, passed }
  * Event: `order_placed` { asset_class, order_type, is_replay }
  * Event: `daily_challenge_completed` { setup_count, net_r_score }

