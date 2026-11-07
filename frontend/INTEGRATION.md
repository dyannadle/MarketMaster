# MarketMaster UI — integration notes

Stack: React 19 + TanStack Start/Router, Tailwind v4, shadcn/ui, recharts, lucide-react, sonner.

## Pages (src/routes)
- index.tsx — Dashboard
- learn.index.tsx, learn.$courseId.tsx — Academy + lesson viewer
- markets.tsx — Market watch
- trade.tsx — Paper trading terminal
- lab.tsx — Strategy lab (backtest + TWAP slicing)
- portfolio.tsx — Holdings, P&L, risk
- challenges.tsx — Badges, leaderboard

## Where to plug in your backend
- src/lib/data.ts — curriculum, instruments, strategies, challenges, leaderboard (static mock). Replace with API calls.
- src/lib/paper.ts
  - useLivePrices(): simulated ticks → replace with your WebSocket/price feed.
  - useAccount(): stores account in localStorage → replace with your account/positions/orders API.
  - applyOrder(): client-side fill logic → replace with your order placement endpoint.
- Design tokens: src/styles.css. Layout/nav: src/components/AppShell.tsx.

Run: bun install && bun run dev

## Auth & account pages (v2)
- sign-in.tsx, sign-up.tsx, forgot-password.tsx — full-screen auth pages
- settings.tsx (profile, security, notifications, trading), notifications.tsx, help.tsx, terms.tsx, privacy.tsx
- admin.tsx — users, content, analytics (shown only when user.role === "admin")
- src/lib/auth.tsx — `authApi` (signIn, signUp, requestPasswordReset, signOut) are DEMO stubs.
  Replace with your backend calls. The demo treats any email starting with "admin" as an admin —
  remove that and take the role from your server. Always enforce admin permissions on your server.
