import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  EyeOff,
  Trophy,
  Medal,
  Award,
  Zap,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { challenges, leaderboard, inr } from "@/lib/data";
import { backendApi } from "@/lib/api";
import { CandlestickChart, Candle } from "@/components/trading/CandlestickChart";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { title: "Blind Practice Gym & Challenges — MarketMaster" },
      { name: "description", content: "Master market setups without hindsight bias on masked historical candle sessions." },
      { property: "og:title", content: "Blind Practice Gym — MarketMaster" },
      { property: "og:description", content: "Candle-by-candle replay engine and trader discipline challenges." },
    ],
  }),
  component: ChallengesAndGym,
});

function ChallengesAndGym() {
  const [activeTab, setActiveTab] = useState<"GYM" | "LEADERBOARD">("GYM");

  // Replay Gym State
  const [sessionCandles, setSessionCandles] = useState<Candle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(30); // Start with 30 context candles
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5 | 10>(1);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // In-Replay Trade Execution State
  const [activePosition, setActivePosition] = useState<{
    side: "LONG" | "SHORT";
    entryPrice: number;
    qty: number;
    entryBar: number;
  } | null>(null);

  const [sessionTrades, setSessionTrades] = useState<{
    id: number;
    side: "LONG" | "SHORT";
    entry: number;
    exit: number;
    pnl: number;
  }[]>([]);

  // Generate or load new replay session
  const loadNewSession = async () => {
    setIsLoadingSession(true);
    setIsPlaying(false);
    setActivePosition(null);
    setSessionTrades([]);

    try {
      const res = await backendApi.getReplaySession("ASSET_X", 375, true);
      if (res && res.candles && res.candles.length > 0) {
        setSessionCandles(res.candles);
        setCurrentIndex(30);
        toast.success("Loaded new masked market replay session (ASSET_X).");
        return;
      }
    } catch {
      // Local fallback generator: 375 bars of realistic geometric Brownian motion with volatility clusters
      const generated: Candle[] = [];
      let price = 24500;
      const now = Date.now();
      for (let i = 0; i < 375; i++) {
        const vol = price * (0.001 + (i > 120 && i < 180 ? 0.0025 : 0.0008));
        const delta = (Math.random() - 0.495) * vol;
        const open = Math.round(price * 100) / 100;
        const close = Math.round((open + delta) * 100) / 100;
        const high = Math.round((Math.max(open, close) + Math.random() * vol * 0.6) * 100) / 100;
        const low = Math.round((Math.min(open, close) - Math.random() * vol * 0.6) * 100) / 100;
        const volume = Math.floor(Math.random() * 2500) + 500;

        generated.push({ time: now + i * 60000, open, high, low, close, volume });
        price = close;
      }
      setSessionCandles(generated);
      setCurrentIndex(30);
      toast.success("Generated local masked session (ASSET_X).");
    } finally {
      setIsLoadingSession(false);
    }
  };

  useEffect(() => {
    loadNewSession();
  }, []);

  // Sliced candles visible to the trader (strictly eliminates hindsight bias)
  const visibleCandles = useMemo(() => {
    return sessionCandles.slice(0, currentIndex);
  }, [sessionCandles, currentIndex]);

  const currentCandle = visibleCandles[visibleCandles.length - 1];
  const currentLtp = currentCandle ? currentCandle.close : 24500;

  // Step one bar forward
  const stepForward = () => {
    if (currentIndex < sessionCandles.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsPlaying(false);
      toast.info("Session complete: All 375 historical candles replayed.");
    }
  };

  // Automated Playback Ticker
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.round(1000 / playbackSpeed);
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= sessionCandles.length - 1) {
          setIsPlaying(false);
          toast.info("Session complete: End of trading day reached.");
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, sessionCandles.length]);

  // Replay Position Execution
  const openReplayPosition = (side: "LONG" | "SHORT") => {
    if (activePosition) {
      toast.error("You already have an active position in this replay. Close it before opening another.");
      return;
    }
    setActivePosition({
      side,
      entryPrice: currentLtp,
      qty: 50, // 1 lot
      entryBar: currentIndex,
    });
    toast.success(`Opened ${side} 50 units @ ₹${currentLtp.toFixed(1)} (Bar #${currentIndex})`);
  };

  const closeReplayPosition = () => {
    if (!activePosition) return;
    const pnl = activePosition.side === "LONG"
      ? (currentLtp - activePosition.entryPrice) * activePosition.qty
      : (activePosition.entryPrice - currentLtp) * activePosition.qty;

    setSessionTrades((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        side: activePosition.side,
        entry: activePosition.entryPrice,
        exit: currentLtp,
        pnl,
      },
    ]);
    setActivePosition(null);
    toast.success(`Closed position: ${pnl >= 0 ? "+" : ""}${inr(pnl)}`);
  };

  // Unrealized P&L
  const unrealizedPnl = activePosition
    ? (activePosition.side === "LONG"
        ? (currentLtp - activePosition.entryPrice) * activePosition.qty
        : (activePosition.entryPrice - currentLtp) * activePosition.qty)
    : 0;

  const totalRealizedPnl = sessionTrades.reduce((sum, t) => sum + t.pnl, 0);
  const winningTrades = sessionTrades.filter((t) => t.pnl > 0).length;
  const winRate = sessionTrades.length > 0 ? (winningTrades / sessionTrades.length) * 100 : 0;

  // Format relative bar time: T+00:30 (Minutes into session)
  const formatBarTime = (index: number) => {
    const hours = Math.floor(index / 60);
    const mins = index % 60;
    return `T+${hours < 10 ? "0" : ""}${hours}:${mins < 10 ? "0" : ""}${mins}`;
  };

  return (
    <div>
      <PageHeader
        title="Blind Practice Gym & Challenges"
        sub="Practice candle-by-candle on masked historical market sessions to build true probabilistic edge without hindsight bias."
      />

      <div className="space-y-6 p-4 md:p-8">
        {/* Navigation Tabs */}
        <div className="flex rounded-xl border border-border/80 bg-card p-1.5 shadow-sm max-w-md">
          <button
            onClick={() => setActiveTab("GYM")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === "GYM" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <EyeOff className="h-4 w-4" /> Blind Practice Gym (ASSET_X)
          </button>
          <button
            onClick={() => setActiveTab("LEADERBOARD")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === "LEADERBOARD" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="h-4 w-4" /> Challenges & Leaderboard
          </button>
        </div>

        {activeTab === "GYM" ? (
          <div className="space-y-6">
            {/* Top Control Bar: Masked Asset Info, Playback Controls, Speed Multipliers */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-purple-500/10 text-purple-400">
                  <EyeOff className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black tracking-tight">ASSET_X</h2>
                    <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-400 uppercase">
                      Masked Session
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bar {currentIndex} of {sessionCandles.length} ({formatBarTime(currentIndex)})
                  </p>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="gap-1.5 font-bold text-xs"
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={stepForward}
                  disabled={isPlaying || currentIndex >= sessionCandles.length}
                  className="gap-1.5 font-bold text-xs"
                >
                  <SkipForward className="h-3.5 w-3.5" /> Next Bar
                </Button>

                {/* Speed Multiplier */}
                <div className="flex rounded-lg bg-secondary/40 p-1 text-xs font-semibold">
                  {([1, 2, 5, 10] as const).map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaybackSpeed(spd)}
                      className={`rounded px-2 py-1 transition-all ${
                        playbackSpeed === spd
                          ? "bg-primary text-primary-foreground shadow"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadNewSession}
                  disabled={isLoadingSession}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className={`h-3.5 w-3.5 ${isLoadingSession ? "animate-spin" : ""}`} /> New Session
                </Button>
              </div>
            </div>

            {/* Main Replay Stage: Candlestick Replay & Order Execution Dock */}
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              {/* Candlestick Canvas */}
              <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-primary" /> Masked Candlestick Playback (No Future Leak)
                  </span>
                  <span className="num font-mono text-lg font-black text-foreground">
                    ₹{currentLtp.toFixed(1)}
                  </span>
                </div>

                <CandlestickChart
                  symbol="ASSET_X"
                  currentPrice={currentLtp}
                  basePrice={sessionCandles[0]?.open || 24500}
                />
              </div>

              {/* In-Gym Order Execution Ticket */}
              <div className="space-y-4">
                <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    In-Replay Execution Ticket
                  </p>

                  {/* Active Position Telemetry */}
                  {activePosition ? (
                    <div className="rounded-xl border border-border/60 bg-secondary/20 p-4 space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-muted-foreground">Open Position:</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          activePosition.side === "LONG" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                        }`}>
                          {activePosition.side} ({activePosition.qty} qty)
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Entry Price:</span>
                        <span className="num font-mono text-foreground font-semibold">₹{activePosition.entryPrice.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Unrealized P&L:</span>
                        <span className={`num font-mono font-bold ${unrealizedPnl >= 0 ? "text-gain" : "text-loss"}`}>
                          {unrealizedPnl >= 0 ? "+" : ""}{inr(unrealizedPnl)}
                        </span>
                      </div>

                      <Button
                        onClick={closeReplayPosition}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                      >
                        Close Position @ ₹{currentLtp.toFixed(1)}
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => openReplayPosition("LONG")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-5"
                      >
                        BUY / LONG
                      </Button>
                      <Button
                        onClick={() => openReplayPosition("SHORT")}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-5"
                      >
                        SELL / SHORT
                      </Button>
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Test your setups on masked price action. Once closed, your trade is logged in the session scorecard below to measure your statistical edge.
                  </p>
                </div>

                {/* Session Scorecard */}
                <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Replay Session Scorecard
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-secondary/30 p-2.5">
                      <span className="text-[10px] text-muted-foreground block">Session Realized P&L</span>
                      <span className={`num text-base font-bold ${totalRealizedPnl >= 0 ? "text-gain" : "text-loss"}`}>
                        {totalRealizedPnl >= 0 ? "+" : ""}{inr(totalRealizedPnl)}
                      </span>
                    </div>

                    <div className="rounded-lg bg-secondary/30 p-2.5">
                      <span className="text-[10px] text-muted-foreground block">Win Rate</span>
                      <span className="num text-base font-bold text-foreground">
                        {winRate.toFixed(0)}% ({sessionTrades.length} trades)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Challenges and Monthly Leaderboard Tab */
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="grid gap-3 sm:grid-cols-2">
              {challenges.map((c) => (
                <div key={c.title} className="rounded-xl border border-border/80 bg-card p-5 shadow-sm">
                  <p className="font-semibold text-foreground">{c.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                  <div className="mt-4 h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${c.progress}%` }} />
                  </div>
                  <p className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-primary">{c.reward}</span>
                    <span className="num font-bold">{c.progress}%</span>
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm">
              <p className="font-semibold text-foreground text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" /> Monthly Discipline Leaderboard
              </p>
              <ol className="mt-4 space-y-3">
                {leaderboard.map((l, i) => (
                  <li key={l.name} className="flex items-center gap-3 text-sm">
                    <span
                      className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
                        i === 0
                          ? "bg-amber-400 text-black shadow-md"
                          : i === 1
                          ? "bg-slate-300 text-black"
                          : i === 2
                          ? "bg-amber-700 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i === 0 ? <Medal className="size-4" /> : i + 1}
                    </span>
                    <span className="flex-1 font-medium text-foreground">
                      {l.name}
                      <span className="block text-[10px] text-muted-foreground">{l.trades} paper trades</span>
                    </span>
                    <span className="num text-gain font-bold text-xs">+{l.ret}%</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
