# Deployment Guide & Free-Tier Strategy
## Project: MarketMaster Academy
**Budget Requirement**: Strict ₹0 Cloud Spend  
**Version**: 1.0.0  

---

### 1. Free-Tier Cloud Deployment Topology

| Component | Free Platform | Tier Limitations | Zero-Cost Solution |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | Vercel / Cloudflare Pages | Unlimited bandwidth, 100 builds/day | Deploy static Next.js export with edge serverless functions |
| **Backend API** | Render / Fly.io Free Tier | Spins down after 15 min inactivity | Ping health check cron or use local/hybrid execution |
| **Database** | Neon.tech / Supabase Free | 0.5 GB storage, serverless compute | Ample capacity for 50,000+ accounts with data pruning |
| **Redis Cache** | Upstash Serverless Redis | 10,000 commands/day | Fall back to in-memory cache if limit approached |
| **Android APK** | GitHub Releases | Free unlimited hosting | Direct APK download via QR code on web app |
| **Domain** | Free Vercel/Cloudflare Subdomain | None | `marketmaster.vercel.app` (Zero domain purchase cost) |

