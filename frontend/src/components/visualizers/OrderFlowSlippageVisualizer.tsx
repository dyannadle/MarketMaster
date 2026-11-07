import { useState, useMemo } from "react";
import { Layers, ArrowDownUp, Info } from "lucide-react";
import { inr } from "@/lib/data";

export function OrderFlowSlippageVisualizer() {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [qty, setQty] = useState(500); // 10 lots of Nifty
  const [basePrice, setBasePrice] = useState(24500.0);

  // Microstructure Constants (matching backend MatchingEngine)
  const baseDepth = 2500.0;
  const k = 0.0005;
  const alpha = 0.6;

  // Power-law slippage calculation: slippage_pct = k * (qty / depth)^alpha
  const { slippagePts, executionPrice, slippagePct, taxes, totalFriction } = useMemo(() => {
    const ratio = Math.max(qty / baseDepth, 0.001);
    const slipPct = k * Math.pow(ratio, alpha);
    const pts = Math.round(basePrice * slipPct * 100) / 100;

    const fillPrice = side === "BUY" ? basePrice + pts : basePrice - pts;
    const turnover = qty * fillPrice;

    // Statutory deductions (NSE Futures rules)
    const stt = side === "SELL" ? turnover * 0.000125 : 0.0; // 0.0125% on sell side
    const stampDuty = side === "BUY" ? turnover * 0.00002 : 0.0; // 0.002% on buy side
    const exchangeCharge = turnover * 0.000019; // 0.0019% NSE charge
    const sebiCharge = turnover * 0.000001; // ₹10 per crore
    const gst = (exchangeCharge) * 0.18; // 18% GST on exchange fees
    const totalTaxes = stt + stampDuty + exchangeCharge + sebiCharge + gst;

    const slippageCost = pts * qty;
    const friction = slippageCost + totalTaxes;

    return {
      slippagePts: pts,
      executionPrice: fillPrice,
      slippagePct: slipPct * 100,
      taxes: {
        stt,
        stampDuty,
        exchangeCharge,
        gst,
        sebiCharge,
        totalTaxes,
      },
      totalFriction: friction,
    };
  }, [qty, side, basePrice]);

  // Dynamic Level-2 Order Book simulation based on quantity consumption
  const bookLadder = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const step = (i + 1) * 0.5;
      const bidPx = basePrice - step;
      const askPx = basePrice + step;
      const bidVol = Math.round(300 + ((i * 47) % 300) * 2.5);
      const askVol = Math.round(320 + ((i * 59) % 300) * 2.2);

      return {
        level: i + 1,
        bidPx,
        bidVol,
        askPx,
        askVol,
      };
    });
  }, [basePrice]);

  return (
    <div className="space-y-6 rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/60 p-5 md:p-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-5 w-5 text-purple-400" />
            Market Microstructure & Power-Law Slippage Simulator
          </h3>
          <p className="text-xs text-muted-foreground">
            Non-linear queue depth matching: $Slippage = k \times (Q/D)^\alpha$ with official NSE statutory deductions.
          </p>
        </div>
        <div className="flex rounded-lg bg-muted p-1 text-xs">
          <button
            onClick={() => setSide("BUY")}
            className={`rounded-md px-3 py-1 font-semibold transition-all ${
              side === "BUY" ? "bg-emerald-500 text-white shadow" : "text-muted-foreground"
            }`}
          >
            BUY ORDER
          </button>
          <button
            onClick={() => setSide("SELL")}
            className={`rounded-md px-3 py-1 font-semibold transition-all ${
              side === "SELL" ? "bg-rose-500 text-white shadow" : "text-muted-foreground"
            }`}
          >
            SELL ORDER
          </button>
        </div>
      </div>

      {/* Quantity & Base Price Controls */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border/40 bg-background/50 p-4">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Order Quantity ({Math.round(qty / 50)} Lots)</span>
            <span className="num font-bold text-foreground">{qty} Contracts</span>
          </div>
          <input
            type="range"
            min={50}
            max={3000}
            step={50}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>1 Lot (50)</span>
            <span>20 Lots (1,000)</span>
            <span>60 Lots (3,000)</span>
          </div>
        </div>

        <div className="rounded-xl border border-border/40 bg-background/50 p-4">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Mid-Market Reference Price (LTP)</span>
            <span className="num font-bold text-foreground">₹{basePrice.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={24000}
            max={25000}
            step={10}
            value={basePrice}
            onChange={(e) => setBasePrice(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>₹24,000</span>
            <span>₹24,500</span>
            <span>₹25,000</span>
          </div>
        </div>
      </div>

      {/* Execution Telemetry Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
          <span className="text-[10px] text-muted-foreground uppercase font-medium">Effective Fill Price</span>
          <p className="num mt-1 text-2xl font-black text-primary">₹{executionPrice.toFixed(2)}</p>
          <span className={`text-[10px] font-semibold ${side === "BUY" ? "text-rose-400" : "text-amber-400"}`}>
            {side === "BUY" ? `+₹${slippagePts.toFixed(2)} adverse` : `-₹${slippagePts.toFixed(2)} adverse`}
          </span>
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-center">
          <span className="text-[10px] text-muted-foreground uppercase font-medium">Slippage Impact</span>
          <p className="num mt-1 text-2xl font-black text-rose-400">{inr(slippagePts * qty)}</p>
          <span className="text-[10px] text-muted-foreground">{slippagePct.toFixed(3)}% price drift</span>
        </div>

        <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 text-center">
          <span className="text-[10px] text-muted-foreground uppercase font-medium">Statutory Taxes (STT/GST)</span>
          <p className="num mt-1 text-2xl font-black text-foreground">{inr(taxes.totalTaxes)}</p>
          <span className="text-[10px] text-muted-foreground">
            {side === "SELL" ? "STT (0.0125%) included" : "Stamp Duty (0.002%)"}
          </span>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
          <span className="text-[10px] text-amber-400 uppercase font-medium">Total Friction Drag</span>
          <p className="num mt-1 text-2xl font-black text-amber-400">{inr(totalFriction)}</p>
          <span className="text-[10px] text-muted-foreground">Slippage + Taxes</span>
        </div>
      </div>

      {/* Visual Level-2 Order Book Ladder */}
      <div className="rounded-xl border border-border/40 bg-background/50 p-4">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <ArrowDownUp className="h-4 w-4 text-primary" /> Live Level-2 Depth Ladder (NSE Bid/Ask Queue)
          </span>
          <span className="text-muted-foreground">Order Size: <span className="text-foreground font-semibold">{qty} qty</span></span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          {/* Bids */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-muted-foreground border-b border-border/40 pb-1">
              <span>BID QTY</span>
              <span>PRICE</span>
            </div>
            {bookLadder.map((b) => (
              <div key={b.level} className="flex justify-between py-1 px-2 rounded bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                <span className="num font-mono text-emerald-400">{b.bidVol}</span>
                <span className="num font-bold text-emerald-400">₹{b.bidPx.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Asks */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-muted-foreground border-b border-border/40 pb-1">
              <span>PRICE</span>
              <span>ASK QTY</span>
            </div>
            {bookLadder.map((b) => (
              <div key={b.level} className="flex justify-between py-1 px-2 rounded bg-rose-500/5 hover:bg-rose-500/10 transition-colors">
                <span className="num font-bold text-rose-400">₹{b.askPx.toFixed(2)}</span>
                <span className="num font-mono text-rose-400">{b.askVol}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg bg-secondary/30 p-2.5 text-[11px] text-muted-foreground">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <span>
            Large market orders sweep through multiple price tiers. As your order size ({qty}) approaches top depth (320), you cause an immediate price push. Limit orders avoid slippage but incur queue-priority execution risk.
          </span>
        </div>
      </div>
    </div>
  );
}
