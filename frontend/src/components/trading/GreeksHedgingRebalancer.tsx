import { useState, useMemo } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  TrendingUp,
  Scale,
  Sliders,
  ArrowRight,
  Info,
  DollarSign,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  solveHedgingPlan,
  SAMPLE_OPTIONS_PORTFOLIO,
  GreeksHedgingPlan,
  PositionGreeks,
} from "@/lib/greeks-hedging";

interface GreeksHedgingRebalancerProps {
  initialPositions?: PositionGreeks[];
  spotPrice?: number;
  onExecuteHedge?: (plan: GreeksHedgingPlan) => void;
}

export function GreeksHedgingRebalancer({
  initialPositions = SAMPLE_OPTIONS_PORTFOLIO,
  spotPrice = 24500,
  onExecuteHedge,
}: GreeksHedgingRebalancerProps) {
  const [positions, setPositions] = useState<PositionGreeks[]>(initialPositions);
  const [hedgingMode, setHedgingMode] = useState<"DELTA_ONLY" | "DELTA_GAMMA">("DELTA_ONLY");
  const [toleranceCorridor, setToleranceCorridor] = useState<number>(50);

  // Compute hedging plan
  const plan: GreeksHedgingPlan = useMemo(() => {
    return solveHedgingPlan(positions, hedgingMode, 25, spotPrice);
  }, [positions, hedgingMode, spotPrice]);

  // Execute Rebalance Simulation
  const handleExecuteRebalance = () => {
    if (plan.recommendations.length === 0) {
      toast.info("Portfolio already within delta corridor. Zero rebalancing required.");
      return;
    }

    // Apply recommended trades to virtual portfolio
    const updatedPositions = [...positions];
    plan.recommendations.forEach((rec) => {
      const existing = updatedPositions.find((p) => p.symbol === rec.instrument);
      const signedQty = rec.action === "BUY" ? rec.qty : -rec.qty;

      if (existing) {
        existing.qty += signedQty;
      } else {
        updatedPositions.push({
          symbol: rec.instrument,
          assetType: rec.assetType,
          qty: signedQty,
          ltp: rec.estimatedPrice,
          delta: rec.assetType === "FUTURES" ? 1.0 : 0.50,
          gamma: rec.assetType === "FUTURES" ? 0 : 0.0012,
          theta: rec.assetType === "FUTURES" ? 0 : -15,
          vega: rec.assetType === "FUTURES" ? 0 : 18,
        });
      }
    });

    setPositions(updatedPositions);
    if (onExecuteHedge) onExecuteHedge(plan);
    toast.success(
      `Dynamic Hedge Executed! Portfolio Net Delta brought to ${plan.projectedGreeks.postHedgeDelta.toFixed(1)}.`
    );
  };

  const isBreached = Math.abs(plan.baselineGreeks.netDelta) > toleranceCorridor;

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-primary" /> Dynamic Delta-Neutral Options Greeks Rebalancer
            </h2>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                isBreached
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"
                  : "bg-gain/10 text-gain border border-gain/20"
              }`}
            >
              {isBreached ? "CORRIDOR BREACH: REBALANCE REQUIRED" : "GREEKS BALANCED"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated Delta ($\Delta$) and Gamma ($\Gamma$) neutrality solver with institutional corridor monitoring ($|\Delta| \le {toleranceCorridor}$).
          </p>
        </div>

        {/* Hedging Mode Switcher */}
        <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/40 p-1 text-xs">
          <button
            onClick={() => setHedgingMode("DELTA_ONLY")}
            className={`rounded-md px-2.5 py-1 font-bold transition-all ${
              hedgingMode === "DELTA_ONLY" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Delta Neutral (Futures)
          </button>
          <button
            onClick={() => setHedgingMode("DELTA_GAMMA")}
            className={`rounded-md px-2.5 py-1 font-bold transition-all ${
              hedgingMode === "DELTA_GAMMA" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Delta-Gamma Neutral (Dual)
          </button>
        </div>
      </div>

      {/* Delta Tolerance Gauge & Net Greeks Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <div className="flex justify-between items-center text-[10px] uppercase font-bold text-muted-foreground">
            <span>Net Portfolio Delta (Δ)</span>
            <span>Target 0.0</span>
          </div>
          <p className={`num text-xl font-black mt-0.5 ${isBreached ? "text-rose-400" : "text-gain"}`}>
            {plan.baselineGreeks.netDelta >= 0 ? "+" : ""}{plan.baselineGreeks.netDelta}
          </p>
          <span className="text-[10px] text-muted-foreground">Corridor: ±{toleranceCorridor} units</span>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Net Gamma (Γ)</span>
          <p className="num text-xl font-black text-foreground mt-0.5">
            {plan.baselineGreeks.netGamma.toFixed(4)}
          </p>
          <span className="text-[10px] text-muted-foreground">Delta curvature rate</span>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Net Theta (Decay / Day)</span>
          <p className={`num text-xl font-black mt-0.5 ${plan.baselineGreeks.netTheta >= 0 ? "text-gain" : "text-rose-400"}`}>
            {plan.baselineGreeks.netTheta >= 0 ? "+" : ""}₹{plan.baselineGreeks.netTheta.toFixed(0)}
          </p>
          <span className="text-[10px] text-muted-foreground">Daily time value decay</span>
        </div>

        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Net Vega (₹ / 1 pt IV)</span>
          <p className="num text-xl font-black text-sky-400 mt-0.5">
            {plan.baselineGreeks.netVega >= 0 ? "+" : ""}₹{plan.baselineGreeks.netVega.toFixed(0)}
          </p>
          <span className="text-[10px] text-muted-foreground">Sensitivity to volatility</span>
        </div>
      </div>

      {/* Recommended Child Hedge Orders */}
      <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-400" />
            <h3 className="text-xs font-black uppercase text-foreground">
              Automated Rebalancing Recommendations
            </h3>
          </div>

          <button
            onClick={handleExecuteRebalance}
            disabled={plan.recommendations.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Execute Dynamic Rebalance
          </button>
        </div>

        {plan.recommendations.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Portfolio Greeks are currently within tolerance. No hedge orders needed.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-border/60 bg-muted/40 text-[10px] font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">Action</th>
                  <th className="p-2">Instrument</th>
                  <th className="p-2 text-right">Lots</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">Est. Price</th>
                  <th className="p-2 text-right">Δ Contribution</th>
                  <th className="p-2 text-right">Cost (Slippage + Tax)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {plan.recommendations.map((rec, idx) => (
                  <tr key={idx} className="hover:bg-muted/20">
                    <td className="p-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          rec.action === "BUY" ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
                        }`}
                      >
                        {rec.action}
                      </span>
                    </td>
                    <td className="p-2 font-bold text-foreground">{rec.instrument}</td>
                    <td className="p-2 text-right font-bold text-foreground">{rec.lots} lots</td>
                    <td className="p-2 text-right text-muted-foreground">{rec.qty}</td>
                    <td className="p-2 text-right font-bold text-foreground">₹{rec.estimatedPrice.toFixed(2)}</td>
                    <td className="p-2 text-right text-emerald-400 font-bold">
                      {rec.deltaContribution >= 0 ? "+" : ""}{rec.deltaContribution}
                    </td>
                    <td className="p-2 text-right text-muted-foreground font-bold">
                      ₹{rec.totalCost.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hedging Efficiency & Basis Drag Analytics */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-primary" /> Institutional Hedging Efficiency & Basis Drag
          </span>
          <span className="text-[10px] text-muted-foreground">Rule 4.3 Risk Mitigation Audit</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div>
            <span className="text-[10px] text-muted-foreground">Unhedged 1-Day 99% VaR:</span>
            <p className="font-mono font-bold text-rose-400">₹{plan.unhedgedRisk.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">Hedged Residual Variance:</span>
            <p className="font-mono font-bold text-emerald-400">₹{plan.residualRisk.toLocaleString("en-IN")}</p>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">Hedging Efficiency:</span>
            <p className="font-mono font-bold text-gain">{plan.hedgingEfficiencyPct}% Risk Eliminated</p>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground">Basis Drag Impact:</span>
            <p className="font-mono font-bold text-foreground">{plan.basisDragBps} bps (₹{plan.totalHedgingCost})</p>
          </div>
        </div>
      </div>
    </div>
  );
}
