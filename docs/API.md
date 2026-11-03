# Developer API Reference Guide
## Project: MarketMaster Academy
**Protocol**: REST / JSON over HTTP/2 & WebSocket  
**Version**: 1.0.0  

See full formal OpenAPI contract in [`API_SPECIFICATION_CONTRACTS.md`](API_SPECIFICATION_CONTRACTS.md).

### Quick Endpoint Directory
| Domain | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/register` | Register new learner account |
| **Auth** | `POST` | `/api/v1/auth/login` | Email/password login, returns JWT |
| **Auth** | `GET` | `/api/v1/auth/me` | Fetch active user credentials & progress |
| **Academy**| `GET` | `/api/v1/courses` | Full syllabus tree (Levels 0 - 5) |
| **Academy**| `GET` | `/api/v1/concepts/{id}` | Read granular lesson & exercises |
| **Academy**| `POST`| `/api/v1/concepts/{id}/quiz` | Submit quiz response for grading |
| **Trading**| `POST` | `/api/v1/orders` | Submit Market/Limit/SL order |
| **Trading**| `GET` | `/api/v1/orders` | Query open and completed orders |
| **Trading**| `GET` | `/api/v1/positions` | Query real-time open positions & MTM |
| **Trading**| `POST` | `/api/v1/positions/{id}/close` | Square off position at market |
| **Ledger** | `GET` | `/api/v1/account/ledger` | Double-entry cash balance audit trail |
| **Gym** | `POST` | `/api/v1/gym/rated/start` | Start blind replay session |
| **Gym** | `POST` | `/api/v1/gym/daily/solve` | Submit trade for Daily Challenge |
| **WS Stream**| `WS` | `/ws/market` | Candlestick ticks, depth & P&L updates |

