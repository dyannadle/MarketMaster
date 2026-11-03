# SEO, Open Graph & Digital Discovery Specification
## Project: MarketMaster Academy
**Standards**: Next.js 15 Metadata API, Schema.org JSON-LD, Core Web Vitals  
**Version**: 1.0.0  

---

### 1. Global Metadata & Open Graph Specification
All public pages must export standard Open Graph and Twitter Card metadata to ensure rich preview cards when links are shared on WhatsApp, Telegram, X (Twitter), LinkedIn, and Discord.

```typescript
// app/layout.tsx metadata configuration
export const metadata: Metadata = {
  metadataBase: new URL('https://marketmaster.academy'),
  title: {
    default: 'MarketMaster Academy — Learn Trading & Investing with Real Market Simulation',
    template: '%s | MarketMaster Academy'
  },
  description: 'Master global financial markets, Indian equities, F&O derivatives, and algorithmic trading with risk-free paper trading and historical candle replay.',
  keywords: ['trading simulator', 'paper trading India', 'learn stock market', 'options trading practice', 'SEBI investor education', 'algorithmic trading', 'NSE replay terminal'],
  authors: [{ name: 'MarketMaster Academy Engineering Team' }],
  creator: 'MarketMaster Academy',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://marketmaster.academy',
    siteName: 'MarketMaster Academy',
    title: 'MarketMaster Academy — Learn Trading & Investing Without Risking Real Money',
    description: 'Interactive financial education university combined with institutional paper trading terminal and historical chart replay engine.',
    images: [
      {
        url: '/images/og-social-preview.png',
        width: 1200,
        height: 630,
        alt: 'MarketMaster Academy Terminal & Replay Engine Preview',
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MarketMaster Academy — Free Trading Simulator & Academy',
    description: 'Learn trading, derivatives, and algorithmic execution with realistic historical simulation and ₹0 risk.',
    images: ['/images/og-social-preview.png'],
    creator: '@MarketMasterApp'
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};
```

---

### 2. Route-by-Route Title & Meta Description Matrix

| Route | Page Title | Meta Description |
| :--- | :--- | :--- |
| `/` | `MarketMaster Academy — Master Trading & Investing` | Free educational financial university with realistic paper trading and historical candle replay. |
| `/academy` | `Academy Curriculum (Levels 0–5) | MarketMaster` | Master money, macroeconomics, equity valuation, options Greeks, and algo trading step-by-step. |
| `/terminal` | `Paper Trading Terminal | MarketMaster Academy` | High-fidelity multi-asset paper trading with Level 2 order book depth, bracket orders, and realistic slippage. |
| `/gym/rated` | `Rated Practice Gym | MarketMaster Academy` | Test your trading skills on blind historical charts with hidden tickers, mandatory stop-loss, and skill ELO rating. |
| `/gym/daily` | `Daily Setup Challenge | MarketMaster Academy` | Solve 3 curated daily market setups, manage risk-to-reward ratios, and climb the global daily leaderboard. |
| `/strategy-lab` | `Quantitative Strategy Lab & Algo Slicers` | Backtest trading strategies and simulate institutional TWAP, VWAP, POV, and Iceberg execution algorithms. |
| `/faq` | `Frequently Asked Questions | MarketMaster Academy` | Answers to questions regarding virtual capital, simulator accuracy, Android app download, and curriculum. |
| `/404` | `404: Page Not Found | MarketMaster Academy` | The requested financial concept or terminal route could not be found. Return to trading dashboard. |

---

### 3. XML Sitemap & Robots.txt (`public/robots.txt` & `app/sitemap.ts`)

#### `public/robots.txt`:
```txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /settings/
Disallow: /auth/reset-password

Sitemap: https://marketmaster.academy/sitemap.xml
```

#### `app/sitemap.ts`:
* Dynamically traverses all courses, modules, and concept IDs to automatically generate `sitemap.xml` with `<lastmod>` timestamps and `<changefreq>weekly`.

---

### 4. Search Console & Webmaster Tools Verification
* **Google Search Console**: HTML tag verification or DNS TXT record configured in `app/layout.tsx`.
* **Bing Webmaster Tools**: Bing site verification meta tag added to head.
* **Google Business Profile**: Educational entity profile registered with official website, direct APK link, and zero-cost disclosure.
* **Review Sites**: Profiles listed on ProductHunt, AlternativeTo, GitHub Topics (`paper-trading`, `algorithmic-trading`, `financial-education`).

---

### 5. Conversion, Anti-Spam & Page Performance Specs
* **Single Clear CTA**: Primary hero banner displays one prominent call-to-action button: `"Start Learning Free"` (No registration required for guest replay demo).
* **Thank You Page (`/thank-you`)**: Displayed after account signup or certificate completion with clear next steps and direct Android APK download QR code.
* **Form Spam Protection**: Cloudflare Turnstile (Free Tier) or lightweight honeypot field (`<input type="text" name="b_field" style="display:none" tabindex="-1">`) preventing automated spam bots on contact and signup forms.
* **Performance & Preconnect**:
  * `<link rel="preconnect" href="https://fonts.googleapis.com">`
  * Zero bloated render-blocking scripts. Target PageSpeed Insights score: **95+ on Mobile, 99+ on Desktop**.

