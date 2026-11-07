import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
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
  Calendar,
  AlertCircle,
  HelpCircle,
  Flame,
  Activity,
  Layers
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
      { title: "Institutional Practice Scenarios & Blind Gym — MarketMaster" },
      { name: "description", content: "Master real market crises (Covid Crash 2020, Election Day 2024, RBI Rate Hikes) bar-by-bar." },
      { property: "og:title", content: "Institutional Practice Scenarios — MarketMaster" },
      { property: "og:description", content: "Replay real historical market events without hindsight bias." },
    ],
  }),
  component: ChallengesAndGym,
});

interface Preset {
  id: string;
  name: string;
  date_str: string;
  instrument: string;
  base_price: number;
  regime: string;
  macro_driver: string;
  trading_lesson: string;
}

const LOCAL_PRESETS: Preset[] = [
  {
    id: "BLIND_RANDOM",
    name: "Blind Masked Mode (ASSET_X)",
    date_str: "Normalized Timeline (T+00:01)",
    instrument: "ASSET_X",
    base_price: 1000.0,
    regime: "Zero-Hindsight Blind Practice",
    macro_driver: "All ticker identities and calendar dates are anonymized. Focus solely on price action, volume clusters, and Rule 4.3 risk parameters.",
    trading_lesson: "Trade the order flow in front of you. Never project hindsight expectations onto the chart."
  },
  {
    id: "COVID_CRASH_2020",
    name: "March 2020 Covid Crash & Circuit Breaker",
    date_str: "23 March 2020",
    instrument: "NIFTY_FUT",
    base_price: 9800.0,
    regime: "Extreme Panic & Volatility Spike (India VIX > 80)",
    macro_driver: "Nationwide lockdown announced; global liquidity squeeze triggers 10% lower circuit breaker on open, followed by institutional capitulation and sharp short-squeeze intraday.",
    trading_lesson: "Trading during high-IV circuit breaker regimes requires strictly reduced position size (0.5% risk) and avoiding knife-catching until multi-timeframe rejection confirms."
  },
  {
    id: "ELECTION_DAY_2024",
    name: "June 2024 Lok Sabha Counting Day Shock",
    date_str: "04 June 2024",
    instrument: "NIFTY_FUT",
    base_price: 23250.0,
    regime: "Event-Risk High-IV Spike & Sharp V-Shape Reversal",
    macro_driver: "Exit polls projected 400+ seats, but early counting trends showed coalition uncertainty. Nifty crashed 1,300 pts (-6%) in the morning before massive institutional value buying sparked a 600 pt recovery.",
    trading_lesson: "Event-day implied volatility crush: buying expensive OTM options at open results in 90% theta/IV wipeout even if market rebounds."
  },
  {
    id: "RBI_RATE_HIKE_2022",
    name: "RBI Surprise 40 bps Off-Cycle Repo Rate Hike",
    date_str: "04 May 2022",
    instrument: "BANKNIFTY_FUT",
    base_price: 36150.0,
    regime: "Flash Macro Disruption & Liquidity Shock",
    macro_driver: "Governor Shaktikanta Das convened an unscheduled press conference at 14:00 IST to announce an emergency 40 bps repo rate hike to 4.40% to combat 7.8% CPI inflation, sending Bank Nifty into a 650-point tailspin.",
    trading_lesson: "Macro press conferences demand flat risk posture or defensive delta-neutral spreads; stops get jumped by 40-50 points due to order book evacuation."
  },
  {
    id: "ADANI_SHOCK_2023",
    name: "Adani Hindenburg Shockwave & Margin Unwind",
    date_str: "27 Jan 2023",
    instrument: "NIFTY_FUT",
    base_price: 18100.0,
    regime: "Idiosyncratic Contagion & Liquidity Evacuation",
    macro_driver: "Short seller report sparks massive institutional block liquidations, margin calls across leveraged domestic accounts, and severe bid-ask widening in conglomerate counters.",
    trading_lesson: "Respect momentum support breaks; when structural accounting or balance sheet fears emerge, mean-reversion systems fail repeatedly."
  },
  {
    id: "BUDGET_RALLY_2021",
    name: "Union Budget 2021 Capex Euphoria Rally",
    date_str: "01 Feb 2021",
    instrument: "NIFTY_FUT",
    base_price: 13650.0,
    regime: "One-Way Trend Day & Institutional Capex Squeeze",
    macro_driver: "No new taxes and a 34.5% surge in capital expenditure targets triggered an unprecedented 650-point one-way trending intraday expansion, completely wiping out short gamma straddle sellers.",
    trading_lesson: "Never counter-trend fade an institutional trend day; pyramid winning positions and trail stops below 15-minute swing lows."
  }
];

function ChallengesAndGym() {
  const [activeTab, setActiveTab] = useState<"GYM" | "LEADERBOARD">("GYM");

  // Selected Historical Preset
  const [selectedPresetId, setSelectedPresetId] = useState<string>("COVID_CRASH_2020");
  const [isMaskedBlind, setIsMaskedBlind] = useState<boolean>(false);

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

  const activePreset = LOCAL_PRESETS.find((p) => p.id === selectedPresetId) || LOCAL_PRESETS[1]!;

  // Load replay session from backend
  const loadNewSession = async (presetId: string = selectedPresetId, blind: boolean = isMaskedBlind) => {
    setIsLoadingSession(true);
    setIsPlaying(false);
    setActivePosition(null);
    setSessionTrades([]);

    try {
      const isRandomBlind = presetId === "BLIND_RANDOM" || blind;
      const effectivePreset = presetId === "BLIND_RANDOM" ? undefined : presetId;
      const res = await backendApi.getReplaySession("NIFTY_FUT", 375, isRandomBlind, effectivePreset);
      if (res && res.candles && res.candles.length > 0) {
        setSessionCandles(res.candles);
        setCurrentIndex(30);
        toast.success(`Loaded session: ${res.preset_name || "Historical Practice Session"}`);
        return;
      }
    } catch {
      // Local fallback generator matching preset volatility profile
      const generated: Candle[] = [];
      let price = isMaskedBlind || presetId === "BLIND_RANDOM" ? 1000.0 : activePreset.base_price;
      const now = Date.now();
      for (let i = 0; i < 375; i++) {
        let shock = (Math.random() - 0.495) * (price * 0.0015);
        if (presetId === "COVID_CRASH_2020" && i < 60) shock -= price * 0.001;
        if (presetId === "ELECTION_DAY_2024") {
          if (i < 150) shock -= price * 0.0008;
          else if (i > 180) shock += price * 0.0007;
        }
        if (presetId === "RBI_RATE_HIKE_2022" && i > 280 && i < 310) shock -= price * 0.003;
        if (presetId === "BUDGET_RALLY_2021") shock += price * 0.0004;

        const open = Math.round(price * 100) / 100;
        const close = Math.round((open + shock) * 100) / 100;
        const high = Math.round((Math.max(open, close) + Math.random() * (price * 0.0008)) * 100) / 100;
        const low = Math.round((Math.min(open, close) - Math.random() * (price * 0.0008)) * 100) / 100;
        const volume = Math.floor(Math.random() * 2500) + 500;

        generated.push({ time: now + i * 60000, open, high, low, close, volume });
        price = close;
      }
      setSessionCandles(generated);
      setCurrentIndex(30);
      toast.success("Loaded local historical scenario.");
    } finally {
      setIsLoadingSession(false);
    }
  };

  useEffect(() => {
    loadNewSession(selectedPresetId, isMaskedBlind);
  }, [selectedPresetId, isMaskedBlind]);

  // Sliced candles visible to the trader
  const visibleCandles = useMemo(() => {
    return sessionCandles.slice(0, currentIndex);
  }, [sessionCandles, currentIndex]);

  const currentCandle = visibleCandles[visibleCandles.length - 1];
  const currentLtp = currentCandle ? currentCandle.close : activePreset.base_price;

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
      toast.error("You already have an active position. Close it before opening another.");
      return;
    }
    setActivePosition({
      side,
      entryPrice: currentLtp,
      qty: 50,
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

  const formatBarTime = (index: number) => {
    const hours = Math.floor(index / 60);
    const mins = index % 60;
    return `T+${hours < 10 ? "0" : ""}${hours}:${mins < 10 ? "0" : ""}${mins}`;
  };

  return (
    <div>
      <PageHeader
        title="Institutional Practice Scenarios & Blind Gym"
        sub="Experience and master real Indian market crises bar-by-bar. Test your stop-loss discipline and volatility execution under historical battle conditions."
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
            <Activity className="h-4 w-4" /> Historical Scenarios & Gym
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
            {/* Scenario Selector & Blind Toggle Bar */}
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="size-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Market Event Preset:</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMaskedBlind(!isMaskedBlind)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold border transition-all ${
                      isMaskedBlind 
                        ? "bg-purple-500/15 border-purple-500/40 text-purple-400" 
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <EyeOff className="size-3.5" />
                    {isMaskedBlind ? "Masked Blind Active (ASSET_X)" : "Mask Asset & Dates"}
                  </button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => loadNewSession(selectedPresetId, isMaskedBlind)}
                    disabled={isLoadingSession}
                  >
                    <RotateCcw className={`size-3.5 ${isLoadingSession ? "animate-spin" : ""}`} />
                    Reset Tape
                  </Button>
                </div>
              </div>

              {/* Preset Cards Selector Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {LOCAL_PRESETS.map((p) => {
                  const isSelected = selectedPresetId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPresetId(p.id)}
                      className={`rounded-lg border p-2.5 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/70 hover:border-border hover:bg-accent/40"
                      }`}
                    >
                      <span className="text-[10px] font-bold text-primary uppercase block truncate">{p.id.replace(/_/g, " ")}</span>
                      <h4 className="mt-1 text-xs font-bold text-foreground line-clamp-1">{p.name}</h4>
                      <p className="mt-1 text-[10px] text-muted-foreground font-mono">{p.date_str}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scenario Briefing Card */}
            {!isMaskedBlind && selectedPresetId !== "BLIND_RANDOM" && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">
                      {activePreset.name} — <span className="font-mono text-primary">{activePreset.date_str}</span>
                    </h3>
                  </div>
                  <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                    {activePreset.regime}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Macro Catalyst:</strong> {activePreset.macro_driver}
                </p>

                <p className="text-xs text-gain leading-relaxed font-medium">
                  <strong>Institutional Edge & Trading Lesson:</strong> {activePreset.trading_lesson}
                </p>
              </div>
            )}

            {/* Replay Controls & Telemetry */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-purple-500/10 text-purple-400">
                  <EyeOff className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black tracking-tight">
                      {isMaskedBlind || selectedPresetId === "BLIND_RANDOM" ? "ASSET_X" : activePreset.instrument}
                    </h2>
                    <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-400 uppercase">
                      {isMaskedBlind ? "Masked" : activePreset.date_str}
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
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isPlaying ? "Pause" : "Play Tape"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={stepForward}
                  disabled={isPlaying || currentIndex >= sessionCandles.length}
                  className="gap-1 font-bold text-xs"
                >
                  <SkipForward className="h-4 w-4" /> Next Bar (1m)
                </Button>

                <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                  {([1, 2, 5, 10] as const).map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setPlaybackSpeed(speed)}
                      className={`rounded px-2 py-1 text-[11px] font-bold transition-all ${
                        playbackSpeed === speed
                          ? "bg-primary text-primary-foreground shadow"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Candlestick Engine Container */}
            <div className="overflow-hidden rounded-xl border border-border/80 bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Replay Timeframe:</span>
                  <span className="rounded bg-accent px-2 py-0.5 text-xs font-mono font-bold text-primary">1m Execution</span>
                  <span className="text-xs text-muted-foreground">|</span>
                  <span className="text-xs text-muted-foreground">
                    LTP: <strong className="font-mono text-foreground">₹{currentLtp.toFixed(2)}</strong>
                  </span>
                </div>

                <div className="text-xs text-muted-foreground font-mono">
                  {Math.round((currentIndex / Math.max(sessionCandles.length, 1)) * 100)}% Replayed
                </div>
              </div>

              <CandlestickChart
                candles={visibleCandles}
                symbol={isMaskedBlind || selectedPresetId === "BLIND_RANDOM" ? "ASSET_X" : activePreset.instrument}
                timeframe="1m"
              />
            </div>

            {/* In-Replay Order Ticket & Live Telemetry */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* Trading Controls */}
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Replay Execution Ticket</h3>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Current Candle Close:</span>
                  <span className="font-mono font-bold text-foreground">₹{currentLtp.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Contract Lot Size:</span>
                  <span className="font-mono font-bold text-foreground">50 units</span>
                </div>

                {!activePosition ? (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                      onClick={() => openReplayPosition("LONG")}
                      className="bg-gain hover:bg-gain/90 text-gain-foreground font-bold text-xs"
                    >
                      BUY LONG (50)
                    </Button>
                    <Button
                      onClick={() => openReplayPosition("SHORT")}
                      className="bg-loss hover:bg-loss/90 text-loss-foreground font-bold text-xs"
                    >
                      SELL SHORT (50)
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-primary">{activePosition.side} @ ₹{activePosition.entryPrice.toFixed(1)}</span>
                      <span className={`font-mono ${unrealizedPnl >= 0 ? "text-gain" : "text-loss"}`}>
                        {unrealizedPnl >= 0 ? "+" : ""}{inr(unrealizedPnl)}
                      </span>
                    </div>

                    <Button
                      onClick={closeReplayPosition}
                      variant="destructive"
                      size="sm"
                      className="w-full font-bold text-xs"
                    >
                      Close Position @ Market
                    </Button>
                  </div>
                )}
              </div>

              {/* Performance Scorecard */}
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Session Performance</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-accent/40 p-3">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Realized P&L</span>
                    <p className={`mt-1 font-mono text-base font-extrabold ${totalRealizedPnl >= 0 ? "text-gain" : "text-loss"}`}>
                      {totalRealizedPnl >= 0 ? "+" : ""}{inr(totalRealizedPnl)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-accent/40 p-3">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Win Rate</span>
                    <p className="mt-1 font-mono text-base font-extrabold text-foreground">
                      {winRate.toFixed(0)}%
                    </p>
                  </div>

                  <div className="rounded-lg bg-accent/40 p-3">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Total Trades</span>
                    <p className="mt-1 font-mono text-base font-extrabold text-foreground">
                      {sessionTrades.length}
                    </p>
                  </div>

                  <div className="rounded-lg bg-accent/40 p-3">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Active P&L</span>
                    <p className={`mt-1 font-mono text-base font-extrabold ${unrealizedPnl >= 0 ? "text-gain" : "text-loss"}`}>
                      {unrealizedPnl >= 0 ? "+" : ""}{inr(unrealizedPnl)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Replay Trade Log */}
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Executed Replay Trades</h3>

                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                  {sessionTrades.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      No trades closed in this session yet. Execute orders as you advance the tape.
                    </p>
                  ) : (
                    sessionTrades.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-xs rounded border border-border/60 p-2">
                        <span className="font-bold text-foreground">#{t.id} {t.side}</span>
                        <span className="text-muted-foreground font-mono">₹{t.entry.toFixed(1)} → ₹{t.exit.toFixed(1)}</span>
                        <span className={`font-mono font-bold ${t.pnl >= 0 ? "text-gain" : "text-loss"}`}>
                          {t.pnl >= 0 ? "+" : ""}{inr(t.pnl)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Leaderboard Tab */
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {challenges.map((c) => (
                <div key={c.id} className="relative rounded-2xl border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="num text-xs font-semibold text-primary">XP +{c.xp}</span>
                    <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted-foreground">{c.reward}</span>
                  </div>
                  <h3 className="mt-2 text-base font-bold">{c.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span>{c.participants.toLocaleString()} traders active</span>
                    <span className="text-primary font-medium">{c.daysLeft}d left</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="text-base font-bold">National Trader Leaderboard</h2>
              <p className="text-xs text-muted-foreground">Ranked by risk-adjusted return and Rule 4.3 discipline score.</p>
              <div className="mt-4 space-y-2">
                {leaderboard.map((u) => (
                  <div key={u.rank} className="flex items-center justify-between rounded-xl border p-3 hover:bg-accent/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="grid size-7 place-items-center rounded-lg bg-accent text-xs font-bold text-primary">
                        {u.rank}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold">{u.handle}</span>
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{u.badge}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Discipline: {u.disciplineScore}/100</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-gain">+{u.returnPct.toFixed(1)}%</p>
                      <p className="text-[10px] text-muted-foreground">Level {u.level}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
