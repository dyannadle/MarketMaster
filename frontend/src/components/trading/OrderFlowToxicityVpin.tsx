import React, { useState, useMemo } from "react";
import {
  Flame,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Activity,
  Layers,
  Lock,
  Zap,
  TrendingDown,
  Info,
  Clock,
  Sparkles,
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
import {
  generateVpinReport,
  VpinReport,
  VolumeBucket,
  VpinPoint,
} from "@/lib/vpin-toxicity";

export const OrderFlowToxicityVpin: React.FC<{ symbol?: string }> = ({ symbol = "NIFTY_FUT" }) => {
  const [bucketSize, setBucketSize] = useState(10000);
  const [rollingN, setRollingN] = useState(30);
  const [autoLockActive, setAutoLockActive] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const report: VpinReport = useMemo(() => {
    return generateVpinReport(symbol, bucketSize, rollingN, 800);
  }, [symbol, bucketSize, rollingN, refreshKey]);

  // Construct empirical CDF points from historical VPIN values
  const cdfChartData = useMemo(() => {
    const vpins = report.history.map((h) => h.vpin).sort((a, b) => a - b);
    if (vpins.length === 0) return [];

    const points = [];
    const step = Math.max(1, Math.floor(vpins.length / 25));
    for (let i = 0; i < vpins.length; i += step) {
      const v = vpins[i]!;
      const percentile = (i / (vpins.length - 1)) * 100;
      points.push({
        vpinPct: Number((v * 100).toFixed(1)),
        percentile: Number(percentile.toFixed(1)),
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
                Milestone 46
              </span>
              <h2 className="text-lg font-bold tracking-tight">
                High-Frequency Order Flow Toxicity & VPIN Monitor
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Volume-Synchronized Probability of Toxicity (Easley, López de Prado, O'Hara) tracking predatory institutional flow imbalance and flash liquidity vacuums.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                report.toxicityLevel === "CRITICAL_FLASH_RISK"
                  ? "bg-rose-500/10 text-rose-500 border border-rose-500/30 animate-pulse"
                  : report.toxicityLevel === "ELEVATED"
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30"
              }`}
            >
              <Flame className="size-3.5" />
              {report.toxicityLevel === "CRITICAL_FLASH_RISK"
                ? "CRITICAL TOXIC FLOW (>95th %ile)"
                : report.toxicityLevel === "ELEVATED"
                ? "ELEVATED TOXICITY (>80th %ile)"
                : "HEALTHY TWO-SIDED FLOW"}
            </span>
          </div>
        </div>
      </div>

      {/* Top KPI Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Current VPIN</div>
          <div className="mt-1 font-mono text-xl font-bold text-primary">
            {(report.currentVpin * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground">Rolling {report.rollingBuckets} volume buckets</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Toxicity Percentile (CDF)</div>
          <div
            className={`mt-1 font-mono text-xl font-bold ${
              report.currentCdfPercentile >= 95
                ? "text-rose-500"
                : report.currentCdfPercentile >= 80
                ? "text-amber-500"
                : "text-emerald-500"
            }`}
          >
            {report.currentCdfPercentile.toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground">Alert threshold: 95th percentile</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Bucket Size (V)</div>
          <div className="mt-1 font-mono text-xl font-bold text-foreground">
            {report.bucketSize.toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground">Constant trade volume slice</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Latest Imbalance Ratio</div>
          <div className="mt-1 font-mono text-xl font-bold text-foreground">
            {(report.recentImbalanceRatio * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground">|V_Buy - V_Sell| / V</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Rule 4.3 Protection Lock</div>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-base font-bold">
            {report.rule43RiskAlert ? (
              <span className="flex items-center gap-1 text-rose-500">
                <Lock className="size-4" /> LOCK ENGAGED
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-500">
                <ShieldCheck className="size-4" /> NORMAL SL
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground">Auto-tightens stops on toxic flow</div>
        </div>
      </div>

      {/* Main Grid: Controls & Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Controls Card (4 Cols) */}
        <div className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-bold">
              <Activity className="size-4 text-primary" /> VPIN Parameters
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground">High-Frequency Tick Tape</span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-medium">
                <span>Volume Bucket Size (V)</span>
                <span className="font-mono font-bold text-primary">{bucketSize.toLocaleString()} Shares</span>
              </div>
              <input
                type="range"
                min="5000"
                max="25000"
                step="2500"
                value={bucketSize}
                onChange={(e) => setBucketSize(parseInt(e.target.value))}
                className="mt-1.5 w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>5,000 (Sensitive)</span>
                <span>25,000 (Macro)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium">
                <span>Rolling Window (N Buckets)</span>
                <span className="font-mono font-bold text-foreground">{rollingN} Buckets</span>
              </div>
              <input
                type="range"
                min="15"
                max="50"
                step="5"
                value={rollingN}
                onChange={(e) => setRollingN(parseInt(e.target.value))}
                className="mt-1.5 w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>15 (Short Horizon)</span>
                <span>50 (Standard)</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div>
                <span className="font-bold text-foreground block">Auto Stop-Loss Tightening</span>
                <span className="text-[10px] text-muted-foreground">Tighten stops when VPIN &gt; 95th %ile</span>
              </div>
              <input
                type="checkbox"
                checked={autoLockActive}
                onChange={(e) => setAutoLockActive(e.target.checked)}
                className="size-4 accent-primary"
              />
            </div>

            <Button
              onClick={() => setRefreshKey((k) => k + 1)}
              variant="outline"
              className="w-full gap-2 font-bold text-xs"
            >
              <RotateCcw className="size-3.5" /> Re-sample Synthetic Tape Ticks
            </Button>
          </div>

          {/* Microstructure Toxicity Explainer */}
          <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
            <div className="flex items-center gap-1 font-bold text-foreground">
              <Info className="size-3.5 text-primary" /> Toxicity Invariant:
            </div>
            <p className="leading-relaxed">
              When market makers face informed adverse selection, one-sided volume dominates buckets, causing VPIN to spike.
              High VPIN warns of liquidity withdrawal and impending flash crashes.
            </p>
          </div>
        </div>

        {/* Price & VPIN Dual Curve (8 Cols) */}
        <div className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Price vs Rolling VPIN Toxicity Overlay
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Notice VPIN surges immediately preceding steep institutional sell sweeps.
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-primary">
              {symbol}
            </span>
          </div>

          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.history} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="bucketIndex" stroke="#888888" fontSize={11} tickFormatter={(b) => `B${b}`} />
                <YAxis yAxisId="price" orientation="left" stroke="#888888" fontSize={11} domain={["auto", "auto"]} />
                <YAxis yAxisId="vpin" orientation="right" stroke="#10b981" fontSize={11} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  formatter={(val: any, name: any) => [
                    name === "VPIN Toxicity" ? `${val}%` : `₹${Number(val).toFixed(2)}`,
                    name,
                  ]}
                  labelFormatter={(l) => `Volume Bucket #${l}`}
                  contentStyle={{ backgroundColor: "#1e1e24", borderColor: "#444" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="endPrice"
                  name="Price (₹)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="vpin"
                  type="monotone"
                  dataKey="vpinPct"
                  name="VPIN Toxicity"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dual Analysis: Empirical CDF & Recent Buckets Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Empirical CDF Distribution (5 Cols) */}
        <div className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Empirical VPIN Cumulative Distribution (CDF)
            </h3>
            <span className="font-mono text-[10px] text-rose-500 font-bold">
              95th Threshold: ~48%
            </span>
          </div>
          <div className="mt-4 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cdfChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="vpinPct" stroke="#888888" fontSize={11} tickFormatter={(v) => `${v}%`} />
                <YAxis stroke="#888888" fontSize={11} tickFormatter={(p) => `${p}%`} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, "CDF Percentile"]}
                  labelFormatter={(v) => `VPIN: ${v}%`}
                  contentStyle={{ backgroundColor: "#1e1e24", borderColor: "#444" }}
                />
                <Area
                  type="monotone"
                  dataKey="percentile"
                  name="Percentile Rank"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Volume Buckets Table (7 Cols) */}
        <div className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-7">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Recent Volume Buckets (V = {bucketSize.toLocaleString()})
            </h3>
            <span className="font-mono text-[10px] text-muted-foreground">
              Last {report.buckets.length} Buckets
            </span>
          </div>

          <div className="mt-3 overflow-x-auto max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 font-semibold text-muted-foreground sticky top-0">
                <tr>
                  <th className="py-1.5 px-2">Bucket</th>
                  <th className="py-1.5 px-2 text-right">Price</th>
                  <th className="py-1.5 px-2 text-right">Buy Vol</th>
                  <th className="py-1.5 px-2 text-right">Sell Vol</th>
                  <th className="py-1.5 px-2 text-right">Imbalance</th>
                  <th className="py-1.5 px-2 text-right">Ratio</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono">
                {report.buckets.map((b) => (
                  <tr key={b.bucketIndex} className="hover:bg-muted/20">
                    <td className="py-1.5 px-2 font-bold font-sans">#{b.bucketIndex}</td>
                    <td className="py-1.5 px-2 text-right">₹{b.endPrice.toFixed(2)}</td>
                    <td className="py-1.5 px-2 text-right text-emerald-500">{b.buyVolume.toLocaleString()}</td>
                    <td className="py-1.5 px-2 text-right text-rose-500">{b.sellVolume.toLocaleString()}</td>
                    <td className="py-1.5 px-2 text-right font-bold">{b.volumeImbalance.toLocaleString()}</td>
                    <td
                      className={`py-1.5 px-2 text-right font-bold ${
                        b.imbalanceRatio >= 0.5 ? "text-rose-500" : "text-muted-foreground"
                      }`}
                    >
                      {(b.imbalanceRatio * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
