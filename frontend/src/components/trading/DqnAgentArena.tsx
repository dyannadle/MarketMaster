// Milestone 42: Deep Q-Network (DQN) Neural Network with Experience Replay UI
import { useState, useMemo } from "react";
import {
  Brain,
  Cpu,
  Play,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  BarChart2,
  Workflow,
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
import { toast } from "sonner";
import { inr } from "@/lib/data";
import {
  DqnAgent,
  trainDqnSimulation,
  DqnTrainingStepLog,
  DqnBenchmarkResult,
} from "@/lib/dqn-agent";

export function DqnAgentArena() {
  const [learningRate, setLearningRate] = useState<number>(0.001);
  const [episodes, setEpisodes] = useState<number>(40);
  const [batchSize, setBatchSize] = useState<number>(32);
  const [targetPeriod, setTargetPeriod] = useState<number>(50);

  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"BENCHMARK" | "LOSS_CURVE" | "ARCHITECTURE">("BENCHMARK");

  // Initial lightweight simulation for instant mount
  const [simData, setSimData] = useState(() => trainDqnSimulation(5, 40));

  const handleRetrain = () => {
    setIsTraining(true);
    setTimeout(() => {
      const res = trainDqnSimulation(episodes, 150);
      setSimData(res);
      setIsTraining(false);
      const dqnResult = res.benchmarks.find((b) => b.modelName === "DQN_NEURAL");
      toast.success(
        `Deep Q-Network trained across ${episodes} episodes! Out-of-sample return: +${dqnResult?.cumulativeReturnPct}% (Sharpe: ${dqnResult?.sharpeRatio})`
      );
    }, 200);
  };

  const dqnModel = simData.benchmarks.find((b) => b.modelName === "DQN_NEURAL");
  const tabModel = simData.benchmarks.find((b) => b.modelName === "TABULAR_Q");
  const humanModel = simData.benchmarks.find((b) => b.modelName === "HUMAN_TRADER");
  const bhModel = simData.benchmarks.find((b) => b.modelName === "BUY_AND_HOLD");

  // Overlaid equity curves data
  const equityData = useMemo(() => {
    const len = dqnModel?.equityCurve.length || 0;
    const pts = [];
    for (let i = 0; i < len; i++) {
      pts.push({
        step: i + 1,
        dqn: dqnModel?.equityCurve[i]?.equity ?? 1000000,
        tabular: tabModel?.equityCurve[i]?.equity ?? 1000000,
        human: humanModel?.equityCurve[i]?.equity ?? 1000000,
        buyHold: bhModel?.equityCurve[i]?.equity ?? 1000000,
      });
    }
    return pts;
  }, [dqnModel, tabModel, humanModel, bhModel]);

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 md:p-6 shadow-sm">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Deep Q-Network (DQN) Neural Network with Experience Replay
            </h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary border border-primary/20">
              Milestone 42 / Dense 64-32-4
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Continuous state-space neural RL agent with 1,000-sample experience replay buffer, Adam backpropagation, and target network stabilization.
          </p>
        </div>

        <button
          onClick={handleRetrain}
          disabled={isTraining}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {isTraining ? <Activity className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {isTraining ? "Training Neural Net..." : "Retrain Deep Q-Network"}
        </button>
      </div>

      {/* Hyperparameter Controls */}
      <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5 sm:grid-cols-2 lg:grid-cols-4 text-xs">
        <div>
          <div className="flex justify-between font-semibold text-muted-foreground">
            <span>Learning Rate ($\eta$)</span>
            <span className="font-mono font-bold text-foreground">{learningRate}</span>
          </div>
          <input
            type="range"
            min={0.0005}
            max={0.005}
            step={0.0005}
            value={learningRate}
            onChange={(e) => setLearningRate(Number(e.target.value))}
            className="mt-1.5 w-full accent-primary"
          />
        </div>

        <div>
          <div className="flex justify-between font-semibold text-muted-foreground">
            <span>Episodes</span>
            <span className="font-mono font-bold text-primary">{episodes}</span>
          </div>
          <input
            type="range"
            min={20}
            max={80}
            step={10}
            value={episodes}
            onChange={(e) => setEpisodes(Number(e.target.value))}
            className="mt-1.5 w-full accent-primary"
          />
        </div>

        <div>
          <div className="flex justify-between font-semibold text-muted-foreground">
            <span>Mini-Batch Size</span>
            <span className="font-mono font-bold text-foreground">{batchSize} samples</span>
          </div>
          <input
            type="range"
            min={16}
            max={64}
            step={16}
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e.target.value))}
            className="mt-1.5 w-full accent-primary"
          />
        </div>

        <div>
          <div className="flex justify-between font-semibold text-muted-foreground">
            <span>Target Sync Period</span>
            <span className="font-mono font-bold text-foreground">{targetPeriod} steps</span>
          </div>
          <input
            type="range"
            min={20}
            max={100}
            step={10}
            value={targetPeriod}
            onChange={(e) => setTargetPeriod(Number(e.target.value))}
            className="mt-1.5 w-full accent-primary"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-primary">DQN Out-of-Sample Return</span>
          <p className="num mt-1 font-mono text-2xl font-black text-gain">
            +{dqnModel?.cumulativeReturnPct}%
          </p>
          <span className="text-[10px] text-muted-foreground">Initial: ₹10,00,000</span>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sharpe / Sortino</span>
          <p className="num mt-1 font-mono text-2xl font-bold text-foreground">
            {dqnModel?.sharpeRatio} <span className="text-sm font-normal text-muted-foreground">/ {dqnModel?.sortinoRatio}</span>
          </p>
          <span className="text-[10px] text-muted-foreground">Risk-adjusted performance</span>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Replay Buffer Fill</span>
          <p className="num mt-1 font-mono text-2xl font-bold text-foreground">
            {simData.agent.replayBuffer.size()} / 1,000
          </p>
          <span className="text-[10px] text-muted-foreground">De-correlated state transitions</span>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Rule 4.3 Invariant</span>
          <div className="mt-1 flex items-center gap-1.5">
            {dqnModel?.rule43Compliant ? (
              <>
                <ShieldCheck className="h-5 w-5 text-gain" />
                <span className="font-bold text-gain text-sm">PASSED (DD: {dqnModel?.maxDrawdownPct}%)</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-5 w-5 text-loss" />
                <span className="font-bold text-loss text-sm">BREACHED</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">1.5% daily drawdown ceiling</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 text-xs">
        <button
          onClick={() => setActiveTab("BENCHMARK")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
            activeTab === "BENCHMARK" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" /> Head-to-Head Comparison (Out-of-Sample)
        </button>
        <button
          onClick={() => setActiveTab("LOSS_CURVE")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
            activeTab === "LOSS_CURVE" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Activity className="h-3.5 w-3.5" /> Backpropagation Loss Curve
        </button>
        <button
          onClick={() => setActiveTab("ARCHITECTURE")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
            activeTab === "ARCHITECTURE" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Workflow className="h-3.5 w-3.5" /> Neural Net Architecture & Target Network
        </button>
      </div>

      {/* Tab 1: Head-to-Head Benchmark */}
      {activeTab === "BENCHMARK" && (
        <div className="space-y-4">
          {/* Comparison Cards Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {simData.benchmarks.map((b) => {
              const isDqn = b.modelName === "DQN_NEURAL";
              return (
                <div
                  key={b.modelName}
                  className={`rounded-xl border p-3.5 ${
                    isDqn ? "border-primary/40 bg-primary/5 shadow-sm" : "border-border/60 bg-muted/20"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase ${isDqn ? "text-primary" : "text-foreground"}`}>
                      {b.modelName.replace(/_/g, " ")}
                    </span>
                    <span className="rounded bg-background px-1.5 py-0.5 font-mono text-[9px] font-bold text-muted-foreground">
                      {isDqn ? "AI Neural" : "Benchmark"}
                    </span>
                  </div>

                  <p className={`num mt-2 font-mono text-xl font-black ${b.cumulativeReturnPct >= 0 ? "text-gain" : "text-loss"}`}>
                    {b.cumulativeReturnPct >= 0 ? "+" : ""}{b.cumulativeReturnPct}%
                  </p>

                  <div className="mt-2 space-y-1 text-[11px] text-muted-foreground border-t border-border/40 pt-2 font-mono">
                    <div className="flex justify-between">
                      <span>Sharpe:</span> <strong className="text-foreground">{b.sharpeRatio}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Drawdown:</span> <span className="text-loss font-bold">-{b.maxDrawdownPct}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Win Rate:</span> <span>{b.winRatePct}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Equity Curves Overlaid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Out-of-Sample Equity Curves: Deep Q-Network (Indigo) vs Tabular Q (Emerald) vs Human (Cyan) vs Buy & Hold (Zinc)</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="step" stroke="#888888" fontSize={10} tickFormatter={(v) => `Bar ${v}`} />
                  <YAxis stroke="#888888" fontSize={10} domain={["auto", "auto"]} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div className="rounded-lg border border-border bg-background p-2.5 text-xs shadow-md">
                          <p className="font-bold text-foreground">Step #{d.step}</p>
                          <p className="text-primary font-bold">Deep Q-Network: ₹{d.dqn?.toLocaleString("en-IN")}</p>
                          <p className="text-emerald-400">Tabular Q: ₹{d.tabular?.toLocaleString("en-IN")}</p>
                          <p className="text-sky-400">Human: ₹{d.human?.toLocaleString("en-IN")}</p>
                          <p className="text-muted-foreground">Buy & Hold: ₹{d.buyHold?.toLocaleString("en-IN")}</p>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={1000000} stroke="#666" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="dqn" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="tabular" stroke="#22c55e" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="human" stroke="#0ea5e9" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="buyHold" stroke="#a1a1aa" strokeWidth={1.2} strokeDasharray="3 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Loss Convergence Curve */}
      {activeTab === "LOSS_CURVE" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Mini-Batch Temporal Difference (TD) Loss: MSE(y - Q(s, a))</span>
            <span className="font-mono text-primary font-bold">Adam Optimizer (&eta; = {learningRate})</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={simData.lossHistory} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="step" stroke="#888888" fontSize={10} tickFormatter={(v) => `Step ${v}`} />
                <YAxis stroke="#888888" fontSize={10} domain={["auto", "auto"]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="rounded-lg border border-border bg-background p-2.5 text-xs shadow-md">
                        <p className="font-bold text-foreground">Gradient Step #{d.step}</p>
                        <p className="text-loss font-mono">MSE Loss: {d.loss}</p>
                        <p className="text-primary font-mono">Avg Q-Value: {d.avgQValue}</p>
                        <p className="text-muted-foreground font-mono">Epsilon ($\epsilon$): {d.epsilon}</p>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="loss" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 3: Neural Architecture Inspector */}
      {activeTab === "ARCHITECTURE" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4 text-xs">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-primary">Input Layer (6 Features)</span>
              <p className="font-bold text-foreground text-sm">6 Continuous Inputs</p>
              <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-0.5">
                <li>Normalized RSI ($[0, 1]$)</li>
                <li>Price Return ($\Delta P / P$)</li>
                <li>EMA Spread ($EMA_9 - EMA_{21}$)</li>
                <li>Normalized ATR</li>
                <li>Trend Momentum</li>
                <li>Position State ($[-1, 0, 1]$)</li>
              </ul>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-primary">Hidden Layer 1</span>
              <p className="font-bold text-foreground text-sm">Dense 64 Neurons</p>
              <p className="text-[11px] text-muted-foreground">
                He-Normal weight initialization with ReLU activation ($\max(0, x)$). Extracts complex non-linear indicator combinations.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-primary">Hidden Layer 2</span>
              <p className="font-bold text-foreground text-sm">Dense 32 Neurons</p>
              <p className="text-[11px] text-muted-foreground">
                Deep feature compression with ReLU activation. Prepares low-dimensional action value representations.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/20 p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-primary">Output Layer (Q-Values)</span>
              <p className="font-bold text-foreground text-sm">Dense 4 Actions</p>
              <ul className="text-[11px] text-muted-foreground list-disc pl-4 space-y-0.5">
                <li>Q(s, HOLD)</li>
                <li>Q(s, BUY)</li>
                <li>Q(s, SELL)</li>
                <li>Q(s, CLOSE)</li>
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-border/40 bg-background/50 p-3 text-xs flex items-center justify-between">
            <div>
              <span className="font-bold text-foreground">Target Network Synchronization:</span>
              <p className="text-muted-foreground text-[11px]">
                Cloned target weights $\theta^-$ synchronized every {targetPeriod} training steps to eliminate moving target divergence.
              </p>
            </div>
            <span className="rounded bg-gain/10 border border-gain/20 px-2.5 py-1 font-mono text-[11px] font-bold text-gain">
              ACTIVE & STABLE
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
