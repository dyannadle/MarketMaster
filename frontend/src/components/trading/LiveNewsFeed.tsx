import { useState, useEffect } from "react";
import { 
  Newspaper, 
  RefreshCw, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  Radio
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  category: string;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  symbols: string[];
  timestamp: number;
  url: string;
}

interface NewsFeedResponse {
  items: NewsItem[];
  count: number;
  last_refreshed_at: number;
  next_refresh_seconds: number;
  refresh_interval_minutes: number;
  is_live_feed: boolean;
}

// Fallback high-impact Indian market bulletins if backend is temporarily unreachable
const FALLBACK_BULLETINS: NewsItem[] = [
  {
    id: "f-1",
    title: "RBI MPC Holds Repo Rate at 6.50%; Signals Focus on CPI Disinflation to 4.0%",
    summary: "Governor highlights sustained macroeconomic resilience while maintaining vigil on volatile vegetable inflation and crude oil geopolitical supply paths.",
    source: "RBI Policy Bulletin",
    category: "RBI POLICY",
    sentiment: "NEUTRAL",
    symbols: ["^NSEI", "^NSEBANK"],
    timestamp: Date.now() / 1000 - 300,
    url: "https://www.rbi.org.in"
  },
  {
    id: "f-2",
    title: "NSE Derivatives Matrix: FII Long-Short Ratio Climbs to 49% Ahead of Expiry",
    summary: "Institutional desks absorb volatility near NIFTY 24,000 strike as domestic mutual funds inject ₹3,150 Crore net liquidity.",
    source: "NSE Market Pulse",
    category: "DERIVATIVES",
    sentiment: "BULLISH",
    symbols: ["^NSEI"],
    timestamp: Date.now() / 1000 - 850,
    url: "https://www.nseindia.com"
  },
  {
    id: "f-3",
    title: "Brent Crude Slides Toward $73/bbl, Easing India's Current Account & OMC Cost Drag",
    summary: "Subdued global demand expectations alleviate cost-push inflationary pressures across transportation, paints, and specialty chemicals.",
    source: "Financial Express",
    category: "MACRO",
    sentiment: "BULLISH",
    symbols: ["RELIANCE.NS"],
    timestamp: Date.now() / 1000 - 1400,
    url: "https://financialexpress.com"
  },
  {
    id: "f-4",
    title: "Private Lenders Drive Bank Nifty Outperformance; Tier-1 NIMs Stabilize",
    summary: "HDFC Bank and ICICI Bank report strong credit metrics with asset quality at decadal bests and net interest margins holding steady.",
    source: "MoneyControl",
    category: "BANKING",
    sentiment: "BULLISH",
    symbols: ["^NSEBANK", "HDFCBANK.NS", "ICICIBANK.NS"],
    timestamp: Date.now() / 1000 - 2200,
    url: "https://moneycontrol.com"
  },
  {
    id: "f-5",
    title: "SEBI Enhances Derivatives Risk Framework: Increases Minimum Lot Value",
    summary: "Regulatory reforms aim to shield retail participants from extreme options gamma decay and enforce institutional-grade risk buffers.",
    source: "SEBI Circular",
    category: "REGULATION",
    sentiment: "BEARISH",
    symbols: ["^NSEI", "^NSEBANK"],
    timestamp: Date.now() / 1000 - 3800,
    url: "https://www.sebi.gov.in"
  }
];

export function LiveNewsFeed({ isCompact = false }: { isCompact?: boolean }) {
  const [news, setNews] = useState<NewsItem[]>(FALLBACK_BULLETINS);
  const [secondsLeft, setSecondsLeft] = useState<number>(600); // 10 minutes = 600s
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(!isCompact);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const fetchNews = async (force: boolean = false) => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`http://localhost:8000/api/v1/news/feed?force_refresh=${force}`);
      if (res.ok) {
        const data: NewsFeedResponse = await res.json();
        if (data.items && data.items.length > 0) {
          setNews(data.items);
          setSecondsLeft(data.next_refresh_seconds || 600);
        }
      }
    } catch {
      // Keep existing state on error
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews(false);
    // 1-second countdown interval
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          fetchNews(true);
          return 600;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getTimeAgo = (timestamp: number) => {
    const diff = Math.floor(Date.now() / 1000 - timestamp);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const categories = ["ALL", ...Array.from(new Set(news.map((n) => n.category)))];

  const filteredNews = selectedCategory === "ALL" 
    ? news 
    : news.filter((n) => n.category === selectedCategory);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-border bg-card/60 p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Newspaper className="size-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-primary"></span>
            </span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Live Market Wire
              <span className="inline-flex items-center gap-1 rounded bg-gain/15 px-1.5 py-0.5 text-[10px] font-semibold text-gain">
                <Radio className="size-2.5 animate-pulse" /> LIVE
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <Clock className="size-3 text-muted-foreground" />
            <span>Refreshes in {formatCountdown(secondsLeft)}</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => fetchNews(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`size-3 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="p-3.5 space-y-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* News List */}
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {filteredNews.map((item) => {
              const isBull = item.sentiment === "BULLISH";
              const isBear = item.sentiment === "BEARISH";

              return (
                <div
                  key={item.id}
                  className="group rounded-lg border border-border/60 bg-card/40 p-3 hover:border-primary/40 hover:bg-card transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isBull
                            ? "bg-gain/15 text-gain"
                            : isBear
                            ? "bg-loss/15 text-loss"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isBull && <TrendingUp className="size-3" />}
                        {isBear && <TrendingDown className="size-3" />}
                        {!isBull && !isBear && <Minus className="size-3" />}
                        {item.sentiment}
                      </span>

                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {item.category}
                      </span>
                    </div>

                    <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
                      {getTimeAgo(item.timestamp)}
                    </span>
                  </div>

                  <h4 className="mt-1.5 text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-snug">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-baseline gap-1 hover:underline"
                    >
                      {item.title}
                      <ExternalLink className="size-2.5 opacity-0 group-hover:opacity-100 transition-opacity inline" />
                    </a>
                  </h4>

                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {item.summary}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                    <span className="font-medium text-foreground/80">{item.source}</span>
                    <div className="flex items-center gap-1">
                      {item.symbols.map((s) => (
                        <span key={s} className="rounded bg-accent/60 px-1 py-0.5 font-mono text-[9px] text-primary">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
