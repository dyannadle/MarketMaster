import { useState, useMemo } from "react";
import {
  Zap,
  TrendingUp,
  Scale,
  ShieldCheck,
  EyeOff,
  Clock,
  Layers,
  ArrowRight,
  Info,
  Building2,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import {
  getMultiVenueQuotes,
  executeSmartOrderRouting,
  executeVwapSchedule,
  executeIcebergOrder,
  ExecutionScheduleResult,
} from "@/lib/smart-order-router";

interface SmartOrderRoutingPanelProps {
  symbol?: string;
  currentPrice?: number;
}

export function SmartOrderRoutingPanel({
  symbol = "NIFTY_FUT",
  currentPrice = 24500,
}: SmartOrderRoutingPanelProps) {
  const [algoMode, setAlgoMode] = useState<"SOR" | "VWAP" | "ICEBERG">("SOR");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [parentQty, setParentQty] = useState<number>(5000);
  const [icebergClip, setIcebergClip] = useState<number>(500);

  // Live Multi-Venue Quotes
  const quotes = useMemo(() => {
    return getMultiVenueQuotes(symbol, currentPrice);
  }, [symbol, currentPrice]);

  // Execution result
  const executionResult: ExecutionScheduleResult = useMemo(() => {
    if (algoMode === "SOR") {
      return executeSmartOrderRouting(parentQty, side, currentPrice, symbol);
    } else if (algoMode === "VWAP") {
      return executeVwapSchedule(parentQty, side, currentPrice);
    } else {
      return executeIcebergOrder(parentQty, icebergClip, side, currentPrice);
    }
  }, [algoMode, parentQty, side, currentPrice, symbol, icebergClip]);

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-primary" /> Smart Order Router (SOR) & Algorithmic Slicing
            </h2>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
              {symbol}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fragmented liquidity execution across NSE & BSE with NBBO price improvement and Implementation Shortfall tracking.
          </p>
        </div>

        {/* Algorithm Mode Selector */}
        <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/40 p-1">
          <button
            onClick={() => setAlgoMode("SOR")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
              algoMode === "SOR" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Scale className="h-3 w-3" /> Smart Router (SOR)
          </button>
          <button
            onClick={() => setAlgoMode("VWAP")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
              algoMode === "VWAP" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3 w-3" /> Intraday VWAP
          </button>
          <button
            onClick={() => setAlgoMode("ICEBERG")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
              algoMode === "ICEBERG" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <EyeOff className="h-3 w-3" /> Iceberg Slicing
          </button>
        </div>
      </div>

      {/* Multi-Venue NBBO Live Tape */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* NSE Venue Quote */}
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-blue-400 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" /> NSE Order Gateway
            </span>
            <span className="text-[10px] rounded bg-blue-500/20 px-1.5 py-0.5 font-mono text-blue-300">
              {quotes.nse.latencyMs}ms Latency
            </span>
          </div>
          <div className="flex justify-between items-baseline text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground">Bid / Qty:</span>
              <p className="font-mono font-bold text-foreground">₹{quotes.nse.bidPrice.toFixed(2)} ({quotes.nse.bidQty})</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground">Ask / Qty:</span>
              <p className="font-mono font-bold text-foreground">₹{quotes.nse.askPrice.toFixed(2)} ({quotes.nse.askQty})</p>
            </div>
          </div>
        </div>

        {/* BSE Venue Quote */}
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-purple-400 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" /> BSE Order Gateway
            </span>
            <span className="text-[10px] rounded bg-purple-500/20 px-1.5 py-0.5 font-mono text-purple-300">
              {quotes.bse.latencyMs}ms Latency
            </span>
          </div>
          <div className="flex justify-between items-baseline text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground">Bid / Qty:</span>
              <p className="font-mono font-bold text-foreground">₹{quotes.bse.bidPrice.toFixed(2)} ({quotes.bse.bidQty})</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground">Ask / Qty:</span>
              <p className="font-mono font-bold text-foreground">₹{quotes.bse.askPrice.toFixed(2)} ({quotes.bse.askQty})</p>
            </div>
          </div>
        </div>

        {/* Consolidated NBBO Card */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Consolidated NBBO
            </span>
            <span className="text-[10px] rounded bg-emerald-500/20 px-1.5 py-0.5 font-bold text-emerald-300">
              Spread: ₹{quotes.nbbo.spread.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-baseline text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground">Best Bid ({quotes.nbbo.bestBidVenue}):</span>
              <p className="font-mono font-bold text-foreground">₹{quotes.nbbo.bestBidPrice.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground">Best Ask ({quotes.nbbo.bestAskVenue}):</span>
              <p className="font-mono font-bold text-foreground">₹{quotes.nbbo.bestAskPrice.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Order Slicing Input Controls */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-[11px] font-bold text-muted-foreground">Order Side</label>
            <div className="flex gap-1.5 mt-1">
              <button
                onClick={() => setSide("BUY")}
                className={`flex-1 rounded-md py-1 text-xs font-bold transition-all ${
                  side === "BUY" ? "bg-gain text-white shadow" : "bg-muted text-muted-foreground"
                }`}
              >
                BUY
              </button>
              <button
                onClick={() => setSide("SELL")}
                className={`flex-1 rounded-md py-1 text-xs font-bold transition-all ${
                  side === "SELL" ? "bg-loss text-white shadow" : "bg-muted text-muted-foreground"
                }`}
              >
                SELL
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-muted-foreground">Parent Order Quantity</label>
            <input
              type="number"
              step="500"
              min="500"
              max="100000"
              value={parentQty}
              onChange={(e) => setParentQty(Math.max(100, Number(e.target.value)))}
              className="mt-1 w-full rounded-md border border-border bg-card px-2.5 py-1 text-xs font-mono text-foreground"
            />
          </div>

          {algoMode === "ICEBERG" && (
            <div>
              <label className="text-[11px] font-bold text-muted-foreground">Visible Clip Size</label>
              <input
                type="number"
                step="100"
                min="50"
                max={parentQty}
                value={icebergClip}
                onChange={(e) => setIcebergClip(Math.max(50, Number(e.target.value)))}
                className="mt-1 w-full rounded-md border border-border bg-card px-2.5 py-1 text-xs font-mono text-foreground"
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-muted-foreground">Arrival Benchmark</label>
            <p className="mt-1 font-mono font-bold text-foreground py-1">
              ₹{currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Execution Benchmark Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Avg Exec Price</span>
          <p className="num text-lg font-black text-foreground mt-0.5">
            ₹{executionResult.avgExecutionPrice.toFixed(2)}
          </p>
          <span className="text-[10px] text-muted-foreground">vs ₹{currentPrice.toFixed(2)} arrival</span>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Implementation Shortfall</span>
          <p className={`num text-lg font-black mt-0.5 ${executionResult.implementationShortfallBps <= 3 ? "text-gain" : "text-amber-400"}`}>
            {executionResult.implementationShortfallBps >= 0 ? "+" : ""}{executionResult.implementationShortfallBps} bps
          </p>
          <span className="text-[10px] text-muted-foreground">Institutional Slippage Metric</span>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">SOR Smart Routing Alpha</span>
          <p className="num text-lg font-black text-emerald-400 mt-0.5">
            +₹{executionResult.sorSavingsVsSingleVenue.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-muted-foreground">Saved vs Single Venue Impact</span>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Venue Split (NSE / BSE)</span>
          <p className="num text-lg font-black text-foreground mt-0.5">
            {executionResult.venueBreakdown.nsePct}% / {executionResult.venueBreakdown.bsePct}%
          </p>
          <span className="text-[10px] text-muted-foreground">Optimal liquidity weighting</span>
        </div>
      </div>

      {/* Child Order Schedule Table */}
      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/60">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/60 bg-muted/40 text-[10px] font-bold uppercase text-muted-foreground">
            <tr>
              <th className="p-2.5">Clip</th>
              <th className="p-2.5">Schedule / Latency</th>
              <th className="p-2.5">Venue</th>
              <th className="p-2.5 text-right">Fill Qty</th>
              <th className="p-2.5 text-right">Exec Price</th>
              <th className="p-2.5 text-right">Slippage</th>
              <th className="p-2.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 font-mono">
            {executionResult.clips.map((clip) => (
              <tr key={clip.clipIndex} className="hover:bg-muted/20">
                <td className="p-2.5 font-bold text-foreground">#{clip.clipIndex}</td>
                <td className="p-2.5 text-muted-foreground">{clip.timeLabel}</td>
                <td className="p-2.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      clip.targetVenue === "NSE"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                    }`}
                  >
                    {clip.targetVenue} ({clip.latencyMs}ms)
                  </span>
                </td>
                <td className="p-2.5 text-right font-bold text-foreground">{clip.qty.toLocaleString("en-IN")}</td>
                <td className="p-2.5 text-right font-bold text-foreground">₹{clip.price.toFixed(2)}</td>
                <td className="p-2.5 text-right text-muted-foreground">+{clip.effectiveSlippageBps} bps</td>
                <td className="p-2.5 text-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gain/10 px-2 py-0.5 text-[10px] font-bold text-gain">
                    <CheckCircle2 className="h-3 w-3" /> FILLED
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
