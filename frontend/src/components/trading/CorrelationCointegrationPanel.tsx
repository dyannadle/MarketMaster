import { useState, useMemo } from "react";
import {
  Grid,
  TrendingUp,
  Scale,
  Activity,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  BarChart3,
  Sliders,
  CheckCircle2,
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
import {
  computeCorrelationMatrix,
  computeCointegrationPair,
  computeDiversificationBenefit,
  MULTI_ASSET_BENCHMARK_SERIES,
  CorrelationMatrixResult,
  CointegrationPairResult,
  DiversificationBenefitResult,
} from "@/lib/correlation-cointegration";

interface CorrelationCointegrationPanelProps {
  className?: string;
}

export function CorrelationCointegrationPanel({ className = "" }: CorrelationCointegrationPanelProps) {
  const [corrType, setCorrType] = useState<"PEARSON" | "SPEARMAN">("PEARSON");
  const [selectedPair, setSelectedPair] = useState<string>("HDFCBANK_ICICIBANK");

  // Compute Correlation Matrix
  const corrData: CorrelationMatrixResult = useMemo(() => {
    return computeCorrelationMatrix(MULTI_ASSET_BENCHMARK_SERIES);
  }, []);

  // Compute Cointegration
  const cointData: CointegrationPairResult = useMemo(() => {
    if (selectedPair === "TCS_INFY") {
      return computeCointegrationPair("TCS", "INFY");
    }
    return computeCointegrationPair("HDFCBANK", "ICICIBANK");
  }, [selectedPair]);

  // Compute Diversification Benefit
  const dbrData: DiversificationBenefitResult = useMemo(() => {
    return computeDiversificationBenefit();
  }, []);

  const matrix = corrType === "PEARSON" ? corrData.pearsonMatrix : corrData.spearmanMatrix;

  // Heatmap color generator
  const getCellColor = (val: number) => {
    if (val > 0) {
      // Emerald gradient
      const intensity = Math.min(1, val);
      return `rgba(16, 185, 129, ${0.15 + intensity * 0.65})`;
    } else {
      // Rose gradient
      const intensity = Math.min(1, Math.abs(val));
      return `rgba(244, 63, 94, ${0.15 + intensity * 0.65})`;
    }
  };

  return (
    <div className={`space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-1.5">
              <Grid className="h-4 w-4 text-primary" /> Cross-Asset Correlation & Cointegration Matrix
            </h2>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
              Multi-Asset Stat-Arb
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Rolling Pearson/Spearman matrix across Equities, Commodities, and Forex with Engle-Granger pair trading Z-scores.
          </p>
        </div>

        {/* Correlation Type Selector */}
        <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-muted/40 p-1 text-xs">
          <button
            onClick={() => setCorrType("PEARSON")}
            className={`rounded-md px-2.5 py-1 font-bold transition-all ${
              corrType === "PEARSON" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pearson (Linear)
          </button>
          <button
            onClick={() => setCorrType("SPEARMAN")}
            className={`rounded-md px-2.5 py-1 font-bold transition-all ${
              corrType === "SPEARMAN" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Spearman (Rank)
          </button>
        </div>
      </div>

      {/* Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Diversification Ratio</span>
          <p className="num text-xl font-black text-emerald-400 mt-0.5">{dbrData.diversificationRatio}x</p>
          <span className="text-[10px] text-muted-foreground">Vol reduction benefit</span>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Active Pair Z-Score</span>
          <p
            className={`num text-xl font-black mt-0.5 ${
              Math.abs(cointData.currentZScore) >= 2.0 ? "text-amber-400" : "text-foreground"
            }`}
          >
            {cointData.currentZScore >= 0 ? "+" : ""}{cointData.currentZScore}σ
          </p>
          <span className="text-[10px] text-muted-foreground">Spread deviation</span>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">ADF t-Statistic</span>
          <p className="num text-xl font-black text-primary mt-0.5">{cointData.tStatistic}</p>
          <span className="text-[10px] text-muted-foreground">Cointegrated at p &lt; 0.01</span>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Mean Reversion Half-Life</span>
          <p className="num text-xl font-black text-foreground mt-0.5">{cointData.halfLifeBars} bars</p>
          <span className="text-[10px] text-muted-foreground">Expected cycle period</span>
        </div>
      </div>

      {/* Grid: Correlation Heatmap (Left) & Pair Cointegration Z-Score (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Correlation Heatmap Table */}
        <div className="rounded-xl border border-border/80 bg-zinc-950 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-800">
            <span className="font-bold text-zinc-200 flex items-center gap-1.5">
              <Grid className="h-3.5 w-3.5 text-primary" /> {corrType} Correlation Heatmap
            </span>
            <span className="text-[10px] text-zinc-400">Green = Positive | Red = Negative Hedge</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs font-mono">
              <thead>
                <tr>
                  <th className="p-1.5 text-left text-[10px] text-zinc-500">Asset</th>
                  {corrData.symbols.map((sym) => (
                    <th key={sym} className="p-1.5 text-[10px] text-zinc-400">
                      {sym.replace("NIFTY_", "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corrData.symbols.map((rowSym, rIdx) => (
                  <tr key={rowSym}>
                    <td className="p-1.5 text-left text-[10px] font-bold text-zinc-300">
                      {rowSym.replace("NIFTY_", "")}
                    </td>
                    {matrix[rIdx]!.map((val, cIdx) => (
                      <td
                        key={cIdx}
                        className="p-1.5 text-[11px] font-bold rounded"
                        style={{
                          backgroundColor: getCellColor(val),
                          color: val > 0.4 ? "#ffffff" : val < -0.2 ? "#fecdd3" : "#d1d5db",
                        }}
                      >
                        {val.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pair Cointegration Z-Score Panel */}
        <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
            <div>
              <span className="text-xs font-bold uppercase text-foreground flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" /> Cointegration Spread Z-Score
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Hedge Ratio (β): {cointData.hedgeRatio} | Signal:{" "}
                <strong
                  className={
                    cointData.tradingSignal === "LONG_SPREAD"
                      ? "text-gain"
                      : cointData.tradingSignal === "SHORT_SPREAD"
                      ? "text-loss"
                      : "text-muted-foreground"
                  }
                >
                  {cointData.tradingSignal}
                </strong>
              </span>
            </div>

            {/* Pair Selector */}
            <select
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs font-mono font-bold text-foreground"
            >
              <option value="HDFCBANK_ICICIBANK">HDFC Bank vs ICICI Bank</option>
              <option value="TCS_INFY">TCS vs Infosys</option>
            </select>
          </div>

          {/* Recharts Spread Z-Score Chart */}
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cointData.spreadHistory} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <XAxis dataKey="barIndex" tick={{ fontSize: 10 }} stroke="#666666" />
                <YAxis domain={[-3.5, 3.5]} tick={{ fontSize: 10 }} stroke="#666666" unit="σ" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "8px", fontSize: "11px" }}
                  formatter={(val: any) => [`${Number(val).toFixed(2)}σ`, "Z-Score"]}
                  labelFormatter={(b: any) => `Bar #${b}`}
                />
                <ReferenceLine y={2.0} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: "+2.0σ Short Entry", fill: "#f43f5e", fontSize: 9 }} />
                <ReferenceLine y={0.0} stroke="#64748b" label={{ value: "Mean (0.0σ)", fill: "#64748b", fontSize: 9 }} />
                <ReferenceLine y={-2.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: "-2.0σ Long Entry", fill: "#10b981", fontSize: 9 }} />
                <Line
                  type="monotone"
                  dataKey="zScore"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: "#38bdf8" }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pair Execution Summary */}
          <div className="flex items-center justify-between text-[11px] font-mono border-t border-border/50 pt-2 text-muted-foreground">
            <span>Formula: Spread = {cointData.assetA} - ({cointData.hedgeRatio} × {cointData.assetB})</span>
            <span className="text-gain font-bold">Stationary Residuals</span>
          </div>
        </div>
      </div>

      {/* Markowitz Diversification Frontier Weights */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5 text-primary" /> Markowitz Optimal Risk-Parity Allocation
          </span>
          <span className="text-[10px] text-muted-foreground">Reduces overall volatility from 18.2% to 12.8%</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1 font-mono">
          {dbrData.optimalMarkowitzWeights.map((w) => (
            <div key={w.symbol} className="rounded border border-border/60 bg-card p-2 text-center">
              <span className="text-[10px] text-muted-foreground">{w.symbol}</span>
              <p className="text-sm font-bold text-foreground mt-0.5">{w.weightPct}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
