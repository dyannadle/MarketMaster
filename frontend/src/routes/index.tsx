import { createFileRoute, Link } from "@tanstack/react-router";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import {
  ArrowRight,
  BookOpen,
  CandlestickChart,
  FlaskConical,
  ShieldCheck,
  Newspaper,
  Trophy,
  Shield,
  Radio,
  FileSpreadsheet,
  Zap,
  Sparkles,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Change } from "@/components/AppShell";
import { curriculum, instruments, inr, seededSeries } from "@/lib/data";
import { useAccount, useLivePrices, STARTING_CASH } from "@/lib/paper";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarketMaster Academy — Learn, Practise, Master the Markets" },
      { name: "description", content: "From financial literacy to F&O, currency, commodities and algo trading — with a realistic paper trading terminal." },
      { property: "og:title", content: "MarketMaster Academy" },
      { property: "og:description", content: "Learn every market concept and practise with virtual funds." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const prices = useLivePrices();
  const { acc } = useAccount();
  const { user } = useAuth();
  const holdings = acc.positions.reduce((s, p) => s + (p.qty || 0) * (prices[p.symbol]?.p ?? p.avg ?? 0), 0);
  const equity = Number(acc.cash || 0) + holdings;
  const curve = seededSeries(7, 60, STARTING_CASH, 0.006);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden border-b bg-hero px-5 py-12 md:px-8 md:py-16">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative max-w-3xl">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Radio className="size-3 text-gain animate-pulse" /> Live Yahoo Finance & 10-Min News Wire
            </span>
            <span className="inline-flex rounded-full border px-3 py-1 text-xs text-muted-foreground">
              Equity · F&O · Currency · Commodity · Algo
            </span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Learn. Practise. <span className="text-primary">Master the markets.</span>
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground leading-relaxed">
            Institutional trading ecosystem: test historical crises bar-by-bar in the Blind Gym, execute options spreads with live Yahoo Finance quotes, backtest Polars algorithms, and export SEBI-compliant statements.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="font-bold shadow-md">
              <Link to="/trade">Open Trade Terminal <ArrowRight className="ml-1 size-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="font-bold">
              <Link to="/challenges">Practice Gym (Covid & Election Day)</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="font-bold">
              <Link to="/news">Live News Wire</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* NEWLY IMPLEMENTED FEATURES SPOTLIGHT BANNER */}
      <section className="px-5 md:px-8">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/20 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-amber-400" />
              <h2 className="text-base font-bold text-foreground">Newly Implemented Institutional Features</h2>
            </div>
            <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
              All Features Active
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <Link
              to="/news"
              className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-3.5 hover:border-primary transition-all hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Newspaper className="size-4 text-primary" /> Live News Wire
                  </span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">10m Auto</span>
                </div>
                <p className="mt-1.5 text-muted-foreground text-[11px] leading-relaxed">
                  Real-time Indian market bulletins with automated sentiment classification (Bullish / Bearish / Neutral).
                </p>
              </div>
              <span className="mt-3 font-semibold text-primary inline-flex items-center gap-1">
                Explore News Wire →
              </span>
            </Link>

            <Link
              to="/challenges"
              className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-3.5 hover:border-primary transition-all hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Trophy className="size-4 text-amber-400" /> Historical Gym
                  </span>
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-bold text-amber-400">Scenarios</span>
                </div>
                <p className="mt-1.5 text-muted-foreground text-[11px] leading-relaxed">
                  Replay March 2020 Covid Crash, June 2024 Election Day, and RBI Rate Hikes bar-by-bar with zero hindsight.
                </p>
              </div>
              <span className="mt-3 font-semibold text-primary inline-flex items-center gap-1">
                Enter Practice Gym →
              </span>
            </Link>

            <Link
              to="/lab"
              className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-3.5 hover:border-primary transition-all hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <FlaskConical className="size-4 text-sky-400" /> Strategy Lab
                  </span>
                  <span className="rounded bg-sky-500/20 px-1.5 py-0.2 text-[9px] font-bold text-sky-400">Polars Quant</span>
                </div>
                <p className="mt-1.5 text-muted-foreground text-[11px] leading-relaxed">
                  Vectorized Python & Visual No-Code strategy builder with TWAP order execution slicing simulator.
                </p>
              </div>
              <span className="mt-3 font-semibold text-primary inline-flex items-center gap-1">
                Open Strategy Lab →
              </span>
            </Link>

            <Link
              to="/admin"
              className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-3.5 hover:border-primary transition-all hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <Shield className="size-4 text-rose-400" /> Admin Console
                  </span>
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.2 text-[9px] font-bold text-rose-400">RMS & Controls</span>
                </div>
                <p className="mt-1.5 text-muted-foreground text-[11px] leading-relaxed">
                  Super Admin controls: platform circuit breaker kill-switch, user ledger resets, and Yahoo feed cache.
                </p>
              </div>
              <span className="mt-3 font-semibold text-primary inline-flex items-center gap-1">
                Access Admin Panel →
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 px-5 md:grid-cols-3 md:px-8">
        <div className="rounded-2xl border bg-card p-5 md:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Virtual account equity</p>
              <p className="num mt-1 text-3xl font-bold">{inr(equity)}</p>
              <p className="mt-1 text-sm font-semibold">
                <Change v={STARTING_CASH > 0 ? ((equity - STARTING_CASH) / STARTING_CASH) * 100 : 0} />{" "}
                <span className="text-muted-foreground font-normal">all time</span>
              </p>
            </div>
            <p className="num text-right text-sm text-muted-foreground">Cash<br /><span className="text-foreground font-bold">{inr(acc.cash || 0)}</span></p>
          </div>
          <div className="mt-4 h-40">
            <ResponsiveContainer>
              <AreaChart data={curve}>
                <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--primary)" stopOpacity={0.4} /><stop offset="1" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs>
                <Area dataKey="v" stroke="var(--primary)" fill="url(#g)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold">Market Pulse (Yahoo Finance)</p>
            <Link to="/trade" className="text-xs text-primary hover:underline font-semibold">Full Board →</Link>
          </div>
          <ul className="space-y-2.5">
            {instruments.slice(0, 7).map((i) => {
              const q = prices[i.symbol] || { p: i.price, base: i.price };
              return (
                <li key={i.symbol} className="flex items-center justify-between text-sm">
                  <span>{i.symbol}<span className="ml-2 text-xs text-muted-foreground">{i.exchange}</span></span>
                  <span className="text-right">
                    <span className="num font-mono">{Number(q.p || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 })}</span>{" "}
                    <Change v={q.base ? ((q.p - q.base) / q.base) * 100 : 0} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 px-5 pb-10 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
        {[
          { icon: BookOpen, t: "Learn", d: `${curriculum.length} levels, ${curriculum.reduce((s, l) => s + l.courses.length, 0)} courses`, to: "/learn" },
          { icon: CandlestickChart, t: "Paper Trade Terminal", d: "Live Depth, Options Matrix & Haptics", to: "/trade" },
          { icon: FlaskConical, t: "Strategy Lab", d: "Backtest & TWAP slicing algos", to: "/lab" },
          { icon: ShieldCheck, t: "Risk & Portfolio", d: "SEBI Statement Exporter (PDF/CSV)", to: "/portfolio" },
        ].map((f) => (
          <Link key={f.t} to={f.to} className="group rounded-2xl border bg-card p-5 transition hover:shadow-glow">
            <f.icon className="size-6 text-primary" />
            <p className="mt-4 font-semibold text-foreground">{f.t}</p>
            <p className="text-sm text-muted-foreground">{f.d}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
