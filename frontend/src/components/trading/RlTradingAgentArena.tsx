// Milestone 39: Reinforcement Learning (RL) Trading Agent Arena & Q-Learning Benchmark UI
import { useState, useMemo } from "react";
import {
  Brain,
  Play,
  Sliders,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  Trophy,
  Activity,
  Layers,
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
  QLearningAgent,
  generateRlMarketData,
  ACTION_NAMES,
  RlAction,
  BenchmarkComparison,
  TrainingHistoryPoint,
  StatePolicyInfo,
} from "@/lib/rl-trading-agent";

export function RlTradingAgentArena() {
  // Hyperparameters
  const [learningRate, setLearningRate] = useState<number>(0.12);
  const [discountFactor, setDiscountFactor] = useState<number>(0.95);
  const [episodes, setEpisodes] = useState<number>(80);
  const [pnlWeight, setPnlWeight] = useState<number>(1.2);
  const [drawdownWeight, setDrawdownWeight] = useState<number>(3.5);
  const [churnPenalty, setChurnPenalty] = useState<number>(0.05);

  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [selectedSubTab, setSelectedSubTab] = useState<"BENCHMARK" | "LEARNING_CURVE" | "Q_POLICY">("BENCHMARK");

  // Market datasets (train & out-of-sample test)
  const trainBars = useMemo(() => generateRlMarketData(200, 24200), []);
  const testBars = useMemo(() => generateRlMarketData(150, 24500), []);

  // Agent instance
  const [agent, setAgent] = useState<QLearningAgent>(() => {
    const a = new QLearningAgent(
      { learningRate, discountFactor, episodes },
      { pnlWeight, drawdownWeight, churnPenalty }
    );
    a.train(trainBars);
    return a;
  });

  const [trainingHistory, setTrainingHistory] = useState<TrainingHistoryPoint[]>(() => {
    return agent.train(trainBars);
  });

  const [benchmarks, setBenchmarks] = useState<BenchmarkComparison[]>(() => {
    return agent.evaluate(testBars);
  });

  const [policySamples, setPolicySamples] = useState<StatePolicyInfo[]>(() => {
    return agent.getPolicySample();
  });

  const handleRetrain = () => {
    setIsTraining(true);
    setTimeout(() => {
      const newAgent = new QLearningAgent(
        { learningRate, discountFactor, episodes },
        { pnlWeight, drawdownWeight, churnPenalty }
      );
      const history = newAgent.train(trainBars);
      const evals = newAgent.evaluate(testBars);
      const policies = newAgent.getPolicySample();

      setAgent(newAgent);
      setTrainingHistory(history);
      setBenchmarks(evals);
      setPolicySamples(policies);
      setIsTraining(false);

      const agentResult = evals.find((b) => b.modelName === "RL_AGENT");
      toast.success(
        `Trained RL Agent over ${episodes} episodes! Test return: ${agentResult?.cumulativeReturnPct}% (Sharpe: ${agentResult?.sharpeRatio})`
      );
    }, 150);
  };

  const agentBench = benchmarks.find((b) => b.modelName === "RL_AGENT");
  const humanBench = benchmarks.find((b) => b.modelName === "HUMAN_TRADER");
  const bhBench = benchmarks.find((b) => b.modelName === "BUY_AND_HOLD");

  // Overlay equity curve data
  const equityComparisonData = useMemo(() => {
    const len = agentBench?.equityCurve.length || 0;
    const pts = [];
    for (let i = 0; i < len; i++) {
      pts.push({
        bar: i + 1,
        agent: agentBench?.equityCurve[i]?.equity ?? 1000000,
        human: humanBench?.equityCurve[i]?.equity ?? 1000000,
        buyHold: bhBench?.equityCurve[i]?.equity ?? 1000000,
      });
    }
    return pts;
  }, [agentBench, humanBench, bhBench]);

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 md:p-6 shadow-sm">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Reinforcement Learning (RL) Trading Agent Arena & Q-Learning Benchmark
            </h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary border border-primary/20">
              Milestone 39 / Tabular Q-Agent
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            In-browser reinforcement learning agent trained with custom reward weights and strict Rule 4.3 (1.5% drawdown) constraint penalty.
          </p>
        </div>

        <button
          onClick={handleRetrain}
          disabled={isTraining}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {isTraining ? <Activity className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {isTraining ? "Training Agent..." : "Retrain RL Agent"}
        </button>
      </div>

      {/* Hyperparameter & Reward Weight Tuning Row */}
      <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5 sm:grid-cols-3 lg:grid-cols-6 text-xs">
        <div>
          <div className="flex justify-between font-semibold text-muted-foreground">
            <span>Learning Rate ($\alpha$)</span>
            <span className="font-mono font-bold text-foreground">{learningRate}</span>
          </div>
          <input
            type="range"
            min={0.01}
            max={0.3}
            step={0.01}
            value={learningRate}
            onChange={(e) => setLearningRate(Number(e.target.value))}
            className="mt-1.5 w-full accent-primary"
          />
        </div>

        <div>
          <div className="flex justify-between font-semibold text-muted-foreground">
            <span>Discount Factor ($\gamma$)</span>
            <span className="font-mono font-bold text-foreground">{discountFactor}</span>
          </div>
          <input
            type="range"
            min={0.8}
            max={0.99}
            step={0.01}
            value={discountFactor}
            onChange={(e) => setDiscountFactor(Number(e.target.value))}
            className="mt-1.5 w-full accent-primary"
          />
        </div>

        <div>
          <div className="flex justify-between font-semibold text-muted-foreground">
            <span>Training Episodes</span>
            <span className="font-mono font-bold text-primary">{episodes}</span>
          </div>
          <input
            type="range"
            min={30}
            max={200}
            step={10}
            value={episodes}
            onChange={(e) => setEpisodes(Number(e.target.value))}
            className="mt-1.5 w-full accent-primary"
          />
        </div>

        <div>
          <div className="flex justify-between font-semibold text-muted-foreground">
            <span>PnL Return Weight</span>
            <span className="font-mono font-bold text-foreground">{pnlWeight.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={3.0}
            step={0.1}
            value={pnlWeight}
            onChange={(e) => setPnlWeight(Number(e.target.value))}
            className="mt-1.5 w-full accent-primary"
          />
        </div>

        <div>
          <div className="flex justify-between font-semibold text-rose-400">
            <span>Rule 4.3 DD Penalty</span>
            <span className="font-mono font-bold text-rose-400">{drawdownWeight.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={1.0}
            max={6.0}
            step={0.5}
            value={drawdownWeight}
            onChange={(e) => setDrawdownWeight(Number(e.target.value))}
            className="mt-1.5 w-full accent-rose-500"
          />
        </div>

        <div>
          <div className="flex justify-between font-semibold text-muted-foreground">
            <span>Churn Penalty</span>
            <span className="font-mono font-bold text-foreground">{churnPenalty.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.01}
            max={0.15}
            step={0.01}
            value={churnPenalty}
            onChange={(e) => setChurnPenalty(Number(e.target.value))}
            className="mt-1.5 w-full accent-primary"
          />
        </div>
      </div>

      {/* Head-to-Head Comparison Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* RL Agent Card */}
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Brain className="h-4 w-4" /> AI RL Agent (Q-Learner)
            </span>
            <span className="rounded bg-primary/20 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
              Learned Policy
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <p className={`num font-mono text-2xl font-black ${(agentBench?.cumulativeReturnPct ?? 0) >= 0 ? "text-gain" : "text-loss"}`}>
              {(agentBench?.cumulativeReturnPct ?? 0) >= 0 ? "+" : ""}{agentBench?.cumulativeReturnPct}%
            </p>
            <div className="text-right text-[11px] font-mono text-muted-foreground">
              <span>Sharpe: <strong className="text-foreground">{agentBench?.sharpeRatio}</strong></span>
              <span className="block">Sortino: <strong className="text-foreground">{agentBench?.sortinoRatio}</strong></span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-xs">
            <span className="text-muted-foreground">Max DD: -{agentBench?.maxDrawdownPct}%</span>
            <span className="text-muted-foreground">Win Rate: {agentBench?.winRatePct}%</span>
          </div>

          {/* Rule 4.3 Badge */}
          <div className="mt-2.5 flex items-center justify-between rounded-lg bg-background/60 px-2.5 py-1 text-[11px]">
            <span className="text-muted-foreground font-semibold">Rule 4.3 DD Limit (1.5%):</span>
            {agentBench?.rule43Compliant ? (
              <span className="flex items-center gap-1 font-bold text-gain">
                <ShieldCheck className="h-3.5 w-3.5" /> PASSED
              </span>
            ) : (
              <span className="flex items-center gap-1 font-bold text-loss">
                <ShieldAlert className="h-3.5 w-3.5" /> BREACHED
              </span>
            )}
          </div>
        </div>

        {/* Human Trader Card */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Human Trader (Heuristics)
            </span>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
              Baseline
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <p className={`num font-mono text-2xl font-black ${(humanBench?.cumulativeReturnPct ?? 0) >= 0 ? "text-gain" : "text-loss"}`}>
              {(humanBench?.cumulativeReturnPct ?? 0) >= 0 ? "+" : ""}{humanBench?.cumulativeReturnPct}%
            </p>
            <div className="text-right text-[11px] font-mono text-muted-foreground">
              <span>Sharpe: <strong className="text-foreground">{humanBench?.sharpeRatio}</strong></span>
              <span className="block">Sortino: <strong className="text-foreground">{humanBench?.sortinoRatio}</strong></span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-xs">
            <span className="text-muted-foreground">Max DD: -{humanBench?.maxDrawdownPct}%</span>
            <span className="text-muted-foreground">Win Rate: {humanBench?.winRatePct}%</span>
          </div>

          <div className="mt-2.5 flex items-center justify-between rounded-lg bg-background/60 px-2.5 py-1 text-[11px]">
            <span className="text-muted-foreground font-semibold">Rule 4.3 DD Limit (1.5%):</span>
            {humanBench?.rule43Compliant ? (
              <span className="flex items-center gap-1 font-bold text-gain">
                <ShieldCheck className="h-3.5 w-3.5" /> PASSED
              </span>
            ) : (
              <span className="flex items-center gap-1 font-bold text-loss">
                <ShieldAlert className="h-3.5 w-3.5" /> BREACHED
              </span>
            )}
          </div>
        </div>

        {/* Buy & Hold Benchmark Card */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Buy & Hold (Passive Index)
            </span>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">
              Benchmark
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <p className={`num font-mono text-2xl font-black ${(bhBench?.cumulativeReturnPct ?? 0) >= 0 ? "text-gain" : "text-loss"}`}>
              {(bhBench?.cumulativeReturnPct ?? 0) >= 0 ? "+" : ""}{bhBench?.cumulativeReturnPct}%
            </p>
            <div className="text-right text-[11px] font-mono text-muted-foreground">
              <span>Sharpe: <strong className="text-foreground">{bhBench?.sharpeRatio}</strong></span>
              <span className="block">Sortino: <strong className="text-foreground">{bhBench?.sortinoRatio}</strong></span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-xs">
            <span className="text-muted-foreground">Max DD: -{bhBench?.maxDrawdownPct}%</span>
            <span className="text-muted-foreground">Passive</span>
          </div>

          <div className="mt-2.5 flex items-center justify-between rounded-lg bg-background/60 px-2.5 py-1 text-[11px]">
            <span className="text-muted-foreground font-semibold">Rule 4.3 DD Limit (1.5%):</span>
            {bhBench?.rule43Compliant ? (
              <span className="flex items-center gap-1 font-bold text-gain">
                <ShieldCheck className="h-3.5 w-3.5" /> PASSED
              </span>
            ) : (
              <span className="flex items-center gap-1 font-bold text-loss">
                <ShieldAlert className="h-3.5 w-3.5" /> BREACHED
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 text-xs">
        <button
          onClick={() => setSelectedSubTab("BENCHMARK")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
            selectedSubTab === "BENCHMARK" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" /> Equity Curve Comparison (Out-of-Sample)
        </button>
        <button
          onClick={() => setSelectedSubTab("LEARNING_CURVE")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
            selectedSubTab === "LEARNING_CURVE" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Activity className="h-3.5 w-3.5" /> Training Convergence History
        </button>
        <button
          onClick={() => setSelectedSubTab("Q_POLICY")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
            selectedSubTab === "Q_POLICY" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Layers className="h-3.5 w-3.5" /> Learned Q-Value Policy Matrix
        </button>
      </div>

      {/* SubTab 1: Equity Curve Comparison */}
      {selectedSubTab === "BENCHMARK" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Out-of-Sample Performance: AI RL Agent (Indigo) vs Human (Cyan) vs Buy & Hold (Zinc)</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-semibold text-primary">
                <span className="size-2 rounded-full bg-primary" /> RL Agent
              </span>
              <span className="flex items-center gap-1 font-semibold text-sky-400">
                <span className="size-2 rounded-full bg-sky-400" /> Human Trader
              </span>
              <span className="flex items-center gap-1 font-semibold text-zinc-400">
                <span className="size-2 rounded-full bg-zinc-400" /> Buy & Hold
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={equityComparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="bar" stroke="#888888" fontSize={10} tickFormatter={(v) => `Bar ${v}`} />
                <YAxis
                  stroke="#888888"
                  fontSize={10}
                  domain={["auto", "auto"]}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="rounded-lg border border-border bg-background p-2.5 text-xs shadow-md">
                        <p className="font-bold text-foreground">Bar {d.bar}</p>
                        <p className="text-primary font-bold">RL Agent: ₹{d.agent?.toLocaleString("en-IN")}</p>
                        <p className="text-sky-400">Human: ₹{d.human?.toLocaleString("en-IN")}</p>
                        <p className="text-muted-foreground">Buy & Hold: ₹{d.buyHold?.toLocaleString("en-IN")}</p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={1000000} stroke="#666" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="agent" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="human" stroke="#38bdf8" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="buyHold" stroke="#a1a1aa" strokeWidth={1.2} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* SubTab 2: Training Convergence History */}
      {selectedSubTab === "LEARNING_CURVE" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Episode Rewards & Sharpe Convergence ({episodes} Episodes)</span>
            <span className="text-[11px] font-mono text-primary">Bellman TD Learning</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trainingHistory} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="episode" stroke="#888888" fontSize={10} tickFormatter={(v) => `Ep ${v}`} />
                <YAxis stroke="#888888" fontSize={10} domain={["auto", "auto"]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="rounded-lg border border-border bg-background p-2.5 text-xs shadow-md">
                        <p className="font-bold text-foreground">Episode {d.episode}</p>
                        <p className="text-primary font-semibold">Reward: {d.cumulativeReward}</p>
                        <p className="text-gain font-semibold">Sharpe: {d.sharpeRatio}</p>
                        <p className="text-loss font-mono">Max DD: -{d.maxDrawdownPct}%</p>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="cumulativeReward" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sharpeRatio" stroke="#22c55e" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* SubTab 3: Learned Q-Value Policy Matrix */}
      {selectedSubTab === "Q_POLICY" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Sampled State-Action Values ($Q(s, a)$) & Greedily Selected Policies</span>
            <span className="text-[10px] uppercase font-bold text-foreground">90 Discrete Regimes</span>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-border/60">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur font-semibold text-muted-foreground uppercase text-[10px]">
                <tr className="border-b border-border/60">
                  <th className="p-2.5">State ID</th>
                  <th className="p-2.5">RSI Zone</th>
                  <th className="p-2.5">Trend Bias</th>
                  <th className="p-2.5">Volatility</th>
                  <th className="p-2.5">Current Pos</th>
                  <th className="p-2.5 text-center">Best Action</th>
                  <th className="p-2.5 text-right">Q(HOLD)</th>
                  <th className="p-2.5 text-right">Q(BUY)</th>
                  <th className="p-2.5 text-right">Q(SELL)</th>
                  <th className="p-2.5 text-right">Q(CLOSE)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 font-mono text-[11px]">
                {policySamples.map((p, idx) => (
                  <tr key={idx} className="hover:bg-accent/30 transition-colors">
                    <td className="p-2.5 text-muted-foreground">#{p.stateIndex}</td>
                    <td className="p-2.5 font-sans font-semibold">
                      <span className={p.rsiZone === "OVERSOLD" ? "text-gain" : p.rsiZone === "OVERBOUGHT" ? "text-loss" : "text-foreground"}>
                        {p.rsiZone}
                      </span>
                    </td>
                    <td className="p-2.5 font-sans text-muted-foreground">{p.trend}</td>
                    <td className="p-2.5 font-sans text-muted-foreground">{p.volatility}</td>
                    <td className="p-2.5 font-sans font-bold">{p.position}</td>
                    <td className="p-2.5 text-center font-sans">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                          p.bestAction === 1
                            ? "bg-gain/20 text-gain"
                            : p.bestAction === 2
                            ? "bg-loss/20 text-loss"
                            : p.bestAction === 3
                            ? "bg-amber-500/20 text-amber-500"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {ACTION_NAMES[p.bestAction]}
                      </span>
                    </td>
                    <td className="p-2.5 text-right text-muted-foreground">{p.qValues[0]}</td>
                    <td className={`p-2.5 text-right font-bold ${(p.qValues[1] ?? 0) > 0 ? "text-gain" : "text-muted-foreground"}`}>
                      {p.qValues[1]}
                    </td>
                    <td className={`p-2.5 text-right font-bold ${(p.qValues[2] ?? 0) > 0 ? "text-loss" : "text-muted-foreground"}`}>
                      {p.qValues[2]}
                    </td>
                    <td className="p-2.5 text-right text-muted-foreground">{p.qValues[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
