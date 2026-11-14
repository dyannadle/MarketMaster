import { useState, useMemo, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Sliders,
  TrendingUp,
  ShieldAlert,
  Info,
  CheckCircle2,
  BookmarkPlus,
  Terminal,
  Activity,
  Zap,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { toast } from "sonner";
import {
  generateBacktestDebuggerFrames,
  BacktestDebuggerState,
  DebuggerFrame,
} from "@/lib/backtest-debugger";

interface BacktestVisualDebuggerProps {
  strategyName?: string;
  symbol?: string;
  fastPeriod?: number;
  slowPeriod?: number;
}

export function BacktestVisualDebugger({
  strategyName = "Dual_EMA_Crossover",
  symbol = "NIFTY_FUT",
  fastPeriod = 9,
  slowPeriod = 21,
}: BacktestVisualDebuggerProps) {
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeedMs, setPlaybackSpeedMs] = useState<number>(1000); // 1000ms per bar
  const [customNote, setCustomNote] = useState<string>("");
  const [pinnedNotes, setPinnedNotes] = useState<Record<number, string>>({});

  // Generate deterministic replay frames
  const debuggerData: BacktestDebuggerState = useMemo(() => {
    return generateBacktestDebuggerFrames(strategyName, symbol, 30, fastPeriod, slowPeriod);
  }, [strategyName, symbol, fastPeriod, slowPeriod]);

  const activeFrame: DebuggerFrame = debuggerData.frames[currentFrameIndex] || debuggerData.frames[0]!;

  // Auto-advance ticker when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        if (prev >= debuggerData.totalFrames - 1) {
          setIsPlaying(false);
          toast.info("Backtest replay completed!");
          return prev;
        }
        return prev + 1;
      });
    }, playbackSpeedMs);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeedMs, debuggerData.totalFrames]);

  // Chart data: slice frames up to current active index
  const visibleChartData = useMemo(() => {
    return debuggerData.frames.slice(0, currentFrameIndex + 1).map((f) => ({
      bar: `#${f.frameIndex}`,
      close: f.close,
      fastEma: f.indicators.fastEma,
      slowEma: f.indicators.slowEma,
      trailingStop: f.indicators.trailingStop,
      equity: f.equity,
      isEntry: f.signalState === "LONG_ENTRY",
      isExit: f.signalState === "TARGET_EXIT" || f.signalState === "STOP_LOSS_EXIT",
    }));
  }, [debuggerData, currentFrameIndex]);

  // Save pinned journal note
  const handleSaveNote = () => {
    if (!customNote.trim()) return;
    setPinnedNotes((prev) => ({
      ...prev,
      [activeFrame.frameIndex]: customNote.trim(),
    }));
    toast.success(`Note pinned to Bar #${activeFrame.frameIndex}!`);
    setCustomNote("");
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-primary" /> Algorithmic Backtest Step Debugger & Replay
            </h2>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
              {strategyName} ({symbol})
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Step candle-by-candle through historical backtests with real-time rule attribution and trade journal tagging.
          </p>
        </div>

        {/* Playback Controls Toolbar */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentFrameIndex(0)}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
            title="Reset to Bar #1"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCurrentFrameIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentFrameIndex === 0}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all disabled:opacity-30 cursor-pointer"
            title="Step Backward"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isPlaying ? "Pause" : "Play Replay"}</span>
          </button>
          <button
            onClick={() => setCurrentFrameIndex((prev) => Math.min(debuggerData.totalFrames - 1, prev + 1))}
            disabled={currentFrameIndex >= debuggerData.totalFrames - 1}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all disabled:opacity-30 cursor-pointer"
            title="Step Forward"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          {/* Speed Selector */}
          <select
            value={playbackSpeedMs}
            onChange={(e) => setPlaybackSpeedMs(Number(e.target.value))}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs font-mono font-bold text-foreground"
          >
            <option value={1500}>0.5x Speed</option>
            <option value={1000}>1.0x Speed</option>
            <option value={500}>2.0x Speed</option>
            <option value={200}>5.0x Speed</option>
          </select>
        </div>
      </div>

      {/* Scrub Slider Bar */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-1">
        <div className="flex justify-between text-xs font-mono">
          <span className="font-bold text-foreground">
            Current Candle: Bar #{activeFrame.frameIndex} of {debuggerData.totalFrames} ({activeFrame.timestamp})
          </span>
          <span className="text-muted-foreground">Close: ₹{activeFrame.close}</span>
        </div>
        <input
          type="range"
          min={0}
          max={debuggerData.totalFrames - 1}
          value={currentFrameIndex}
          onChange={(e) => setCurrentFrameIndex(Number(e.target.value))}
          className="w-full accent-primary cursor-pointer"
        />
      </div>

      {/* Real-Time Signal Attribution Inspector Banner */}
      <div
        className={`rounded-xl border p-3.5 flex flex-wrap items-center justify-between gap-3 ${
          activeFrame.signalState === "LONG_ENTRY"
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
            : activeFrame.signalState === "TARGET_EXIT" || activeFrame.signalState === "STOP_LOSS_EXIT"
            ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
            : activeFrame.signalState === "IN_TRADE"
            ? "border-sky-500/40 bg-sky-500/10 text-sky-300"
            : "border-border/60 bg-muted/30 text-muted-foreground"
        }`}
      >
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider">
              State: {activeFrame.signalState.replace(/_/g, " ")}
            </span>
            {activeFrame.annotation && (
              <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary font-mono">
                {activeFrame.annotation.tag}
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-foreground">{activeFrame.signalReason}</p>
        </div>

        {/* Live Active Trade HUD */}
        {activeFrame.activePosition && (
          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-[10px] text-muted-foreground">Entry / Stop:</span>
              <p className="font-bold text-foreground">
                ₹{activeFrame.activePosition.entryPrice} / ₹{activeFrame.activePosition.currentTrailingStop}
              </p>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground">Unrealized MTM:</span>
              <p className={`font-bold ${activeFrame.activePosition.unrealizedPnl >= 0 ? "text-gain" : "text-loss"}`}>
                {activeFrame.activePosition.unrealizedPnl >= 0 ? "+" : ""}₹{activeFrame.activePosition.unrealizedPnl.toLocaleString("en-IN")} ({activeFrame.activePosition.unrealizedReturnPct}%)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Revealing Candlestick Chart with EMAs and Trailing Stop */}
      <div className="rounded-xl border border-border/80 bg-zinc-950 p-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-zinc-300 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-primary" /> Revealing Price Action & Dynamic Indicator Overlay
          </span>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-sky-400">Fast EMA ({fastPeriod}): ₹{activeFrame.indicators.fastEma}</span>
            <span className="text-amber-400">Slow EMA ({slowPeriod}): ₹{activeFrame.indicators.slowEma}</span>
            <span className="text-rose-400">Trailing SL: ₹{activeFrame.indicators.trailingStop}</span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visibleChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <XAxis dataKey="bar" tick={{ fontSize: 10 }} stroke="#666666" />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} stroke="#666666" />
              <Tooltip
                contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "8px", fontSize: "11px" }}
                formatter={(val: any) => [`₹${Number(val).toFixed(2)}`, ""]}
              />
              <Line type="monotone" dataKey="close" stroke="#ffffff" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="fastEma" stroke="#38bdf8" strokeWidth={1.8} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="slowEma" stroke="#f59e0b" strokeWidth={1.8} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="trailingStop" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Journal Annotation Card */}
      <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
            <BookmarkPlus className="h-4 w-4 text-primary" /> Post-Mortem Journal Notes for Bar #{activeFrame.frameIndex}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {Object.keys(pinnedNotes).length} notes pinned in session
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Clean retest of 24,350 prior resistance before breakout expansion..."
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveNote()}
            className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
          />
          <button
            onClick={handleSaveNote}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
          >
            Pin Note
          </button>
        </div>

        {/* Display Pinned Notes */}
        {Object.keys(pinnedNotes).length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {Object.entries(pinnedNotes).map(([bar, note]) => (
              <span
                key={bar}
                onClick={() => setCurrentFrameIndex(Number(bar) - 1)}
                className="inline-flex items-center gap-1 rounded bg-muted/60 border border-border px-2 py-0.5 text-[11px] font-mono cursor-pointer hover:border-primary transition-all"
              >
                <strong className="text-primary">Bar #{bar}:</strong> {note}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
