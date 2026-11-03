# Configuration Management & Secret Hygiene
## Project: MarketMaster Academy
**Standards**: 12-Factor App / Zero Hardcoded Secrets  
**Version**: 1.0.0  

---

### 1. Secret Management Protocols
* **Zero Secrets in Git**: `.env`, `.env.local`, and private key files are strictly added to `.gitignore`.
* **CI/CD Ingestion**: GitHub Secrets injected dynamically into GitHub Actions pipelines during build.
* **Production Runtime**: Environment variables provided via cloud platform dashboard (Vercel / Render / Cloudflare).

---

### 2. Feature Flags & Config Toggles
* `ENABLE_FUTURES_SIMULATION`: Toggle to enable Level 3 futures trading.
* `ENABLE_OPTIONS_CHAIN`: Toggle to activate live multi-strike option chain viewer.
* `ENABLE_ALGO_SANDBOX`: Toggle client-side Pyodide python execution environment.

