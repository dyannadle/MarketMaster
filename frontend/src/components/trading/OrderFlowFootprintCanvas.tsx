import { useState, useMemo } from "react";
import {
  Layers,
  TrendingUp,
  BarChart3,
  Activity,
  Flame,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Maximize2,
  Sparkles,
} from "lucide-react";
import {
  generateFootprintBars,
  FootprintAnalysisResult,
  FootprintBar,
  FootprintLevel,
} from "@/lib/order-flow-footprint";

interface OrderFlowFootprintCanvasProps {
  symbol?: string;
  currentPrice?: number;
}

export function OrderFlowFootprintCanvas({
  symbol = "NIFTY_FUT",
  currentPrice = 24500,
}: OrderFlowFootprintCanvasProps) {
  const [imbalanceRatio, setImbalanceRatio] = useState<number>(3.0);
  const [displayMode, setDisplayMode] = useState<"BID_ASK" | "DELTA">("BID_ASK");
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

  const footprintData: FootprintAnalysisResult = useMemo(() => {
    return generateFootprintBars(symbol, currentPrice, 7, imbalanceRatio);
  }, [symbol, currentPrice, imbalanceRatio]);

  // Max volume level across all bars for relative bar width
  const maxLevelVolume = useMemo(() => {
    let max = 1;
    footprintData.bars.forEach((b) => {
      b.levels.forEach((l) => {
        if (l.totalVolume > max) max = l.totalVolume;
      });
    });
    return max;
  }, [footprintData]);

  // Max volume in session volume profile for histogram width
  const maxProfileVolume = useMemo(() => {
    let max = 1;
    footprintData.volumeProfile.forEach((p) => {
      if (p.totalVolume > max) max = p.totalVolume;
    });
    return max;
  }, [footprintData]);

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-primary" /> Order Flow Footprint (MBP) & Volume Profile
            </h2>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
              {symbol} (Spot ₹{currentPrice.toLocaleString("en-IN")})
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Microstructure intra-candle delta clusters, diagonal imbalances, Point of Control (POC), and Value Area (VAH/VAL).
          </p>
        </div>

        {/* View Mode & Imbalance Ratio Toggles */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/40 p-1 text-xs">
            <button
              onClick={() => setDisplayMode("BID_ASK")}
              className={`rounded-md px-2.5 py-1 font-bold transition-all ${
                displayMode === "BID_ASK" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Bid x Ask
            </button>
            <button
              onClick={() => setDisplayMode("DELTA")}
              className={`rounded-md px-2.5 py-1 font-bold transition-all ${
                displayMode === "DELTA" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Delta Color
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/40 p-1 text-xs">
            <span className="text-[10px] text-muted-foreground px-1 font-bold">Imbalance:</span>
            {[3.0, 4.0].map((ratio) => (
              <button
                key={ratio}
                onClick={() => setImbalanceRatio(ratio)}
                className={`rounded px-2 py-0.5 text-[10px] font-bold transition-all ${
                  imbalanceRatio === ratio ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
                }`}
              >
                {ratio}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Institutional Microstructure Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Session POC Price</span>
          <p className="num text-lg font-black text-amber-400 mt-0.5">₹{footprintData.overallPoc.toFixed(0)}</p>
          <span className="text-[10px] text-muted-foreground">Point of Control (Max Vol)</span>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Value Area (70% Vol)</span>
          <p className="num text-lg font-black text-foreground mt-0.5">
            ₹{footprintData.overallVal} - ₹{footprintData.overallVah}
          </p>
          <span className="text-[10px] text-muted-foreground">VAL to VAH Balance Zone</span>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Cumulative Net Delta</span>
          <p className={`num text-lg font-black mt-0.5 ${footprintData.netDelta >= 0 ? "text-gain" : "text-loss"}`}>
            {footprintData.netDelta >= 0 ? "+" : ""}{footprintData.netDelta.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-muted-foreground">Aggressive Buys vs Sells</span>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Total Session Volume</span>
          <p className="num text-lg font-black text-foreground mt-0.5">{footprintData.totalVolume.toLocaleString("en-IN")}</p>
          <span className="text-[10px] text-muted-foreground">Contracts executed</span>
        </div>
      </div>

      {/* Stacked Imbalance Warnings */}
      {footprintData.bars.some((b) => b.stackedBuyImbalances >= 3 || b.stackedSellImbalances >= 3) && (
        <div className="space-y-1.5">
          {footprintData.bars.map((b) => {
            if (b.stackedBuyImbalances >= 3) {
              return (
                <div
                  key={`buy-${b.barIndex}`}
                  className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400"
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="h-3.5 w-3.5" /> Stacked Buying Imbalance ({b.stackedBuyImbalances} consecutive levels) at {b.timestamp}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase rounded bg-emerald-500/20 px-1.5 py-0.5">
                    Institutional Absorption: Bullish
                  </span>
                </div>
              );
            }
            if (b.stackedSellImbalances >= 3) {
              return (
                <div
                  key={`sell-${b.barIndex}`}
                  className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400"
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert className="h-3.5 w-3.5" /> Stacked Selling Imbalance ({b.stackedSellImbalances} consecutive levels) at {b.timestamp}
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase rounded bg-rose-500/20 px-1.5 py-0.5">
                    Aggressive Sweep: Bearish
                  </span>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}

      {/* Main Order Flow Footprint Canvas & Volume Profile View */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
        {/* Footprint Bars Horizontal Scroll Container */}
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-zinc-950 p-3">
          <div className="flex gap-3 min-w-max">
            {footprintData.bars.map((bar) => {
              const isBullish = bar.close >= bar.open;
              const isSelected = selectedBarIndex === bar.barIndex;

              return (
                <div
                  key={bar.barIndex}
                  onClick={() => setSelectedBarIndex(isSelected ? null : bar.barIndex)}
                  className={`flex flex-col items-center rounded-lg border p-2 transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                  }`}
                  style={{ width: "135px" }}
                >
                  {/* Candle Header: Time & Mini Candlestick */}
                  <div className="w-full flex items-center justify-between text-[10px] text-zinc-400 border-b border-zinc-800 pb-1 mb-1 font-mono">
                    <span className="font-bold">{bar.timestamp}</span>
                    <span className={isBullish ? "text-gain font-bold" : "text-loss font-bold"}>
                      {bar.close}
                    </span>
                  </div>

                  {/* Footprint Price Rows (sorted high to low) */}
                  <div className="w-full space-y-0.5 font-mono text-[10px]">
                    {[...bar.levels]
                      .sort((a, b) => b.price - a.price)
                      .map((lvl) => {
                        const isDeltaPos = lvl.delta >= 0;
                        const cellBg =
                          displayMode === "DELTA"
                            ? isDeltaPos
                              ? "rgba(16, 185, 129, 0.22)"
                              : "rgba(244, 63, 94, 0.22)"
                            : "rgba(255, 255, 255, 0.03)";

                        return (
                          <div
                            key={lvl.price}
                            className={`flex items-center justify-between px-1 py-0.5 rounded transition-all ${
                              lvl.isPoc
                                ? "border border-amber-400 bg-amber-400/15 font-bold"
                                : ""
                            }`}
                            style={{ backgroundColor: cellBg }}
                          >
                            {/* Bid Volume */}
                            <span
                              className={`w-10 text-right ${
                                lvl.isBidImbalance
                                  ? "text-rose-400 font-black underline decoration-rose-400"
                                  : "text-zinc-400"
                              }`}
                            >
                              {lvl.bidVolume}
                            </span>

                            {/* Price / POC Marker */}
                            <span className="text-[9px] text-zinc-500 px-1 font-sans">
                              {lvl.isPoc ? "★" : "·"}
                            </span>

                            {/* Ask Volume */}
                            <span
                              className={`w-10 text-left ${
                                lvl.isAskImbalance
                                  ? "text-emerald-400 font-black underline decoration-emerald-400"
                                  : "text-zinc-300"
                              }`}
                            >
                              {lvl.askVolume}
                            </span>
                          </div>
                        );
                      })}
                  </div>

                  {/* Bar Summary Footer */}
                  <div className="w-full mt-2 pt-1 border-t border-zinc-800 text-[9px] font-mono text-zinc-400 flex flex-col gap-0.5">
                    <div className="flex justify-between">
                      <span>Delta:</span>
                      <span className={bar.candleDelta >= 0 ? "text-gain font-bold" : "text-loss font-bold"}>
                        {bar.candleDelta >= 0 ? "+" : ""}{bar.candleDelta}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>CumΔ:</span>
                      <span className={bar.cumDelta >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        {bar.cumDelta >= 0 ? "+" : ""}{bar.cumDelta}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Vol:</span>
                      <span>{bar.candleVolume}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Session Volume Profile Sidebar */}
        <div className="rounded-xl border border-border/80 bg-zinc-950 p-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
            <span className="font-bold text-zinc-200 flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5 text-primary" /> Volume Profile
            </span>
            <span className="text-[10px] text-amber-400">POC ₹{footprintData.overallPoc}</span>
          </div>

          <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
            {[...footprintData.volumeProfile]
              .sort((a, b) => b.price - a.price)
              .map((bucket) => {
                const widthPct = Math.min(100, (bucket.totalVolume / maxProfileVolume) * 100);
                return (
                  <div key={bucket.price} className="relative flex items-center justify-between text-[10px] py-0.5 px-1.5 rounded">
                    {/* Background Volume Bar */}
                    <div
                      className={`absolute left-0 top-0 bottom-0 rounded opacity-25 ${
                        bucket.isPoc
                          ? "bg-amber-400 opacity-60"
                          : bucket.isInValueArea
                          ? "bg-primary"
                          : "bg-zinc-700"
                      }`}
                      style={{ width: `${widthPct}%` }}
                    />

                    {/* Price and Badges */}
                    <span className="relative z-10 flex items-center gap-1 font-bold text-zinc-300">
                      ₹{bucket.price}
                      {bucket.isPoc && (
                        <span className="text-[8px] rounded bg-amber-400 text-black px-1 font-black">POC</span>
                      )}
                      {bucket.isHvn && !bucket.isPoc && (
                        <span className="text-[8px] rounded bg-primary/20 text-primary px-1">HVN</span>
                      )}
                    </span>

                    {/* Total Volume & Delta */}
                    <span className="relative z-10 text-[9px] text-zinc-400">
                      {bucket.totalVolume} ({bucket.delta >= 0 ? `+${bucket.delta}` : bucket.delta})
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
