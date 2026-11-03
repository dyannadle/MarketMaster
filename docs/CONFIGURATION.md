# Application Configuration Reference
## Project: MarketMaster Academy
**Environments**: `local`, `staging`, `production`  

### Key Environment Variables Directory
| Key | Default (Local) | Production Example | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | `8080` | `8080` | Server HTTP port |
| `DATABASE_URL` | `jdbc:postgresql://localhost:5432/marketmaster` | `jdbc:postgresql://ep-xyz.neon.tech/neondb` | Relational DB URI |
| `REDIS_URL` | `redis://localhost:6379` | `rediss://default:token@upstash.io:6379` | Distributed Cache URI |
| `JWT_SECRET` | `local-dev-secret-key-32-chars-min!` | `${ENV_JWT_SECRET}` | Secret key for JWT HS256 |
| `CORS_ORIGINS` | `http://localhost:3000` | `https://marketmaster.academy` | Allowed origins |
| `SENTRY_DSN` | `""` (Disabled) | `https://xyz@sentry.io/123` | Error reporting endpoint |

