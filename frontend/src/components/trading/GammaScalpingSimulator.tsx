// Milestone 40: Options Delta-Neutral Gamma Scalping Simulator UI
import { useState, useMemo } from "react";
import {
  Activity,
  Play,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  Zap,
  ArrowDownUp,
  Sliders,
  DollarSign,
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
  ScalpConfig,
  GammaScalpSimulationResult,
  runGammaScalpingSimulation,
} from "@/lib/gamma-scalping";

export function GammaScalpingSimulator() {
  const [symbol, setSymbol] = useState<"NIFTY" | "BANKNIFTY">("NIFTY");
  const spotPrice = symbol === "NIFTY" ? 24200 : 51800;

  // Configuration Sliders
  const [impliedVol, setImpliedVol] = useState<number>(14.5);
  const [realizedVol, setRealizedVol] = useState<number>(21.0);
  const [deltaThreshold, setDeltaThreshold] = useState<number>(20);
  const [frictionPerScalp, setFrictionPerScalp] = useState<number>(40);
  const [numTicks, setNumTicks] = useState<number>(50);

  const [activeTab, setActiveTab] = useState<"PNL_CHART" | "SPOT_TICKS" | "SCALP_JOURNAL">("PNL_CHART");

  const config: ScalpConfig = useMemo(
    () => ({
      symbol,
      spotPrice,
      strike: spotPrice,
      dte: 7,
      impliedVol,
      realizedVol,
      deltaThreshold,
      frictionPerScalpInr: frictionPerScalp,
      lotSize: symbol === "NIFTY" ? 50 : 15,
      numTicks,
    }),
    [symbol, spotPrice, impliedVol, realizedVol, deltaThreshold, frictionPerScalp, numTicks]
  );

  const [simResult, setSimResult] = useState<GammaScalpSimulationResult>(() =>
    runGammaScalpingSimulation(config)
  );

  const handleRunSimulation = () => {
    const res = runGammaScalpingSimulation(config);
    setSimResult(res);
    toast.success(
      `Gamma scalping simulated! ${res.totalScalps} scalps executed. Net Gamma Rent: ${inr(res.netGammaRent)}`
    );
  };

  const chartData = useMemo(() => {
    return simResult.ticks.map((t) => ({
      index: t.tickIndex,
      time: t.timeLabel,
      spot: t.spotPrice,
      gammaPnl: t.cumulativeGammaPnl,
      thetaBleed: -t.cumulativeThetaBleed,
      friction: -t.cumulativeFrictionCost,
      netPnl: t.netPnl,
      delta: t.portfolioDelta,
      action: t.actionTaken,
    }));
  }, [simResult]);

  const scalpsList = useMemo(() => {
    return simResult.ticks.filter((t) => t.actionTaken !== "NONE");
  }, [simResult]);

  const isNetProfitable = simResult.netGammaRent >= 0;

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 md:p-6 shadow-sm">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-foreground">
              Options Delta-Neutral Gamma Scalping Simulator
            </h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary border border-primary/20">
              Milestone 40 / Long Straddle Hedges
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Dynamic futures delta hedging of long ATM straddles, modeling the race between realized gamma rent and daily theta bleed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Symbol Toggle */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            <button
              onClick={() => setSymbol("NIFTY")}
              className={`rounded-md px-3 py-1 font-semibold transition-all ${
                symbol === "NIFTY" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              NIFTY 50
            </button>
            <button
              onClick={() => setSymbol("BANKNIFTY")}
              className={`rounded-md px-3 py-1 font-semibold transition-all ${
                symbol === "BANKNIFTY" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              BANK NIFTY
            </button>
          </div>

          <button
            onClick={handleRunSimulation}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow"
          >
            <Play className="h-3.5 w-3.5" /> Run Scalp Simulation
          </button>
        </div>
      </div>

      {/* Parameter Sliders */}
      <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-3.5 sm:grid-cols-2 lg:grid-cols-5 text-xs">
        <div>
          <div className="flex justify-between font-semibold text-muted-foreground">
            <span>Implied Vol (IV)</span>
            <span className="font-mono font-bold text-primary">{impliedVol.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min={8}
            max={35}
            step={0.5}
            value={impliedVol}
            onChange={(e) => setImpliedVol(Number(e.target.value))}
            className="mt-1.5 w-full accent-primary"
          />
        </div>

        <div>
          <div className="flex justify-between font-semibold text-muted-foreground">
            <span>Realized Vol (RV)</span>
            <span className="font-mono font-bold text-gain">{realizedVol.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min={8}
            max={45}
            step={0.5}
            value={realizedVol}
            onChange={(e) => setRealizedVol(Number(e.target.value))}
            className="mt-1.5 w-full accent-gain"
          />
        </div>

        <div>
          <div className="flex justify-between font-semibold text-muted-foreground">
            <span>Delta Trigger (&plusmn;&Delta;)</span>
            <span className="font-mono font-bold text-foreground">&plusmn;{deltaThreshold}</span>
          </div>
          <input
            type="range"
            min={10}
            max={45}
            step={5}
            value={deltaThreshold}
            onChange={(e) => setDeltaThreshold(Number(e.target.value))}
            className="mt-1.5 w-full accent-primary"
          />
        </div>

        <div>
          <div className="flex justify-between font-semibold text-muted-foreground">
            <span>Friction / Scalp (Taxes)</span>
            <span className="font-mono font-bold text-loss">₹{frictionPerScalp}</span>
          </div>
          <input
            type="range"
            min={10}
            max={80}
            step={5}
            value={frictionPerScalp}
            onChange={(e) => setFrictionPerScalp(Number(e.target.value))}
            className="mt-1.5 w-full accent-loss"
          />
        </div>

        <div>
          <div className="flex justify-between font-semibold text-muted-foreground">
            <span>Ticks / Minutes</span>
            <span className="font-mono font-bold text-foreground">{numTicks} ticks</span>
          </div>
          <input
            type="range"
            min={20}
            max={100}
            step={5}
            value={numTicks}
            onChange={(e) => setNumTicks(Number(e.target.value))}
            className="mt-1.5 w-full accent-primary"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Scalps Executed</span>
          <p className="num mt-1 font-mono text-base font-black text-primary">
            {simResult.totalScalps} Hedges
          </p>
          <span className="text-[10px] text-muted-foreground">Micro-futures rebalances</span>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400">Gross Gamma PnL</span>
          <p className="num mt-1 font-mono text-base font-black text-gain">
            +{inr(simResult.grossGammaProfit)}
          </p>
          <span className="text-[10px] text-muted-foreground">$\frac{1}{2}\Gamma(\Delta S)^2$ extracted</span>
        </div>

        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-rose-400">Theta Bleed</span>
          <p className="num mt-1 font-mono text-base font-bold text-loss">
            -{inr(simResult.totalThetaDecay)}
          </p>
          <span className="text-[10px] text-muted-foreground">Time decay drag</span>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Friction / Taxes</span>
          <p className="num mt-1 font-mono text-base font-bold text-muted-foreground">
            -{inr(simResult.totalTransactionFriction)}
          </p>
          <span className="text-[10px] text-muted-foreground">STT + exchange turnover</span>
        </div>

        <div className={`rounded-xl border p-3 ${isNetProfitable ? "border-gain/40 bg-gain/5" : "border-loss/40 bg-loss/5"}`}>
          <span className={`text-[10px] font-medium uppercase tracking-wider ${isNetProfitable ? "text-gain" : "text-loss"}`}>
            Net Gamma Rent
          </span>
          <p className={`num mt-1 font-mono text-base font-black ${isNetProfitable ? "text-gain" : "text-loss"}`}>
            {isNetProfitable ? "+" : ""}{inr(simResult.netGammaRent)}
          </p>
          <span className="text-[10px] text-muted-foreground">Gamma PnL - Theta - Drag</span>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Rule 4.3 Invariant</span>
          <div className="mt-1 flex items-center gap-1.5">
            {simResult.rule43Compliant ? (
              <>
                <ShieldCheck className="h-4 w-4 text-gain" />
                <span className="font-bold text-gain text-xs">PASSED (DD: {simResult.maxDrawdownPct}%)</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-4 w-4 text-loss" />
                <span className="font-bold text-loss text-xs">BREACHED ({simResult.maxDrawdownPct}%)</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">Max 1.5% DD ceiling</span>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-border/40 pb-2 text-xs">
        <button
          onClick={() => setActiveTab("PNL_CHART")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
            activeTab === "PNL_CHART" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" /> Gamma vs Theta PnL Race
        </button>
        <button
          onClick={() => setActiveTab("SPOT_TICKS")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
            activeTab === "SPOT_TICKS" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <ArrowDownUp className="h-3.5 w-3.5" /> Spot Price & Scalp Rebalances
        </button>
        <button
          onClick={() => setActiveTab("SCALP_JOURNAL")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
            activeTab === "SCALP_JOURNAL" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Layers className="h-3.5 w-3.5" /> Scalp Audit Journal ({scalpsList.length})
        </button>
      </div>

      {/* Tab 1: PnL Race Chart */}
      {activeTab === "PNL_CHART" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Cumulative Realized Gamma PnL (Green) vs Theta Bleed (Red) vs Net Profit (Indigo)</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-semibold text-gain">
                <span className="size-2 rounded-full bg-gain" /> Realized Gamma
              </span>
              <span className="flex items-center gap-1 font-semibold text-loss">
                <span className="size-2 rounded-full bg-loss" /> Theta Decay
              </span>
              <span className="flex items-center gap-1 font-semibold text-primary">
                <span className="size-2 rounded-full bg-primary" /> Net Gamma Rent
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="time" stroke="#888888" fontSize={10} />
                <YAxis stroke="#888888" fontSize={10} domain={["auto", "auto"]} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="rounded-lg border border-border bg-background p-2.5 text-xs shadow-md">
                        <p className="font-bold text-foreground">Time: {d.time}</p>
                        <p className="text-gain">Gamma Profit: +{inr(d.gammaPnl)}</p>
                        <p className="text-loss">Theta Bleed: {inr(d.thetaBleed)}</p>
                        <p className="text-muted-foreground">Friction: {inr(d.friction)}</p>
                        <p className="text-primary font-bold">Net Rent: {d.netPnl >= 0 ? "+" : ""}{inr(d.netPnl)}</p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="gammaPnl" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="thetaBleed" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="netPnl" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 2: Spot Price & Scalp Rebalances */}
      {activeTab === "SPOT_TICKS" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Spot Movement with Micro-Futures Rebalancing Points (Delta triggers $\pm${deltaThreshold})</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-semibold text-loss">
                <span className="size-2 rounded-full bg-loss" /> Sell Futures (Delta &gt; +{deltaThreshold})
              </span>
              <span className="flex items-center gap-1 font-semibold text-gain">
                <span className="size-2 rounded-full bg-gain" /> Buy Futures (Delta &lt; -{deltaThreshold})
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <XAxis dataKey="time" stroke="#888888" fontSize={10} />
                <YAxis stroke="#888888" fontSize={10} domain={["auto", "auto"]} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="rounded-lg border border-border bg-background p-2.5 text-xs shadow-md">
                        <p className="font-bold text-foreground">Time: {d.time}</p>
                        <p className="text-foreground font-mono">Spot: ₹{d.spot}</p>
                        <p className="text-muted-foreground">Portfolio Delta: {d.delta}</p>
                        {d.action !== "NONE" && (
                          <p className={`font-bold ${d.action === "BUY_FUTURES" ? "text-gain" : "text-loss"}`}>
                            Triggered: {d.action}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={spotPrice} stroke="#eab308" strokeDasharray="3 3" label={{ value: "ATM Strike", fill: "#eab308", fontSize: 10 }} />
                <Line type="monotone" dataKey="spot" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tab 3: Scalp Audit Journal Table */}
      {activeTab === "SCALP_JOURNAL" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Executed Futures Delta Hedges</span>
            <span className="font-mono text-[10px] text-primary">{scalpsList.length} Total Executions</span>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-border/60">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur font-semibold text-muted-foreground uppercase text-[10px]">
                <tr className="border-b border-border/60">
                  <th className="p-2.5">Time</th>
                  <th className="p-2.5">Spot Price</th>
                  <th className="p-2.5 text-right">Pre-Scalp $\Delta$</th>
                  <th className="p-2.5 text-center">Hedge Action</th>
                  <th className="p-2.5 text-right">Futures Qty</th>
                  <th className="p-2.5 text-right">Post-Scalp $\Delta$</th>
                  <th className="p-2.5 text-right">Cumulative Net PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 font-mono text-[11px]">
                {scalpsList.map((s, idx) => (
                  <tr key={idx} className="hover:bg-accent/30 transition-colors">
                    <td className="p-2.5 text-muted-foreground">{s.timeLabel}</td>
                    <td className="p-2.5 font-bold text-foreground">₹{s.spotPrice}</td>
                    <td className="p-2.5 text-right font-bold text-foreground">
                      {s.portfolioDelta > 0 ? "+" : ""}{s.portfolioDelta}
                    </td>
                    <td className="p-2.5 text-center font-sans">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                          s.actionTaken === "BUY_FUTURES"
                            ? "bg-gain/20 text-gain"
                            : "bg-loss/20 text-loss"
                        }`}
                      >
                        {s.actionTaken === "BUY_FUTURES" ? "BUY FUT" : "SELL FUT"}
                      </span>
                    </td>
                    <td className="p-2.5 text-right">{s.hedgeQty}</td>
                    <td className="p-2.5 text-right text-muted-foreground">{s.postHedgeDelta}</td>
                    <td className={`p-2.5 text-right font-bold ${s.netPnl >= 0 ? "text-gain" : "text-loss"}`}>
                      {s.netPnl >= 0 ? "+" : ""}{inr(s.netPnl)}
                    </td>
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
