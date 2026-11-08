import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  Sliders,
  TrendingUp,
  ShieldCheck,
  EyeOff,
  Layers,
  ArrowRight,
  Zap,
  Info,
  Timer,
  BarChart3,
  Scale,
} from "lucide-react";
import { inr } from "@/lib/data";

export type ExecutionAlgoType = "TWAP" | "VWAP" | "ICEBERG" | "ARBITRAGE";

export function InstitutionalExecutionAlgorithms() {
  const [activeAlgo, setActiveAlgo] = useState<ExecutionAlgoType>("TWAP");

  // Common parameters
  const [parentQty, setParentQty] = useState<number>(10000);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [slices, setSlices] = useState<number>(10);
  const [jitterPct, setJitterPct] = useState<number>(15);

  // Iceberg parameters
  const [visibleClip, setVisibleClip] = useState<number>(200);

  // Arbitrage parameters
  const [spotPrice, setSpotPrice] = useState<number>(24500);
  const [futuresPrice, setFuturesPrice] = useState<number>(24625);
  const [daysToExpiry, setDaysToExpiry] = useState<number>(21);
  const [riskFreeRate, setRiskFreeRate] = useState<number>(6.5);
  const [dividendYield, setDividendYield] = useState<number>(1.2);

  // 1. TWAP Slices Calculation with Randomized Jitter
  const twapData = useMemo(() => {
    const baseSlice = Math.round(parentQty / slices);
    const intervalMin = Math.round(durationMinutes / slices);
    const data = [];
    let remaining = parentQty;

    for (let i = 1; i <= slices; i++) {
      // Deterministic pseudo-jitter using sine wave to avoid hydration mismatch
      const jitterFactor = 1 + (Math.sin(i * 1.7) * (jitterPct / 100));
      let sliceQty = Math.round(baseSlice * jitterFactor);
      if (i === slices) sliceQty = remaining;
      else sliceQty = Math.min(sliceQty, remaining);
      remaining = Math.max(0, remaining - sliceQty);

      const timestamp = `T+${(i - 1) * intervalMin}m`;
      data.push({
        slice: `#${i}`,
        time: timestamp,
        qty: sliceQty,
        cumulative: parentQty - remaining,
        pct: Math.round(((parentQty - remaining) / parentQty) * 100),
      });
    }
    return data;
  }, [parentQty, slices, durationMinutes, jitterPct]);

  // Estimated Market Impact savings for TWAP
  const twapSavings = useMemo(() => {
    // Single market execution would slip ~0.85% on 10,000 contracts
    const lumpSumSlippage = parentQty * 24500 * 0.0085;
    // Sliced execution slips ~0.15% on each small clip
    const slicedSlippage = parentQty * 24500 * 0.0015;
    const savings = Math.round(lumpSumSlippage - slicedSlippage);
    return { lumpSumSlippage, slicedSlippage, savings };
  }, [parentQty]);

  // 2. VWAP U-Shaped Indian Market Volume Profile Calculation
  const vwapData = useMemo(() => {
    // 8 intraday time buckets (09:15 to 15:30 IST)
    const timeBuckets = [
      { slot: "09:15-10:00", weight: 0.26, name: "Market Open Surge" },
      { slot: "10:00-10:45", weight: 0.16, name: "Morning Follow-Through" },
      { slot: "10:45-11:45", weight: 0.11, name: "Consolidation" },
      { slot: "11:45-12:45", weight: 0.08, name: "Midday Lull" },
      { slot: "12:45-13:45", weight: 0.09, name: "Pre-Europe Activity" },
      { slot: "13:45-14:30", weight: 0.13, name: "European Open Rush" },
      { slot: "14:30-15:15", weight: 0.17, name: "Institutional Positioning" },
    ];

    let cumQty = 0;
    return timeBuckets.map((b, idx) => {
      const targetAllocation = Math.round(parentQty * b.weight);
      cumQty += targetAllocation;
      const simulatedPrice = 24500 + Math.sin(idx * 0.9) * 35;
      return {
        slot: b.slot,
        name: b.name,
        weightPct: Math.round(b.weight * 100),
        targetQty: targetAllocation,
        simulatedPrice: Math.round(simulatedPrice),
        cumQty,
      };
    });
  }, [parentQty]);

  // 3. Iceberg Queue & Concealed Depth Data
  const icebergData = useMemo(() => {
    const totalClips = Math.ceil(parentQty / visibleClip);
    const hiddenReserve = Math.max(0, parentQty - visibleClip);
    const hiddenPct = Math.round((hiddenReserve / parentQty) * 100);

    const depthQueue = [
      { level: "Best Ask 2", price: 24501.5, size: 850, type: "Market" },
      { level: "Best Ask 1", price: 24501.0, size: 420, type: "Market" },
      { level: "Spread", price: 24500.5, size: 0, type: "Spread" },
      { level: "Best Bid 1 (YOUR CLIP)", price: 24500.0, size: visibleClip, type: "YourVisibleClip" },
      { level: "Best Bid 2", price: 24499.5, size: 1200, type: "Market" },
      { level: "Best Bid 3", price: 24499.0, size: 1850, type: "Market" },
    ];

    return { totalClips, hiddenReserve, hiddenPct, depthQueue };
  }, [parentQty, visibleClip]);

  // 4. Cash-Futures Cash-and-Carry Arbitrage Math
  const arbData = useMemo(() => {
    const tYears = daysToExpiry / 365;
    // Fair Futures = Spot * exp((r - q) * T) ≈ Spot * (1 + (r - q) * T)
    const netCarryRate = (riskFreeRate - dividendYield) / 100;
    const fairFutures = Math.round((spotPrice * (1 + netCarryRate * tYears)) * 10) / 10;
    const currentBasis = futuresPrice - spotPrice;
    const fairBasis = Math.round((fairFutures - spotPrice) * 10) / 10;
    const mispricingSpread = Math.round((futuresPrice - fairFutures) * 10) / 10;

    // Annualized return if executing Cash & Carry
    const rawYieldPct = (currentBasis / spotPrice) * 100;
    const annualizedApy = daysToExpiry > 0 ? (rawYieldPct * (365 / daysToExpiry)) : 0;

    // Decay convergence curve to expiry day
    const convergenceCurve = [];
    for (let d = daysToExpiry; d >= 0; d -= Math.max(1, Math.round(daysToExpiry / 10))) {
      const frac = d / Math.max(1, daysToExpiry);
      const modeledBasis = Math.round(currentBasis * frac * 10) / 10;
      convergenceCurve.push({
        daysLeft: `T-${d}d`,
        basis: modeledBasis,
        spot: spotPrice,
        futures: Math.round(spotPrice + modeledBasis),
      });
    }

    return {
      fairFutures,
      currentBasis,
      fairBasis,
      mispricingSpread,
      annualizedApy: Math.round(annualizedApy * 100) / 100,
      convergenceCurve,
    };
  }, [spotPrice, futuresPrice, daysToExpiry, riskFreeRate, dividendYield]);

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-5 shadow-sm">
      {/* Header & Algorithm Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold tracking-tight">Institutional Execution Algorithms Suite</h2>
          <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
            Market Impact Minimization
          </span>
        </div>

        {/* Algo Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {(
            [
              { id: "TWAP", label: "TWAP Slicer", icon: Timer },
              { id: "VWAP", label: "VWAP Curve", icon: BarChart3 },
              { id: "ICEBERG", label: "Iceberg Queue", icon: EyeOff },
              { id: "ARBITRAGE", label: "Cash & Carry Arbitrage", icon: Scale },
            ] as const
          ).map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                onClick={() => setActiveAlgo(a.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  activeAlgo === a.id
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-secondary/40 text-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ALGO 1: TWAP Slicer */}
      {activeAlgo === "TWAP" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3 text-xs">
            <div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parent Order Quantity</span>
                <span className="font-mono font-bold text-foreground">{parentQty.toLocaleString()} units</span>
              </div>
              <input
                type="range"
                min={2000}
                max={50000}
                step={1000}
                value={parentQty}
                onChange={(e) => setParentQty(Number(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>

            <div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Child Slices</span>
                <span className="font-mono font-bold text-foreground">{slices} Orders</span>
              </div>
              <input
                type="range"
                min={4}
                max={20}
                value={slices}
                onChange={(e) => setSlices(Number(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>

            <div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Randomized Jitter</span>
                <span className="font-mono font-bold text-foreground">±{jitterPct}% Anti-HFT</span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={5}
                value={jitterPct}
                onChange={(e) => setJitterPct(Number(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>
          </div>

          {/* Savings Metric Callout */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-400" />
              <div>
                <span className="font-bold text-foreground">Market Impact Alpha: </span>
                <span className="text-muted-foreground">
                  Slicing order avoids sweeping book depth.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 font-mono">
              <span className="text-muted-foreground">Est. Savings:</span>
              <span className="text-sm font-bold text-sky-400">+{inr(twapSavings.savings)}</span>
            </div>
          </div>

          {/* Slicing Bar Chart */}
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={twapData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.6} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#888888" }} />
                <YAxis tick={{ fontSize: 10, fill: "#888888" }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length && payload[0]?.payload) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-lg font-mono">
                          <p className="text-muted-foreground">{d.slice} @ {d.time}</p>
                          <p className="font-bold text-primary">Clip Size: {d.qty.toLocaleString()} units</p>
                          <p className="text-[10px] text-muted-foreground">Cumulative Filled: {d.pct}%</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="qty" fill="#38bdf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ALGO 2: VWAP Intraday Curve */}
      {activeAlgo === "VWAP" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <span className="font-bold text-foreground">Intraday Volume-Weighted Pacing: </span>
              <span className="text-muted-foreground">
                Matches the historical U-shaped intraday volume curve on the NSE.
              </span>
            </div>
            <span className="font-mono text-xs font-bold text-primary">
              Parent: {parentQty.toLocaleString()} units
            </span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vwapData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.6} />
                <XAxis dataKey="slot" tick={{ fontSize: 9, fill: "#888888" }} />
                <YAxis tick={{ fontSize: 10, fill: "#888888" }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length && payload[0]?.payload) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-lg font-mono">
                          <p className="font-bold text-foreground">{d.name} ({d.slot})</p>
                          <p className="text-primary font-bold">Target Allocation: {d.targetQty.toLocaleString()} units ({d.weightPct}%)</p>
                          <p className="text-muted-foreground text-[10px]">Benchmark Price: ₹{d.simulatedPrice}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="targetQty" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
            {vwapData.slice(0, 4).map((v) => (
              <div key={v.slot} className="rounded border border-border/60 bg-accent/20 p-2">
                <span className="text-[10px] text-muted-foreground block">{v.slot}</span>
                <span className="font-bold text-purple-400">{v.targetQty.toLocaleString()} units</span>
                <span className="text-[10px] text-muted-foreground ml-1">({v.weightPct}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALGO 3: Iceberg Queue */}
      {activeAlgo === "ICEBERG" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 text-xs">
            <div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Hidden Parent Order</span>
                <span className="font-mono font-bold text-foreground">{parentQty.toLocaleString()} units</span>
              </div>
              <input
                type="range"
                min={1000}
                max={50000}
                step={1000}
                value={parentQty}
                onChange={(e) => setParentQty(Number(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>

            <div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Visible Display Clip Size</span>
                <span className="font-mono font-bold text-emerald-400">{visibleClip} units</span>
              </div>
              <input
                type="range"
                min={50}
                max={1000}
                step={50}
                value={visibleClip}
                onChange={(e) => setVisibleClip(Number(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>
          </div>

          {/* Iceberg Queue Status Banner */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <EyeOff className="h-4 w-4 text-emerald-400" />
                <div>
                  <span className="font-bold text-foreground">Concealed Liquidity: </span>
                  <span className="text-muted-foreground font-mono">
                    {icebergData.hiddenPct}% of order hidden from public Level-2 order book.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 font-mono">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Visible to Market</span>
                  <span className="font-bold text-emerald-400">{visibleClip} units</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Hidden In Queue</span>
                  <span className="font-bold text-muted-foreground">{icebergData.hiddenReserve.toLocaleString()} units</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Clips Needed</span>
                  <span className="font-bold text-foreground">{icebergData.totalClips} fills</span>
                </div>
              </div>
            </div>
          </div>

          {/* Level 2 Depth Visualizer with Iceberg highlighted */}
          <div className="rounded-lg border border-border/80 bg-background/60 p-3 font-mono text-xs">
            <div className="text-[11px] font-sans font-bold text-muted-foreground mb-2 flex justify-between">
              <span>SIMULATED LEVEL-2 DEPTH LADDER</span>
              <span className="text-emerald-400">YOUR VISIBLE CLIP ACTIVE</span>
            </div>
            <div className="divide-y divide-border/20">
              {icebergData.depthQueue.map((row, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between py-1 px-2 ${
                    row.type === "YourVisibleClip"
                      ? "bg-emerald-500/15 border-l-2 border-emerald-400 font-bold"
                      : row.type === "Spread"
                      ? "bg-accent/20 text-muted-foreground text-[10px] italic"
                      : ""
                  }`}
                >
                  <span className="text-muted-foreground">{row.level}</span>
                  <span className="font-bold text-foreground">₹{row.price.toFixed(1)}</span>
                  <span className={row.type === "YourVisibleClip" ? "text-emerald-400 font-bold" : "text-muted-foreground"}>
                    {row.size > 0 ? `${row.size} units` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ALGO 4: Cash-Futures Arbitrage Simulator */}
      {activeAlgo === "ARBITRAGE" && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 text-xs">
            <div>
              <span className="text-muted-foreground block">Nifty Spot Price (Cash)</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-muted-foreground font-mono">₹</span>
                <input
                  type="number"
                  value={spotPrice}
                  onChange={(e) => setSpotPrice(Number(e.target.value))}
                  className="w-full rounded border border-border bg-background px-2 py-1 font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <span className="text-muted-foreground block">Nifty Futures Price (Derivatives)</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-muted-foreground font-mono">₹</span>
                <input
                  type="number"
                  value={futuresPrice}
                  onChange={(e) => setFuturesPrice(Number(e.target.value))}
                  className="w-full rounded border border-border bg-background px-2 py-1 font-mono font-bold text-primary"
                />
              </div>
            </div>

            <div>
              <span className="text-muted-foreground block">Days to Expiry (T)</span>
              <input
                type="number"
                min={1}
                max={90}
                value={daysToExpiry}
                onChange={(e) => setDaysToExpiry(Number(e.target.value))}
                className="w-full rounded border border-border bg-background px-2 py-1 font-mono font-bold mt-1"
              />
            </div>
          </div>

          {/* Arbitrage Metrics Banner */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Scale className="h-4 w-4 text-amber-400" /> Cash-and-Carry Arbitrage Opportunity
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Long Spot Equity + Short Overvalued Futures locks in risk-free theoretical basis convergence.
                </p>
              </div>

              <div className="flex items-center gap-4 font-mono">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Current Basis</span>
                  <span className="font-bold text-amber-400">+₹{arbData.currentBasis.toFixed(1)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Fair Basis</span>
                  <span className="font-semibold text-muted-foreground">+₹{arbData.fairBasis.toFixed(1)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Annualized APY</span>
                  <span className="text-sm font-black text-emerald-400">{arbData.annualizedApy}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Basis Decay Convergence Chart */}
          <div className="h-44 w-full">
            <div className="text-[10px] text-muted-foreground mb-1 font-mono">
              Theoretical Basis Decay Convergence to Expiry ($T \rightarrow 0$)
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={arbData.convergenceCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.6} />
                <XAxis dataKey="daysLeft" tick={{ fontSize: 10, fill: "#888888" }} />
                <YAxis tick={{ fontSize: 10, fill: "#888888" }} domain={["auto", "auto"]} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length && payload[0]?.payload) {
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-lg font-mono">
                          <p className="text-muted-foreground">{d.daysLeft} to Expiry</p>
                          <p className="font-bold text-amber-400">Basis Spread: ₹{d.basis}</p>
                          <p className="text-foreground">Futures Price: ₹{d.futures}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="basis" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
