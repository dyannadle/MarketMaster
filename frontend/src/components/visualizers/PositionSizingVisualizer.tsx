import { useState } from "react";
import { AlertTriangle, CheckCircle, ShieldCheck } from "lucide-react";
import { inr } from "@/lib/data";

interface InstrumentConfig {
  symbol: string;
  name: string;
  lot: number;
  defaultPrice: number;
  defaultSL: number;
  defaultTarget: number;
}

const INSTRUMENTS: InstrumentConfig[] = [
  { symbol: "NIFTY_FUT", name: "Nifty 50 Index Futures", lot: 50, defaultPrice: 24500, defaultSL: 24400, defaultTarget: 24750 },
  { symbol: "BANKNIFTY_FUT", name: "Bank Nifty Futures", lot: 15, defaultPrice: 52100, defaultSL: 51850, defaultTarget: 52650 },
  { symbol: "FINNIFTY_FUT", name: "Fin Nifty Futures", lot: 40, defaultPrice: 23400, defaultSL: 23300, defaultTarget: 23650 },
];

export function PositionSizingVisualizer() {
  const [capital, setCapital] = useState(1000000); // ₹10 Lakhs
  const [riskPct, setRiskPct] = useState(1.5); // 1.5% Rule
  const [selectedSymbol, setSelectedSymbol] = useState("NIFTY_FUT");
  
  const currentInst = INSTRUMENTS.find((i) => i.symbol === selectedSymbol) || INSTRUMENTS[0]!;
  const [entryPrice, setEntryPrice] = useState(currentInst.defaultPrice);
  const [slPrice, setSlPrice] = useState(currentInst.defaultSL);
  const [targetPrice, setTargetPrice] = useState(currentInst.defaultTarget);

  // Switch instrument defaults
  const handleSelectInst = (inst: InstrumentConfig) => {
    setSelectedSymbol(inst.symbol);
    setEntryPrice(inst.defaultPrice);
    setSlPrice(inst.defaultSL);
    setTargetPrice(inst.defaultTarget);
  };

  // Mathematical Calculations
  const maxRiskAmount = (capital * riskPct) / 100;
  const slDistance = Math.max(1, Math.abs(entryPrice - slPrice));
  const targetDistance = Math.max(1, Math.abs(targetPrice - entryPrice));
  const riskRewardRatio = (targetDistance / slDistance).toFixed(2);

  // Max quantity based purely on risk budget
  const rawMaxQty = Math.floor(maxRiskAmount / slDistance);
  // Quantized to lot size
  const maxLots = Math.max(0, Math.floor(rawMaxQty / currentInst.lot));
  const effectiveQty = maxLots * currentInst.lot;
  const actualRiskAmount = effectiveQty * slDistance;
  const potentialProfit = effectiveQty * targetDistance;
  
  // Approximate Exchange Initial Margin (10% SPAN + Exposure)
  const turnover = effectiveQty * entryPrice;
  const marginRequired = turnover * 0.10;
  const marginAvailable = capital >= marginRequired;

  const isRuleViolated = riskPct > 1.5;

  return (
    <div className="space-y-6 rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/60 p-5 md:p-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            Institutional Position Sizing & 1.5% Risk Engine
          </h3>
          <p className="text-xs text-muted-foreground">
            Strict capital preservation model enforcing Rule 4.3 ($R_{trade} \le 1.5\%$) on Indian Derivative Contracts.
          </p>
        </div>
        {isRuleViolated ? (
          <span className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400">
            <AlertTriangle className="h-3.5 w-3.5" /> Rule 4.3 Alert: &gt;1.5% Risk
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <CheckCircle className="h-3.5 w-3.5" /> Safe Sizing Invariant Active
          </span>
        )}
      </div>

      {/* Instrument Selection */}
      <div className="flex flex-wrap gap-2">
        {INSTRUMENTS.map((inst) => (
          <button
            key={inst.symbol}
            onClick={() => handleSelectInst(inst)}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
              selectedSymbol === inst.symbol
                ? "bg-primary text-primary-foreground shadow-md"
                : "border border-border/50 bg-secondary/30 text-muted-foreground hover:bg-secondary/60"
            }`}
          >
            {inst.symbol} <span className="opacity-75">· Lot {inst.lot}</span>
          </button>
        ))}
      </div>

      {/* Sliders and Controls Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Capital and Risk Sliders */}
        <div className="space-y-4 rounded-xl border border-border/40 bg-background/50 p-4">
          <div>
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground">Virtual Trading Capital</span>
              <span className="num font-bold text-foreground">{inr(capital)}</span>
            </div>
            <input
              type="range"
              min={100000}
              max={5000000}
              step={50000}
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              className="mt-2 w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>₹1 Lakh</span>
              <span>₹25 Lakhs</span>
              <span>₹50 Lakhs</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium">
              <span className="text-muted-foreground">Max Capital Risk per Trade</span>
              <span className={`num font-bold ${isRuleViolated ? "text-rose-400" : "text-emerald-400"}`}>
                {riskPct.toFixed(1)}% ({inr(maxRiskAmount)})
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={3.0}
              step={0.1}
              value={riskPct}
              onChange={(e) => setRiskPct(Number(e.target.value))}
              className="mt-2 w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0.5% (Conservative)</span>
              <span className="text-amber-400 font-semibold">1.5% (Rule 4.3 Limit)</span>
              <span>3.0% (Reckless)</span>
            </div>
          </div>
        </div>

        {/* Right: Price & Stop Loss Inputs */}
        <div className="space-y-3 rounded-xl border border-border/40 bg-background/50 p-4">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Planned Entry</label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(Math.max(1, Number(e.target.value)))}
                className="num mt-1 w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-sm font-semibold"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-rose-400">Stop Loss (SL)</label>
              <input
                type="number"
                value={slPrice}
                onChange={(e) => setSlPrice(Math.max(1, Number(e.target.value)))}
                className="num mt-1 w-full rounded-md border border-rose-500/30 bg-card px-2.5 py-1.5 text-sm font-semibold text-rose-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-emerald-400">Target (TP)</label>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(Math.max(1, Number(e.target.value)))}
                className="num mt-1 w-full rounded-md border border-emerald-500/30 bg-card px-2.5 py-1.5 text-sm font-semibold text-emerald-400"
              />
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-secondary/30 p-2 text-center">
              <span className="text-muted-foreground">Risk Distance: </span>
              <span className="font-semibold text-rose-400">{slDistance} pts</span>
            </div>
            <div className="rounded-lg bg-secondary/30 p-2 text-center">
              <span className="text-muted-foreground">Reward Distance: </span>
              <span className="font-semibold text-emerald-400">{targetDistance} pts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sizing Recommendations Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Recommended Lots</p>
          <p className="num mt-1 text-2xl font-black text-primary">{maxLots} Lots</p>
          <p className="text-[10px] text-muted-foreground">{effectiveQty} contracts</p>
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-center">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Actual Risk at SL</p>
          <p className="num mt-1 text-2xl font-black text-rose-400">{inr(actualRiskAmount)}</p>
          <p className="text-[10px] text-muted-foreground">{((actualRiskAmount / capital) * 100).toFixed(2)}% of capital</p>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Potential Reward</p>
          <p className="num mt-1 text-2xl font-black text-emerald-400">{inr(potentialProfit)}</p>
          <p className="text-[10px] text-muted-foreground">R:R Ratio 1:{riskRewardRatio}</p>
        </div>

        <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 text-center">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Required Margin</p>
          <p className={`num mt-1 text-2xl font-black ${marginAvailable ? "text-foreground" : "text-amber-400"}`}>
            {inr(marginRequired)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {marginAvailable ? "✓ Fully Covered" : "⚠ Exceeds Capital"}
          </p>
        </div>
      </div>

      {/* Sizing Logic Formula Box */}
      <div className="rounded-xl border border-border/40 bg-secondary/10 p-3.5 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">Institutional Position Sizing Invariant:</p>
        <code className="text-primary font-mono text-[11px] block bg-background/80 p-2 rounded border border-border/50">
          Lots = floor( (Capital × Risk%) / (|Entry - StopLoss| × LotSize) )
        </code>
        <p className="mt-1 text-[11px]">
          Even if your conviction is high, never increase lot size beyond the risk equation. Position size protects you against ruin, while edge produces alpha.
        </p>
      </div>
    </div>
  );
}
