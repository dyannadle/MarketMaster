import { createFileRoute, Link } from "@tanstack/react-router";
import { Newspaper, Radio, ArrowUpRight, TrendingUp, ShieldAlert, Sparkles, Filter, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { LiveNewsFeed } from "@/components/trading/LiveNewsFeed";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Live Financial News Wire — MarketMaster" },
      { name: "description", content: "Real-time Indian market news feed refreshed every 10 minutes with AI sentiment tagging and sector tracking." },
      { property: "og:title", content: "Live Financial News Wire — MarketMaster" },
      { property: "og:description", content: "Stay ahead of RBI announcements, FII/DII flow changes, and breaking macroeconomic headlines." },
    ],
  }),
  component: MarketNewsPage,
});

function MarketNewsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Indian Market Wire"
        sub="Institutional financial telemetry refreshed every 10 minutes with real-time sentiment extraction (Bullish / Bearish / Neutral) and direct symbol correlation."
      >
        <div className="flex items-center gap-2">
          <Link
            to="/trade"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all"
          >
            Open Trade Terminal <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </PageHeader>

      <div className="p-4 md:p-8 space-y-6">
        {/* Quick Highlights Telemetry Banner */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Macro Sentiment</p>
              <p className="text-base font-bold text-emerald-400">Moderately Bullish (62%)</p>
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Radio className="size-5 animate-pulse text-gain" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Wire Cadence</p>
              <p className="text-base font-bold text-foreground">10-Minute Auto Polling</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-4 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-secondary text-foreground">
              <Sparkles className="size-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Covered Segments</p>
              <p className="text-base font-bold text-foreground">NSE, RBI, Macro & F&O</p>
            </div>
          </div>
        </div>

        {/* Live News Feed Engine */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 md:p-6 shadow-sm">
          <LiveNewsFeed />
        </div>
      </div>
    </div>
  );
}
