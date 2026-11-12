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
  Layers,
  ShieldAlert,
  Target,
  Sparkles,
  Scale,
  Award as RankIcon,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { challenges, leaderboard, inr } from "@/lib/data";
import { backendApi } from "@/lib/api";
import { CandlestickChart, Candle } from "@/components/trading/CandlestickChart";
import { Button } from "@/components/ui/button";
import {
  getSavedTraderProfile,
  calculateUpdatedRating,
  GlickoTrader,
  getRankFromRating,
} from "@/lib/glicko2";
import { nativeBridge } from "@/lib/native";
import { AlphaArenaPanel } from "@/components/challenges/AlphaArenaPanel";
import { getCatalystsForPreset } from "@/lib/microstructure";

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

export const DAILY_SETUPS = [
  {
    id: "DAILY_1",
    title: "Morning Volatility Breakout",
    presetId: "BUDGET_RALLY_2021",
    timeWindow: "09:15 - 10:30 IST",
    regime: "Institutional Trend Day",
    mission: "Trade the one-way breakout with a trailing stop. Minimum ₹10,000 target adherence.",
    xpBonus: "+50 Elo Bonus",
    benchmarkRating: 1550,
  },
  {
    id: "DAILY_2",
    title: "Unscheduled Rate Shock Defense",
    presetId: "RBI_RATE_HIKE_2022",
    timeWindow: "13:30 - 15:00 IST",
    regime: "Flash Macro Disruption",
    mission: "Survive the sudden 650 pt liquidity drop without exceeding 1.5% capital risk.",
    xpBonus: "+60 Elo Bonus",
    benchmarkRating: 1720,
  },
  {
    id: "DAILY_3",
    title: "Circuit Breaker Capitulation",
    presetId: "COVID_CRASH_2020",
    timeWindow: "10:00 - 14:00 IST",
    regime: "Extreme Volatility (VIX > 80)",
    mission: "Capture the sharp intraday recovery after the 10% lower circuit breaker freeze.",
    xpBonus: "+75 Elo Bonus",
    benchmarkRating: 1850,
  },
];

function ChallengesAndGym() {
  const [activeTab, setActiveTab] = useState<"GYM" | "LEADERBOARD" | "ALPHA_ARENA">("GYM");

  // Mode: Practice (casual replay) vs Rated (Elo rating at stake + mandatory Rule 4.3 stop-loss)
  const [gymMode, setGymMode] = useState<"PRACTICE" | "RATED">("RATED");
  const [traderProfile, setTraderProfile] = useState<GlickoTrader>(getSavedTraderProfile);

  // Stop-Loss & Target for in-replay execution
  const [stopLossInput, setStopLossInput] = useState<string>("");
  const [targetInput, setTargetInput] = useState<string>("");

  // Rated Session Result Modal State
  const [ratingUpdateModal, setRatingUpdateModal] = useState<{
    oldRating: number;
    newRating: number;
    delta: number;
    pnl: number;
    rankTitle: string;
  } | null>(null);

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
    stopLoss?: number | undefined;
    target?: number | undefined;
  } | null>(null);

  const [sessionTrades, setSessionTrades] = useState<{
    id: number;
    side: "LONG" | "SHORT";
    entry: number;
    exit: number;
    pnl: number;
    reason?: string;
  }[]>([]);

  const activePreset = LOCAL_PRESETS.find((p) => p.id === selectedPresetId) || LOCAL_PRESETS[1]!;

  // Load replay session from backend
  const loadNewSession = async (presetId: string = selectedPresetId, blind: boolean = isMaskedBlind) => {
    setIsLoadingSession(true);
    setIsPlaying(false);
    setActivePosition(null);
    setSessionTrades([]);
    setStopLossInput("");
    setTargetInput("");

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

  // Check automatic SL and TP triggers on incoming candle
  const checkTriggers = (candle: Candle, currentPos: typeof activePosition) => {
    if (!currentPos) return;

    if (currentPos.side === "LONG") {
      // Check SL hit
      if (currentPos.stopLoss && candle.low <= currentPos.stopLoss) {
        const exitPrice = currentPos.stopLoss;
        const pnl = (exitPrice - currentPos.entryPrice) * currentPos.qty;
        setSessionTrades((prev) => [
          ...prev,
          { id: prev.length + 1, side: "LONG", entry: currentPos.entryPrice, exit: exitPrice, pnl, reason: "STOP_LOSS_HIT" }
        ]);
        setActivePosition(null);
        toast.error(`STOP LOSS HIT: Long closed @ ₹${exitPrice.toFixed(1)} (${inr(pnl)})`);
        nativeBridge.vibrateStopLoss();
        return;
      }
      // Check Target hit
      if (currentPos.target && candle.high >= currentPos.target) {
        const exitPrice = currentPos.target;
        const pnl = (exitPrice - currentPos.entryPrice) * currentPos.qty;
        setSessionTrades((prev) => [
          ...prev,
          { id: prev.length + 1, side: "LONG", entry: currentPos.entryPrice, exit: exitPrice, pnl, reason: "TARGET_ACHIEVED" }
        ]);
        setActivePosition(null);
        toast.success(`TARGET ACHIEVED: Long closed @ ₹${exitPrice.toFixed(1)} (+${inr(pnl)})`);
        nativeBridge.vibrateFill();
        return;
      }
    } else {
      // SHORT side
      if (currentPos.stopLoss && candle.high >= currentPos.stopLoss) {
        const exitPrice = currentPos.stopLoss;
        const pnl = (currentPos.entryPrice - exitPrice) * currentPos.qty;
        setSessionTrades((prev) => [
          ...prev,
          { id: prev.length + 1, side: "SHORT", entry: currentPos.entryPrice, exit: exitPrice, pnl, reason: "STOP_LOSS_HIT" }
        ]);
        setActivePosition(null);
        toast.error(`STOP LOSS HIT: Short closed @ ₹${exitPrice.toFixed(1)} (${inr(pnl)})`);
        nativeBridge.vibrateStopLoss();
        return;
      }
      if (currentPos.target && candle.low <= currentPos.target) {
        const exitPrice = currentPos.target;
        const pnl = (currentPos.entryPrice - exitPrice) * currentPos.qty;
        setSessionTrades((prev) => [
          ...prev,
          { id: prev.length + 1, side: "SHORT", entry: currentPos.entryPrice, exit: exitPrice, pnl, reason: "TARGET_ACHIEVED" }
        ]);
        setActivePosition(null);
        toast.success(`TARGET ACHIEVED: Short closed @ ₹${exitPrice.toFixed(1)} (+${inr(pnl)})`);
        nativeBridge.vibrateFill();
        return;
      }
    }
  };

  // Step one bar forward
  const stepForward = () => {
    if (currentIndex < sessionCandles.length) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      if (sessionCandles[nextIdx - 1]) {
        checkTriggers(sessionCandles[nextIdx - 1]!, activePosition);
      }
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
        const next = prev + 1;
        if (sessionCandles[next]) {
          checkTriggers(sessionCandles[next]!, activePosition);
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, sessionCandles, activePosition]);

  // Replay Position Execution with Rule 4.3 Validation
  const openReplayPosition = (side: "LONG" | "SHORT") => {
    if (activePosition) {
      toast.error("You already have an active position. Close it before opening another.");
      return;
    }

    const slVal = Number(stopLossInput);
    const tpVal = Number(targetInput);

    // Rule 4.3 Enforcement in Rated Mode
    if (gymMode === "RATED") {
      if (!slVal || slVal <= 0) {
        toast.error("Rule 4.3 Mandatory Invariant: Rated mode strictly requires an active stop-loss.");
        return;
      }

      if (side === "LONG" && slVal >= currentLtp) {
        toast.error("Long Stop-Loss must be placed strictly below the current entry price.");
        return;
      }
      if (side === "SHORT" && slVal <= currentLtp) {
        toast.error("Short Stop-Loss must be placed strictly above the current entry price.");
        return;
      }

      // Max 1.5% capital risk (₹15,000 on ₹10 Lakh equity)
      const riskAmount = Math.abs(currentLtp - slVal) * 50;
      if (riskAmount > 15000) {
        toast.error(
          `Rule 4.3 Risk Limit Exceeded: Calculated risk of ₹${riskAmount.toLocaleString("en-IN")} exceeds maximum allowable limit of ₹15,000 (1.5% equity). Tighten your stop-loss.`
        );
        return;
      }
    }

    setActivePosition({
      side,
      entryPrice: currentLtp,
      qty: 50,
      entryBar: currentIndex,
      stopLoss: slVal > 0 ? slVal : undefined,
      target: tpVal > 0 ? tpVal : undefined,
    });
    toast.success(`Opened ${side} 50 units @ ₹${currentLtp.toFixed(1)}${slVal > 0 ? ` (SL: ₹${slVal})` : ""}`);
    nativeBridge.vibrateFill();
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
        reason: "MANUAL_EXIT",
      },
    ]);
    setActivePosition(null);
    toast.success(`Closed position: ${pnl >= 0 ? "+" : ""}${inr(pnl)}`);
  };

  // Conclude Rated Session & Calculate Glicko-2 Rating Update
  const concludeRatedSession = () => {
    if (sessionTrades.length === 0 && !activePosition) {
      toast.error("Execute at least one trade to complete a rated session.");
      return;
    }

    if (activePosition) {
      closeReplayPosition();
    }

    const netPnl = sessionTrades.reduce((sum, t) => sum + t.pnl, 0);
    const winRateFrac = sessionTrades.length > 0 ? (sessionTrades.filter((t) => t.pnl > 0).length / sessionTrades.length) : 0;
    const scenarioDifficulty = selectedPresetId === "COVID_CRASH_2020" ? 1800 : selectedPresetId === "ELECTION_DAY_2024" ? 1700 : 1500;

    const { updated, ratingDelta } = calculateUpdatedRating(
      traderProfile,
      netPnl,
      winRateFrac,
      netPnl >= 0 ? 95 : 75,
      scenarioDifficulty
    );

    setTraderProfile(updated);
    setRatingUpdateModal({
      oldRating: traderProfile.rating,
      newRating: updated.rating,
      delta: ratingDelta,
      pnl: netPnl,
      rankTitle: updated.rankTitle,
    });

    if (ratingDelta >= 0) {
      toast.success(`Rated Session Complete! Rating Delta: +${ratingDelta} Elo`);
      nativeBridge.vibrateFill();
    } else {
      toast.warning(`Rated Session Complete. Rating Delta: ${ratingDelta} Elo`);
    }
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
        {/* Top Control Bar: Mode Switcher & Glicko-2 Trader Profile Banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          {/* Navigation Tabs */}
          <div className="flex rounded-xl border border-border/60 bg-muted/50 p-1 text-xs">
            <button
              onClick={() => setActiveTab("GYM")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 font-bold transition-all ${
                activeTab === "GYM" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Activity className="h-4 w-4" /> Replay Gym & Simulator
            </button>
            <button
              onClick={() => setActiveTab("ALPHA_ARENA")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 font-bold transition-all ${
                activeTab === "ALPHA_ARENA" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Trophy className="h-4 w-4" /> Alpha Arena (Calmar League)
            </button>
            <button
              onClick={() => setActiveTab("LEADERBOARD")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 font-bold transition-all ${
                activeTab === "LEADERBOARD" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Medal className="h-4 w-4" /> Daily Challenges &amp; Leaderboard
            </button>
          </div>

          {/* Glicko-2 Trader Profile Spotlight */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            {/* Mode Toggle: Practice vs Rated */}
            <div className="flex items-center rounded-lg border border-border bg-background p-1">
              <button
                onClick={() => setGymMode("PRACTICE")}
                className={`rounded px-2.5 py-1 text-xs font-bold transition-all ${
                  gymMode === "PRACTICE" ? "bg-secondary text-foreground shadow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Casual Practice
              </button>
              <button
                onClick={() => setGymMode("RATED")}
                className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-bold transition-all ${
                  gymMode === "RATED" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <RankIcon className="h-3 w-3" /> Rated Mode (Rule 4.3)
              </button>
            </div>

            {/* Rank Badge & Elo Stats */}
            <div className="flex items-center gap-2.5 border-l border-border/60 pl-3">
              <span className={`rounded-md border px-2 py-0.5 text-xs font-sans font-bold ${getRankFromRating(traderProfile.rating).badgeColor}`}>
                {traderProfile.rankTitle}
              </span>
              <div>
                <span className="text-[10px] text-muted-foreground block font-sans">Skill Rating</span>
                <span className="text-sm font-black text-foreground">{traderProfile.rating} Elo</span>
                <span className="text-[10px] text-muted-foreground ml-1">(±{traderProfile.rd})</span>
              </div>
            </div>
          </div>
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

              {/* Historical News Catalyst Pins Overlay */}
              <div className="mt-3 rounded-lg border border-border/60 bg-secondary/15 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 text-[11px]">
                    <Zap className="h-3.5 w-3.5 text-amber-400" /> Historical Macro News Catalyst Overlay
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {isMaskedBlind || selectedPresetId === "BLIND_RANDOM"
                      ? "Identifiers Masked (Blind Practice)"
                      : "Chronological Tape Pins"}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {getCatalystsForPreset(selectedPresetId, isMaskedBlind || selectedPresetId === "BLIND_RANDOM").map((cat) => {
                    const isPassed = currentIndex >= cat.barIndex;
                    return (
                      <div
                        key={cat.id}
                        className={`flex items-start justify-between rounded-md border p-2 text-xs transition-all ${
                          isPassed
                            ? "border-amber-500/40 bg-amber-500/10 text-foreground"
                            : "border-border/40 bg-background/50 text-muted-foreground opacity-60"
                        }`}
                      >
                        <div className="space-y-0.5 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-secondary px-1.5 py-0.2 text-[9px] font-bold uppercase text-primary font-mono">
                              Bar #{cat.barIndex}
                            </span>
                            <span className="text-[9px] font-bold uppercase text-amber-400">
                              {cat.category}
                            </span>
                          </div>
                          <p className="font-medium text-[11px] leading-snug">{cat.headline}</p>
                        </div>
                        <span className="shrink-0 rounded bg-background/80 px-2 py-0.5 font-mono text-[10px] font-bold border border-border/40">
                          {cat.surprise}
                        </span>
                      </div>
                    );
                  })}
                </div>
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
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Replay Execution Ticket</h3>
                  {gymMode === "RATED" && (
                    <span className="rounded bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Rule 4.3 Mandatory SL
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Current Candle Close:</span>
                  <span className="font-mono font-bold text-foreground">₹{currentLtp.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Contract Lot Size:</span>
                  <span className="font-mono font-bold text-foreground">50 units</span>
                </div>

                {/* Stop Loss & Target Inputs */}
                {!activePosition && (
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">
                        Stop-Loss {gymMode === "RATED" ? "(Required)" : "(Optional)"}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-muted-foreground">₹</span>
                        <input
                          type="number"
                          placeholder={currentLtp > 1000 ? `${Math.round(currentLtp * 0.99)}` : "980"}
                          value={stopLossInput}
                          onChange={(e) => setStopLossInput(e.target.value)}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-muted-foreground block font-sans">Take-Profit Target</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-muted-foreground">₹</span>
                        <input
                          type="number"
                          placeholder={currentLtp > 1000 ? `${Math.round(currentLtp * 1.02)}` : "1020"}
                          value={targetInput}
                          onChange={(e) => setTargetInput(e.target.value)}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Rule 4.3 Real-Time Capital Risk Calculation */}
                {!activePosition && stopLossInput && Number(stopLossInput) > 0 && (
                  <div className="rounded-lg bg-accent/40 p-2 text-[11px] font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground font-sans">Calculated Risk:</span>
                      {(() => {
                        const riskAmt = Math.abs(currentLtp - Number(stopLossInput)) * 50;
                        const isUnderRule = riskAmt <= 15000;
                        return (
                          <span className={`font-bold ${isUnderRule ? "text-gain" : "text-loss"}`}>
                            {inr(riskAmt)} ({((riskAmt / 1000000) * 100).toFixed(2)}%)
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {!activePosition ? (
                  <div className="grid grid-cols-2 gap-3 pt-1">
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

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                      <span>SL: {activePosition.stopLoss ? `₹${activePosition.stopLoss}` : "None"}</span>
                      <span>TP: {activePosition.target ? `₹${activePosition.target}` : "None"}</span>
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

              {/* Performance Scorecard & Rated Session Finisher */}
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Session Performance</h3>
                  <span className="text-[10px] font-mono text-muted-foreground">{sessionTrades.length} trades</span>
                </div>

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
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Discipline Rating</span>
                    <p className="mt-1 font-mono text-base font-extrabold text-primary">
                      {traderProfile.rating} Elo
                    </p>
                  </div>

                  <div className="rounded-lg bg-accent/40 p-3">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">Active P&L</span>
                    <p className={`mt-1 font-mono text-base font-extrabold ${unrealizedPnl >= 0 ? "text-gain" : "text-loss"}`}>
                      {unrealizedPnl >= 0 ? "+" : ""}{inr(unrealizedPnl)}
                    </p>
                  </div>
                </div>

                {/* Rated Session Finisher Button */}
                {gymMode === "RATED" && (
                  <Button
                    onClick={concludeRatedSession}
                    disabled={sessionTrades.length === 0 && !activePosition}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5 shadow"
                  >
                    <Trophy className="h-3.5 w-3.5" /> Conclude Rated Session & Update Elo
                  </Button>
                )}
              </div>

              {/* Replay Trade Log */}
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Executed Replay Trades</h3>

                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {sessionTrades.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      No trades closed in this session yet. Execute orders with stops as you advance the tape.
                    </p>
                  ) : (
                    sessionTrades.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-xs rounded border border-border/60 p-2">
                        <div>
                          <span className="font-bold text-foreground">#{t.id} {t.side}</span>
                          {t.reason && (
                            <span className="text-[9px] text-muted-foreground block font-mono">[{t.reason.replace(/_/g, " ")}]</span>
                          )}
                        </div>
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

            {/* Rating Update Celebration Modal */}
            {ratingUpdateModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                <div className="w-full max-w-md rounded-2xl border border-primary/40 bg-card p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-400" />
                      <h3 className="text-base font-bold text-foreground">Rated Session Finalized</h3>
                    </div>
                    <button
                      onClick={() => setRatingUpdateModal(null)}
                      className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="text-center space-y-2 py-2">
                    <span className={`inline-block rounded-full border px-3 py-1 text-xs font-bold ${getRankFromRating(ratingUpdateModal.newRating).badgeColor}`}>
                      {ratingUpdateModal.rankTitle}
                    </span>
                    <div className="flex items-baseline justify-center gap-3">
                      <span className="text-xl font-mono text-muted-foreground line-through">
                        {ratingUpdateModal.oldRating}
                      </span>
                      <ArrowRight className="h-4 w-4 text-primary" />
                      <span className="text-3xl font-mono font-black text-foreground">
                        {ratingUpdateModal.newRating} Elo
                      </span>
                    </div>
                    <p className={`text-sm font-bold font-mono ${ratingUpdateModal.delta >= 0 ? "text-gain" : "text-loss"}`}>
                      {ratingUpdateModal.delta >= 0 ? `+${ratingUpdateModal.delta}` : ratingUpdateModal.delta} Rating Delta
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/60 bg-accent/20 p-3 text-xs space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Session Realized P&L:</span>
                      <span className={`font-bold ${ratingUpdateModal.pnl >= 0 ? "text-gain" : "text-loss"}`}>
                        {ratingUpdateModal.pnl >= 0 ? "+" : ""}{inr(ratingUpdateModal.pnl)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rule 4.3 Risk Rating:</span>
                      <span className="text-emerald-400 font-bold">100% Compliant</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setRatingUpdateModal(null)}
                    className="w-full bg-primary hover:bg-primary/90 font-bold text-xs"
                  >
                    Continue Deliberate Practice
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "ALPHA_ARENA" ? (
          <AlphaArenaPanel traderTier={traderProfile.rankTitle} />
        ) : (
          /* Leaderboard & Daily Challenge Rotation Tab */
          <div className="space-y-6">
            {/* 1. Daily 3-Setup Challenge Rotation (Refreshed at 00:00 IST) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-bold tracking-tight text-foreground">
                    Today's Curated Historical Setups (Refreshes at 00:00 IST)
                  </h2>
                </div>
                <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400">
                  3 Active Today
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {DAILY_SETUPS.map((d) => (
                  <div
                    key={d.id}
                    className="relative rounded-2xl border border-border/80 bg-card p-5 shadow-sm hover:border-primary/50 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
                        {d.timeWindow}
                      </span>
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-emerald-400 font-mono">
                        {d.xpBonus}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-foreground">{d.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {d.mission}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Benchmark: {d.benchmarkRating} Elo
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedPresetId(d.presetId);
                          setGymMode("RATED");
                          setActiveTab("GYM");
                          toast.info(`Loaded Daily Challenge: ${d.title} in Rated Mode.`);
                        }}
                        className="h-7 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Play Challenge
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Personal Glicko Rank Spotlight */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-primary/20 text-primary font-black">
                  #{14}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-sm">Your Institutional Standing</span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${getRankFromRating(traderProfile.rating).badgeColor}`}>
                      {traderProfile.rankTitle}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Rating: <strong className="text-foreground">{traderProfile.rating} Elo</strong> (RD: ±{traderProfile.rd}) · Total Rated Sessions: {traderProfile.totalSessions}
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setGymMode("RATED");
                  setActiveTab("GYM");
                }}
                className="text-xs font-bold"
              >
                Launch Next Rated Session
              </Button>
            </div>

            {/* 3. National Trader Leaderboard */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <h2 className="text-base font-bold">National Trader Leaderboard</h2>
              <p className="text-xs text-muted-foreground">Ranked by risk-adjusted return and Rule 4.3 discipline score.</p>
              <div className="mt-4 space-y-2">
                {leaderboard.map((u, idx) => {
                  const retVal = Number(u.returnPct ?? u.ret ?? 0);
                  const rankVal = u.rank || idx + 1;
                  return (
                    <div key={rankVal} className="flex items-center justify-between rounded-xl border p-3 hover:bg-accent/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="grid size-7 place-items-center rounded-lg bg-accent text-xs font-bold text-primary">
                          {rankVal}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold">{u.handle || u.name}</span>
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{u.badge || "Pro Trader"}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">Discipline: {u.disciplineScore || 90}/100</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-bold text-gain">+{retVal.toFixed(1)}%</p>
                        <p className="text-[10px] text-muted-foreground">Level {u.level || 3}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
