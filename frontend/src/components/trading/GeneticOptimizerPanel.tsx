// Milestone 21: Genetic Algorithm Strategy Parameter Optimizer Panel
// Evolutionary parameter optimization for Strategy Lab with real-time convergence tracking.

import { useState } from "react";
import {
  Sparkles,
  Play,
  RotateCcw,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  Activity,
  Layers,
  ArrowRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  runGeneticOptimizer,
  OptimizationResult,
  StrategyChromosome,
} from "@/lib/genetic-optimizer";
import { seededSeries } from "@/lib/data";

interface Props {
  onApplyParameters: (params: {
    fast: number;
    slow: number;
    atrMultiplier: number;
    riskPerTrade: number;
  }) => void;
}

export function GeneticOptimizerPanel({ onApplyParameters }: Props) {
  const [popSize, setPopSize] = useState<number>(20);
  const [generations, setGenerations] = useState<number>(10);
  const [mutationRate, setMutationRate] = useState<number>(0.25);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);

  const handleRunOptimizer = () => {
    setIsRunning(true);

    // Yield main thread slightly so UI renders loading state
    setTimeout(() => {
      // Use seeded series or default synthetic series
      const series = seededSeries(42, 60, 24500, 0.012).map((p) => p.v);
      const optResult = runGeneticOptimizer(series, {
        populationSize: popSize,
        generations,
        mutationRate,
      });

      setResult(optResult);
      setIsRunning(false);
    }, 150);
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-foreground">Genetic Algorithm Strategy Optimizer</h3>
              <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[9px] font-mono font-bold text-primary">
                PYODIDE / IN-BROWSER EVOLUTION
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Automatically evolves Dual EMA & ATR trailing stops maximizing Calmar Ratio & Rule 4.3 compliance
            </p>
          </div>
        </div>

        <Button
          onClick={handleRunOptimizer}
          disabled={isRunning}
          className="gap-2 font-bold text-xs"
        >
          {isRunning ? (
            <>
              <Activity className="size-3.5 animate-spin" /> Evolving Population...
            </>
          ) : (
            <>
              <Play className="size-3.5" /> Start Genetic Search
            </>
          )}
        </Button>
      </div>

      {/* Control Sliders */}
      <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 sm:grid-cols-3">
        <div>
          <div className="flex justify-between text-xs font-semibold">
            <span>Population Size (Chromosomes)</span>
            <span className="font-mono text-primary">{popSize}</span>
          </div>
          <input
            type="range"
            min="10"
            max="50"
            step="5"
            value={popSize}
            onChange={(e) => setPopSize(parseInt(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-semibold">
            <span>Generations to Evolve</span>
            <span className="font-mono text-primary">{generations}</span>
          </div>
          <input
            type="range"
            min="5"
            max="25"
            step="1"
            value={generations}
            onChange={(e) => setGenerations(parseInt(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs font-semibold">
            <span>Mutation Probability ($p_m$)</span>
            <span className="font-mono text-primary">{Math.round(mutationRate * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.40"
            step="0.05"
            value={mutationRate}
            onChange={(e) => setMutationRate(parseFloat(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </div>
      </div>

      {/* Results and Convergence Chart */}
      {result && (
        <div className="space-y-4 border-t pt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Optimal Parameters Card */}
            <div className="rounded-lg border bg-background/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Optimal Evolved Chromosome
                </span>
                {result.bestChromosome.rule43Compliant ? (
                  <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
                    <ShieldCheck className="size-3" /> Rule 4.3 Compliant
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded bg-rose-500/15 px-1.5 py-0.2 text-[9px] font-bold text-rose-400">
                    <ShieldAlert className="size-3" /> Rule 4.3 Breach
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded border bg-muted/30 p-2">
                  <span className="text-muted-foreground">Fast EMA</span>
                  <p className="font-mono text-base font-bold text-foreground">
                    {result.bestChromosome.fastPeriod}
                  </p>
                </div>
                <div className="rounded border bg-muted/30 p-2">
                  <span className="text-muted-foreground">Slow EMA</span>
                  <p className="font-mono text-base font-bold text-foreground">
                    {result.bestChromosome.slowPeriod}
                  </p>
                </div>
                <div className="rounded border bg-muted/30 p-2">
                  <span className="text-muted-foreground">ATR Multiplier</span>
                  <p className="font-mono text-base font-bold text-foreground">
                    {result.bestChromosome.atrMultiplier.toFixed(1)}x
                  </p>
                </div>
                <div className="rounded border bg-muted/30 p-2">
                  <span className="text-muted-foreground">Risk per Trade</span>
                  <p className="font-mono text-base font-bold text-primary">
                    {result.bestChromosome.riskPerTrade.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 border-t pt-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calmar Ratio:</span>
                  <span className="font-mono font-bold text-gain">{result.bestChromosome.calmarRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sharpe Ratio:</span>
                  <span className="font-mono font-bold text-foreground">{result.bestChromosome.sharpeRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Drawdown:</span>
                  <span className={`font-mono font-bold ${result.bestChromosome.maxDrawdownPct > 1.5 ? "text-loss" : "text-gain"}`}>
                    {result.bestChromosome.maxDrawdownPct.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Win Rate:</span>
                  <span className="font-mono font-bold text-foreground">{result.bestChromosome.winRatePct.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Evolution Search Latency:</span>
                  <span className="font-mono text-muted-foreground">{result.elapsedMs}ms</span>
                </div>
              </div>

              <Button
                size="sm"
                className="w-full gap-1.5 font-bold text-xs mt-2"
                onClick={() =>
                  onApplyParameters({
                    fast: result.bestChromosome.fastPeriod,
                    slow: result.bestChromosome.slowPeriod,
                    atrMultiplier: result.bestChromosome.atrMultiplier,
                    riskPerTrade: result.bestChromosome.riskPerTrade,
                  })
                }
              >
                Apply Parameters to Strategy Lab <ArrowRight className="size-3.5" />
              </Button>
            </div>

            {/* Convergence Chart (2 cols) */}
            <div className="lg:col-span-2 rounded-lg border bg-background/80 p-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                Fitness Convergence Across Generations
              </span>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.history} margin={{ top: 5, right: 15, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="generation"
                      tick={{ fontSize: 10 }}
                      stroke="#888888"
                      tickFormatter={(v) => `Gen ${v}`}
                    />
                    <YAxis tick={{ fontSize: 10 }} stroke="#888888" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#1e1e1e", borderColor: "#333", fontSize: "11px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="bestFitness"
                      name="Best Fitness"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgFitness"
                      name="Avg Fitness"
                      stroke="#3b82f6"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
