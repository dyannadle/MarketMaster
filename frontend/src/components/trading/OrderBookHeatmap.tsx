// Milestone 22: Level-2 Order Book Heatmap & Depth Imbalance UI
// Visualizes 10-level depth, order imbalance ratios OIR = (Vb - Va)/(Vb + Va), and institutional sweeps.

import { useState, useEffect } from "react";
import {
  Layers,
  Zap,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Activity,
  Pause,
  Play,
  ArrowRight,
} from "lucide-react";
import {
  generateLevel2Depth,
  Level2OrderBook,
  calculateOrderImbalance,
} from "@/lib/order-book-depth";
import { Button } from "@/components/ui/button";

interface Props {
  symbol: string;
  currentPrice: number;
}

export function OrderBookHeatmap({ symbol, currentPrice }: Props) {
  const [book, setBook] = useState<Level2OrderBook>(() =>
    generateLevel2Depth(symbol, currentPrice, 0.5)
  );
  const [isLiveTicks, setIsLiveTicks] = useState(true);

  // Sub-second simulated WebSocket L2 quote feed
  useEffect(() => {
    if (!isLiveTicks) return;

    const interval = setInterval(() => {
      setBook(generateLevel2Depth(symbol, currentPrice, 0.5, Date.now()));
    }, 650);

    return () => clearInterval(interval);
  }, [symbol, currentPrice, isLiveTicks]);

  const oirPct = Math.round(((book.imbalanceRatio + 1) / 2) * 100);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Layers className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Level-2 Depth & Order Imbalance (OIR)</h3>
              <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
                <Activity className="size-2.5 animate-pulse" /> SUB-SECOND L2 TAPE
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Microstructure depth disparity (Vb - Va)/(Vb + Va) detecting institutional sweeps
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLiveTicks(!isLiveTicks)}
            className="gap-1.5 text-xs font-semibold"
          >
            {isLiveTicks ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {isLiveTicks ? "Pause Ticks" : "Resume Ticks"}
          </Button>
        </div>
      </div>

      {/* Order Imbalance Ratio (OIR) Gauge Bar */}
      <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
            Depth Imbalance:
            <span
              className={`font-mono font-bold ${
                book.imbalanceRatio > 0.15
                  ? "text-gain"
                  : book.imbalanceRatio < -0.15
                  ? "text-loss"
                  : "text-foreground"
              }`}
            >
              {book.imbalanceRatio > 0 ? "+" : ""}
              {book.imbalanceRatio.toFixed(2)}
            </span>
          </span>
          <div className="flex gap-4 font-mono text-[11px]">
            <span className="text-gain">Total Bids: {book.totalBidQty.toLocaleString("en-IN")}</span>
            <span className="text-loss">Total Asks: {book.totalAskQty.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {/* Gauge bar */}
        <div className="relative h-2.5 w-full rounded-full bg-loss/30 overflow-hidden">
          <div
            className="h-full bg-gain transition-all duration-300"
            style={{ width: `${oirPct}%` }}
          />
          {/* Center Zero Marker */}
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-foreground/60" />
        </div>

        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
          <span>-1.0 (Predatory Sell Wall)</span>
          <span>0.0 (Balanced)</span>
          <span>+1.0 (Predatory Buy Absorption)</span>
        </div>
      </div>

      {/* Institutional Sweep Warning Banner */}
      {book.institutionalSweepDetected && (
        <div
          className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs ${
            book.imbalanceTone === "BULLISH_ABSORPTION"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-rose-500/30 bg-rose-500/10 text-rose-400"
          }`}
        >
          <Zap className="size-4 shrink-0 animate-bounce" />
          <p className="font-medium leading-relaxed">{book.sweepMessage}</p>
        </div>
      )}

      {/* 10-Level Depth Ladder Grid */}
      <div className="grid gap-4 sm:grid-cols-2 text-xs font-mono">
        {/* Bid Depth Ladder */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-muted-foreground border-b pb-1 px-1">
            <span>Orders</span>
            <span>Bid Qty</span>
            <span className="text-gain">Bid Price (₹)</span>
          </div>
          <div className="space-y-0.5">
            {book.bids.map((bid, i) => (
              <div
                key={i}
                className="relative flex items-center justify-between px-2 py-1 rounded bg-muted/20 overflow-hidden"
              >
                <div
                  className="absolute inset-y-0 right-0 bg-gain/15 pointer-events-none transition-all duration-200"
                  style={{ width: `${bid.percentage}%` }}
                />
                <span className="text-muted-foreground text-[10px] z-10">{bid.orders}</span>
                <span className="font-semibold text-foreground z-10">{bid.qty}</span>
                <span className="font-bold text-gain z-10">{bid.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Ask Depth Ladder */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-muted-foreground border-b pb-1 px-1">
            <span className="text-loss">Ask Price (₹)</span>
            <span>Ask Qty</span>
            <span>Orders</span>
          </div>
          <div className="space-y-0.5">
            {book.asks.map((ask, i) => (
              <div
                key={i}
                className="relative flex items-center justify-between px-2 py-1 rounded bg-muted/20 overflow-hidden"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-loss/15 pointer-events-none transition-all duration-200"
                  style={{ width: `${ask.percentage}%` }}
                />
                <span className="font-bold text-loss z-10">{ask.price.toFixed(2)}</span>
                <span className="font-semibold text-foreground z-10">{ask.qty}</span>
                <span className="text-muted-foreground text-[10px] z-10">{ask.orders}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
