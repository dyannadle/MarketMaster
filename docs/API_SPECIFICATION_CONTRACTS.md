# REST & WebSocket API Specification
## Project: MarketMaster Academy
**Standard**: OpenAPI 3.1 / JSON:API  
**Base URL**: `https://api.marketmaster.academy/api/v1` (Local: `http://localhost:8080/api/v1`)  
**Version**: 1.0.0  

---

### 1. Authentication & Security Headers
All private endpoints require the standard Bearer Token header:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
X-Request-Id: <UUIDv4>
```

---

### 2. Primary REST Endpoints

#### 2.1 Authentication & Profile
* `POST /auth/register`: Create new user (Email, Password, Display Name, Age Consent).
* `POST /auth/login`: Authenticate and receive Access Token & HttpOnly Refresh Cookie.
* `POST /auth/refresh`: Rotate refresh token and get fresh 15-minute access token.
* `GET /auth/me`: Current user profile, completed lessons count, and skill rating.
* `POST /auth/delete-account`: Initiates immediate hard deletion of all user records (DPDP/GDPR).

#### 2.2 Academy & Courses
* `GET /courses`: List all 6 levels and their enrolled status.
* `GET /courses/{courseId}`: Course modules and concept listing.
* `GET /concepts/{conceptId}`: Complete 10-point concept detail (theory, formula, diagram, quiz).
* `POST /concepts/{conceptId}/submit-quiz`: Submit 4 quiz answers; returns score and unlocks next concept.

#### 2.3 Trading & Orders
* `POST /orders`: Place a simulated order.
  * Request Body:
    ```json
    {
      "symbol": "NIFTY24NOV24500CE",
      "assetClass": "OPTIONS",
      "side": "BUY",
      "orderType": "LIMIT",
      "productType": "MIS",
      "quantity": 50,
      "price": 124.50,
      "stopLossPrice": 105.00,
      "takeProfitPrice": 165.00
    }
    ```
* `DELETE /orders/{orderId}`: Cancel pending simulated order.
* `GET /orders`: List open orders and historical fills with status filtering.
* `GET /positions`: List active positions with real-time unrealized MTM P&L.
* `POST /positions/{positionId}/square-off`: Close out position at prevailing simulated market price.

#### 2.4 Practice Gym & Daily Challenge
* `POST /gym/rated/start`: Initialize a blind replay session (Hidden asset name, 10 trades).
* `POST /gym/daily/submit`: Submit decision for current day's 3 challenge setups.
* `GET /gym/leaderboard`: Fetch global leaderboard for Rated Mode and Daily Challenge.

---

### 3. Real-Time WebSocket Protocol (`/ws/market`)

#### Client Subscription:
```json
{
  "action": "subscribe",
  "topic": "replay.tick",
  "sessionId": "4a7b2190-84c1-4b72-9d3b-6fae217d84a1"
}
```

#### Server Tick Broadcast:
```json
{
  "type": "CANDLE_TICK",
  "barIndex": 142,
  "candle": {
    "timestamp": 1700001000,
    "open": 24200.50,
    "high": 24235.00,
    "low": 24190.25,
    "close": 24220.00,
    "volume": 125400
  },
  "depth": {
    "bids": [[24219.50, 450], [24219.00, 1200]],
    "asks": [[24220.50, 600], [24221.00, 850]]
  }
}
```

