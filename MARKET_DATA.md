# Market Data Service Guide
## Project: MarketMaster Academy
**Component**: Market Data Pipelines & Feeds  
**Version**: 1.0.0  

See [`HISTORICAL_MARKET_DATA_SPECIFICATION.md`](HISTORICAL_MARKET_DATA_SPECIFICATION.md) for data schemas.

### Primary Data Sources & Formats
* **Historical Repositories**: Pre-bundled CSV and Parquet files in `/assets/marketdata/`.
* **Streaming Protocol**: WebSocket `/ws/market` broadcasting 1-second candles and Level 2 depth ticks during replay sessions.
* **Corporate Action Master**: Lookup table mapping dividend ex-dates, bonus ratios (e.g. 1:1), and stock split factors (e.g. 1:10) to automatically compute backward-adjusted and forward-adjusted historical charts.

