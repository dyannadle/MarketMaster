# Historical Market Data Specification
## Project: MarketMaster Academy
**Coverage**: Public Open-Source Datasets & Zero-Cost Historical Feeds  
**Version**: 1.0.0  

---

### 1. Zero-Cost Data Ingestion & Storage Architecture
To remain 100% free forever without expensive licensed exchange feeds:
1. **Public Historical Daily/Intraday Bars**: Yahoo Finance (`yfinance`), Stooq, and public exchange archives stored as compressed Parquet files.
2. **Deterministic Geometric Brownian Motion (GBM)**: Generates endless, high-fidelity synthetic market sessions with realistic volatility clustering (GARCH), intraday U-shaped volume curves, and fat-tailed price jumps.
3. **Local Parquet & SQLite Storage**: High compression ratios (100MB of parquet stores 5+ years of 1-minute candle bars across major indices).

---

### 2. Standardized Candle Data Model

```typescript
export interface Candle {
  timestamp: number; // Unix epoch milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

#### CSV / Parquet File Schema:
```csv
timestamp,open,high,low,close,volume
1700000000000,24150.25,24180.00,24145.50,24175.10,35400
1700000060000,24175.10,24195.50,24170.00,24190.00,42100
```

---

### 3. Masked Replay Normalization Engine
In ChartingPark-style **Rated Replay Mode**:
* **Ticker Scrubbing**: Symbol name replaced with random hash (e.g. `ASSET_K7`).
* **Time Scrubbing**: Timestamps on X-axis rendered as relative bar increments (`Bar 0`, `Bar 1`, ..., `Bar 100`) rather than real calendar dates.
* **Price Rescaling (Optional)**: Can normalize price levels to percentage indices ($100.00$ base) to prevent traders recognizing famous stocks by price level alone.

