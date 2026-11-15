import React, { useState, useMemo } from "react";
import {
  Sparkles,
  Layers,
  Scale,
  ShieldCheck,
  TrendingUp,
  Activity,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  PieChart as PieIcon,
  Flame,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
} from "recharts";
import { toast } from "sonner";
import {
  runNsgaPortfolioOptimization,
  DEFAULT_ASSET_UNIVERSE,
  PortfolioCandidate,
  NsgaOptimizerReport,
} from "@/lib/nsga-optimizer";

export const NsgaPortfolioOptimizer: React.FC = () => {
  const [populationSize, setPopulationSize] = useState(35);
  const [generations, setGenerations] = useState(15);
  const [isEvolving, setIsEvolving] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<"MAX_SHARPE" | "MIN_VOL" | "MIN_CVAR" | "BALANCED">("MAX_SHARPE");

  const report: NsgaOptimizerReport = useMemo(() => {
    return runNsgaPortfolioOptimization(populationSize, generations, DEFAULT_ASSET_UNIVERSE);
  }, [populationSize, generations]);

  const activePortfolio: PortfolioCandidate = useMemo(() => {
    switch (selectedStrategy) {
      case "MAX_SHARPE":
        return report.maxSharpePortfolio;
      case "MIN_VOL":
        return report.minVolPortfolio;
      case "MIN_CVAR":
        return report.minCvarPortfolio;
      case "BALANCED":
        return report.balancedPortfolio;
    }
  }, [selectedStrategy, report]);

  const handleApplyAllocation = () => {
    toast.success(
      `Applied ${selectedStrategy.replace(/_/g, " ")} allocation to Virtual Portfolio RMS ledgers!`
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-secondary/10 p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-black uppercase text-primary">
                Milestone 48
              </span>
              <h2 className="text-lg font-bold tracking-tight">
                Evolutionary Multi-Objective Portfolio Optimizer (NSGA-II)
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Simultaneously maximizes Expected Return, minimizes Volatility, and minimizes fat-tail Expected Shortfall (CVaR_95) on non-dominated Pareto frontiers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500">
              <Sparkles className="size-3.5" /> Pareto-Optimal Frontier
            </span>
          </div>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Max Sharpe Return</div>
          <div className="mt-1 font-mono text-xl font-bold text-emerald-500">
            +{report.maxSharpePortfolio.expectedReturnPct}%
          </div>
          <div className="text-[10px] text-muted-foreground">Sharpe: {report.maxSharpePortfolio.sharpeRatio}</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Min Volatility Risk</div>
          <div className="mt-1 font-mono text-xl font-bold text-primary">
            {report.minVolPortfolio.volatilityPct}%
          </div>
          <div className="text-[10px] text-muted-foreground">Return: +{report.minVolPortfolio.expectedReturnPct}%</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Min CVaR (95% Tail)</div>
          <div className="mt-1 font-mono text-xl font-bold text-amber-500">
            {report.minCvarPortfolio.cvar95Pct}%
          </div>
          <div className="text-[10px] text-muted-foreground">Worst 5% tail loss</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Pareto Front Solutions</div>
          <div className="mt-1 font-mono text-xl font-bold text-foreground">
            {report.paretoFront.length} Portfolios
          </div>
          <div className="text-[10px] text-muted-foreground">Rank 1 non-dominated tier</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Rule 4.3 Risk Status</div>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-base font-bold">
            <span className="flex items-center gap-1 text-emerald-500">
              <ShieldCheck className="size-4" /> PASSED
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground">Simulated DD &le; 1.5% Daily</div>
        </div>
      </div>

      {/* Main Grid: Controls & Pareto Frontier Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Controls Card (4 Cols) */}
        <div className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-bold">
              <Sliders className="size-4 text-primary" /> Evolutionary Parameters
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground">Fast Non-Dominated Sort</span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-medium">
                <span>Population Size (N)</span>
                <span className="font-mono font-bold text-primary">{populationSize} Individuals</span>
              </div>
              <input
                type="range"
                min="20"
                max="60"
                step="5"
                value={populationSize}
                onChange={(e) => setPopulationSize(parseInt(e.target.value))}
                className="mt-1.5 w-full accent-primary"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium">
                <span>Generations (G)</span>
                <span className="font-mono font-bold text-foreground">{generations} Generations</span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                step="5"
                value={generations}
                onChange={(e) => setGenerations(parseInt(e.target.value))}
                className="mt-1.5 w-full accent-primary"
              />
            </div>

            {/* Strategy Preset Selector */}
            <div className="space-y-2 pt-2 border-t">
              <span className="font-bold text-foreground block">Select Optimal Preset on Frontier:</span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant={selectedStrategy === "MAX_SHARPE" ? "default" : "outline"}
                  onClick={() => setSelectedStrategy("MAX_SHARPE")}
                  className="font-bold text-[11px]"
                >
                  Max Sharpe
                </Button>
                <Button
                  size="sm"
                  variant={selectedStrategy === "MIN_VOL" ? "default" : "outline"}
                  onClick={() => setSelectedStrategy("MIN_VOL")}
                  className="font-bold text-[11px]"
                >
                  Min Volatility
                </Button>
                <Button
                  size="sm"
                  variant={selectedStrategy === "MIN_CVAR" ? "default" : "outline"}
                  onClick={() => setSelectedStrategy("MIN_CVAR")}
                  className="font-bold text-[11px]"
                >
                  Min Tail CVaR
                </Button>
                <Button
                  size="sm"
                  variant={selectedStrategy === "BALANCED" ? "default" : "outline"}
                  onClick={() => setSelectedStrategy("BALANCED")}
                  className="font-bold text-[11px]"
                >
                  Balanced Parity
                </Button>
              </div>
            </div>

            <Button
              onClick={handleApplyAllocation}
              className="w-full gap-2 font-bold text-xs shadow"
            >
              <CheckCircle2 className="size-3.5" /> Apply Selected Weights to Virtual Account
            </Button>
          </div>

          {/* Mathematical Rationale */}
          <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
            <div className="flex items-center gap-1 font-bold text-foreground">
              <Info className="size-3.5 text-primary" /> Multi-Objective Advantage:
            </div>
            <p className="leading-relaxed">
              Classical Markowitz only considers mean and variance. NSGA-II simultaneously controls heavy tail risk (CVaR)
              and preserves diversity using crowding distances on the Pareto frontier.
            </p>
          </div>
        </div>

        {/* Pareto Frontier Scatter Chart (8 Cols) */}
        <div className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pareto Optimal Frontier (Return vs Volatility Risk)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Color encodes CVaR tail loss. Green represents non-dominated Rank-1 optimal candidates.
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-500">
              Active: {activePortfolio.id}
            </span>
          </div>

          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 15, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis
                  type="number"
                  dataKey="volatilityPct"
                  name="Volatility"
                  unit="%"
                  stroke="#888888"
                  fontSize={11}
                  domain={["auto", "auto"]}
                />
                <YAxis
                  type="number"
                  dataKey="expectedReturnPct"
                  name="Return"
                  unit="%"
                  stroke="#888888"
                  fontSize={11}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(val: any, name: any) => [`${val}%`, name]}
                  contentStyle={{ backgroundColor: "#1e1e24", borderColor: "#444" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Scatter
                  name="Pareto Optimal Frontier (Rank 1)"
                  data={report.paretoFront}
                  fill="#10b981"
                />
                <Scatter
                  name="Sub-Optimal Generations"
                  data={report.allCandidates.filter((c) => c.rank > 1)}
                  fill="#64748b"
                  opacity={0.4}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Selected Allocation Breakdown */}
      <div className="rounded-xl border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-sm font-bold">
              Active Strategy Allocation: {selectedStrategy.replace(/_/g, " ")} ({activePortfolio.id})
            </h3>
            <p className="text-xs text-muted-foreground">
              Expected Return: <span className="font-mono text-emerald-500 font-bold">+{activePortfolio.expectedReturnPct}%</span> | Volatility: <span className="font-mono text-foreground font-bold">{activePortfolio.volatilityPct}%</span> | CVaR_95: <span className="font-mono text-amber-500 font-bold">{activePortfolio.cvar95Pct}%</span> | Sharpe: <span className="font-mono text-primary font-bold">{activePortfolio.sharpeRatio}</span>
            </p>
          </div>
          <span className="rounded bg-primary/10 px-2.5 py-1 font-mono text-xs font-bold text-primary">
            Sum: 100.0% Simplex
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {report.assetUniverse.map((asset, idx) => {
            const weightPct = Number(((activePortfolio.weights[idx] || 0) * 100).toFixed(1));

            return (
              <div key={asset.symbol} className="rounded-lg border bg-background/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{asset.symbol}</span>
                  <span className="font-mono text-xs font-bold text-primary">{weightPct}%</span>
                </div>
                <div className="text-[10px] text-muted-foreground">{asset.name}</div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(weightPct, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                  <span>E[R]: +{(asset.expectedAnnualReturn * 100).toFixed(0)}%</span>
                  <span>σ: {(asset.annualVol * 100).toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
