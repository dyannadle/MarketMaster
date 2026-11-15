import React, { useState, useMemo } from "react";
import {
  Brain,
  Cpu,
  Zap,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  Activity,
  BarChart2,
  Sliders,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { inr } from "@/lib/data";
import {
  trainPpoAgentSimulation,
  PpoHyperparameters,
  PpoEvaluationReport,
} from "@/lib/ppo-agent";

export const PpoAgentArena: React.FC = () => {
  const [episodes, setEpisodes] = useState(5);
  const [clipEpsilon, setClipEpsilon] = useState(0.2);
  const [gaeLambda, setGaeLambda] = useState(0.95);
  const [entropyCoef, setEntropyCoef] = useState(0.01);
  const [isRetraining, setIsRetraining] = useState(false);

  const hyper: PpoHyperparameters = useMemo(
    () => ({
      clipEpsilon,
      gamma: 0.99,
      gaeLambda,
      entropyCoef,
      valueLossCoef: 0.5,
      actorLr: 0.0003,
      criticLr: 0.001,
      epochs: 3,
      batchSize: 32,
    }),
    [clipEpsilon, gaeLambda, entropyCoef]
  );

  const [report, setReport] = useState<PpoEvaluationReport>(() => {
    return trainPpoAgentSimulation(5, 40, {
      clipEpsilon: 0.2,
      gamma: 0.99,
      gaeLambda: 0.95,
      entropyCoef: 0.01,
      valueLossCoef: 0.5,
      actorLr: 0.0003,
      criticLr: 0.001,
      epochs: 3,
      batchSize: 32,
    });
  });

  const handleRetrain = () => {
    setIsRetraining(true);
    setTimeout(() => {
      const updated = trainPpoAgentSimulation(episodes, 40, hyper);
      setReport(updated);
      setIsRetraining(false);
    }, 50);
  };

  // Generate Gaussian action distribution curve points N(mu=0.35, sigma=0.45)
  const gaussianCurveData = useMemo(() => {
    const points = [];
    const mu = 0.25;
    const sigma = report.trainingMetrics[report.trainingMetrics.length - 1]?.sigma || 0.45;
    for (let x = -1.0; x <= 1.0; x += 0.05) {
      const z = (x - mu) / sigma;
      const pdf = Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
      points.push({
        position: Number(x.toFixed(2)),
        density: Number(pdf.toFixed(3)),
      });
    }
    return points;
  }, [report]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-secondary/10 p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-black uppercase text-primary">
                Milestone 45
              </span>
              <h2 className="text-lg font-bold tracking-tight">
                Proximal Policy Optimization (PPO) Continuous RL Agent Arena
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Deep Actor-Critic architecture with Generalized Advantage Estimation (GAE-λ) and clipped surrogate objective for continuous position sizing [-1.0, +1.0].
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500">
              <Brain className="size-3.5" /> Continuous Action Space
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">PPO Out-of-Sample Return</div>
          <div
            className={`mt-1 font-mono text-xl font-bold ${
              report.ppoReturnPct >= 0 ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {report.ppoReturnPct >= 0 ? "+" : ""}
            {report.ppoReturnPct}%
          </div>
          <div className="text-[10px] text-muted-foreground">Equity: {inr(report.ppoFinalEquity)}</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">DQN Discrete Baseline</div>
          <div
            className={`mt-1 font-mono text-xl font-bold ${
              report.dqnReturnPct >= 0 ? "text-primary" : "text-rose-500"
            }`}
          >
            {report.dqnReturnPct >= 0 ? "+" : ""}
            {report.dqnReturnPct}%
          </div>
          <div className="text-[10px] text-muted-foreground">4 Discrete Q-Actions</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Tabular Q Baseline</div>
          <div className="mt-1 font-mono text-xl font-bold text-amber-500">
            {report.tabularQReturnPct >= 0 ? "+" : ""}
            {report.tabularQReturnPct}%
          </div>
          <div className="text-[10px] text-muted-foreground">90 Discrete States</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Buy & Hold Benchmark</div>
          <div className="mt-1 font-mono text-xl font-bold text-muted-foreground">
            {report.buyHoldReturnPct >= 0 ? "+" : ""}
            {report.buyHoldReturnPct}%
          </div>
          <div className="text-[10px] text-muted-foreground">Passive Underlying</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Rule 4.3 Risk Status</div>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-lg font-bold">
            {report.ppoRule43Compliant ? (
              <span className="flex items-center gap-1 text-emerald-500">
                <ShieldCheck className="size-4" /> PASSED
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-500">
                <AlertTriangle className="size-4" /> BREACH
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground">Max DD: {report.ppoMaxDrawdownPct}% (Limit: 1.5%)</div>
        </div>
      </div>

      {/* Main Grid: Controls & Multi-Agent Equity Curve */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Hyperparameter Controls (4 Cols) */}
        <div className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-bold">
              <Sliders className="size-4 text-primary" /> PPO Hyperparameters
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground">GAE & Clipped Loss</span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-medium">
                <span>Clipping Range (ε)</span>
                <span className="font-mono font-bold text-primary">±{clipEpsilon}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.3"
                step="0.05"
                value={clipEpsilon}
                onChange={(e) => setClipEpsilon(parseFloat(e.target.value))}
                className="mt-1.5 w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Conservative (0.1)</span>
                <span>Aggressive (0.3)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium">
                <span>GAE Factor (λ)</span>
                <span className="font-mono font-bold text-foreground">{gaeLambda}</span>
              </div>
              <input
                type="range"
                min="0.80"
                max="0.99"
                step="0.01"
                value={gaeLambda}
                onChange={(e) => setGaeLambda(parseFloat(e.target.value))}
                className="mt-1.5 w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>High Bias (0.80)</span>
                <span>High Variance (0.99)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium">
                <span>Entropy Bonus (β)</span>
                <span className="font-mono font-bold text-foreground">{entropyCoef}</span>
              </div>
              <input
                type="range"
                min="0.001"
                max="0.05"
                step="0.005"
                value={entropyCoef}
                onChange={(e) => setEntropyCoef(parseFloat(e.target.value))}
                className="mt-1.5 w-full accent-primary"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium">
                <span>Training Episodes</span>
                <span className="font-mono font-bold text-foreground">{episodes} Episodes</span>
              </div>
              <input
                type="range"
                min="3"
                max="10"
                step="1"
                value={episodes}
                onChange={(e) => setEpisodes(parseInt(e.target.value))}
                className="mt-1.5 w-full accent-primary"
              />
            </div>

            <Button
              onClick={handleRetrain}
              disabled={isRetraining}
              className="w-full gap-2 font-bold text-xs shadow"
            >
              <Play className="size-3.5 fill-current" />
              {isRetraining ? "Backpropagating..." : "Retrain Continuous PPO Agent"}
            </Button>
          </div>

          {/* Actor-Critic Architecture Inspector */}
          <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground font-mono space-y-1">
            <div className="font-bold text-foreground">Actor Network:</div>
            <div>Input 6D → Dense 64 [tanh] → Dense 32 [tanh] → μ in [-1, 1]</div>
            <div className="pt-1 font-bold text-foreground">Critic Network:</div>
            <div>Input 6D → Dense 64 [ReLU] → Dense 32 [ReLU] → V(s) in R</div>
          </div>
        </div>

        {/* Multi-Agent Equity Curves (8 Cols) */}
        <div className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Out-of-Sample Multi-Agent Performance Benchmark
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Head-to-head evaluation: Continuous PPO vs DQN vs Tabular Q vs Buy & Hold.
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-500">
              PPO Final: {inr(report.ppoFinalEquity)}
            </span>
          </div>

          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.equitySeries} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="bar" stroke="#888888" fontSize={11} tickFormatter={(b) => `B${b}`} />
                <YAxis stroke="#888888" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, "Equity"]}
                  labelFormatter={(l) => `Evaluation Bar ${l}`}
                  contentStyle={{ backgroundColor: "#1e1e24", borderColor: "#444" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="ppoEquity"
                  name="PPO Continuous Agent"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="dqnEquity"
                  name="Deep Q-Network (DQN)"
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="tabularQEquity"
                  name="Tabular Q-Agent"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="buyHoldEquity"
                  name="Buy & Hold (Underlying)"
                  stroke="#94a3b8"
                  strokeWidth={1}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dual Analysis: Gaussian Policy Visualizer & Loss Convergence */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Continuous Gaussian Policy Distribution Curve */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Gaussian Policy Density Curve N(μ, σ²)
            </h3>
            <span className="font-mono text-xs text-primary font-bold">
              Action Range: -1.0 (Short) to +1.0 (Long)
            </span>
          </div>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={gaussianCurveData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="position" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip
                  formatter={(val: any) => [`${val}`, "Probability Density"]}
                  labelFormatter={(p) => `Target Position: ${p}`}
                  contentStyle={{ backgroundColor: "#1e1e24", borderColor: "#444" }}
                />
                <Area
                  type="monotone"
                  dataKey="density"
                  name="Action Density"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Training Loss & Entropy History */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Critic Value Loss (MSE) & Policy Entropy Convergence
            </h3>
            <span className="font-mono text-xs text-muted-foreground">
              Episodes: {report.trainingMetrics.length}
            </span>
          </div>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.trainingMetrics} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="episode" stroke="#888888" fontSize={11} tickFormatter={(e) => `Ep ${e}`} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "#1e1e24", borderColor: "#444" }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="criticLoss"
                  name="Critic Value Loss"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="entropy"
                  name="Policy Entropy"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
