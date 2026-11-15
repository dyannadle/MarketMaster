// Milestone 37: Real-Time Options Implied Volatility Surface Interpolator & Volatility Arbitrage Scanner UI
import { useState, useMemo } from "react";
import {
  ShieldAlert,
  Zap,
  TrendingUp,
  RefreshCw,
  Scale,
  Sparkles,
  Layers,
  ArrowRight,
  AlertTriangle,
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
import { toast } from "sonner";
import { inr } from "@/lib/data";
import {
  OptionQuote,
  ArbitrageViolation,
  generateMarketOptionQuotes,
  runVolatilityArbitrageAnalysis,
} from "@/lib/volatility-arbitrage";

export function VolatilityArbitrageScanner() {
  const [selectedSymbol, setSelectedSymbol] = useState<"NIFTY" | "BANKNIFTY">("NIFTY");
  const spotPrice = selectedSymbol === "NIFTY" ? 24200 : 51800;

  const [quotes, setQuotes] = useState<OptionQuote[]>(() => generateMarketOptionQuotes(spotPrice));
  const [selectedDteFilter, setSelectedDteFilter] = useState<number | "ALL">("ALL");
  const [selectedTab, setSelectedTab] = useState<"ARBITRAGE_ALERTS" | "HEATMAP" | "SMILE_CROSS_SECTION">("ARBITRAGE_ALERTS");

  const report = useMemo(() => {
    return runVolatilityArbitrageAnalysis(selectedSymbol, spotPrice, quotes, 0.065);
  }, [selectedSymbol, spotPrice, quotes]);

  const handleRefreshQuotes = () => {
    setQuotes(generateMarketOptionQuotes(spotPrice));
    toast.success(`Refreshed options surface quotes for ${selectedSymbol} (Spot: ₹${spotPrice.toLocaleString("en-IN")})`);
  };

  const handleExecuteArbitrage = (violation: ArbitrageViolation) => {
    toast.success(
      `Synthetically executed ${violation.type}! Booked upfront risk-free credit of ${inr(violation.guaranteedProfit)} on lot size 50.`
    );
  };

  const dteOptions = useMemo(() => {
    const set = new Set<number>();
    quotes.forEach((q) => set.add(q.dte));
    return Array.from(set).sort((a, b) => a - b);
  }, [quotes]);

  const filteredGrid = useMemo(() => {
    if (selectedDteFilter === "ALL") return report.surfaceGrid;
    return report.surfaceGrid.filter((pt) => pt.dte === selectedDteFilter);
  }, [report.surfaceGrid, selectedDteFilter]);

  // Data for Smile cross-section chart for a chosen DTE
  const activeChartDte = selectedDteFilter === "ALL" ? (dteOptions[0] ?? 7) : selectedDteFilter;
  const chartData = useMemo(() => {
    return report.surfaceGrid
      .filter((pt) => pt.dte === activeChartDte)
      .sort((a, b) => a.strike - b.strike)
      .map((pt) => ({
        strike: pt.strike,
        marketIv: pt.marketIv,
        fittedIv: pt.interpolatedIv,
        residual: pt.residualIv,
        fittedCall: pt.fittedCallPrice,
      }));
  }, [report.surfaceGrid, activeChartDte]);

  const totalViolationsCount = report.butterflyViolations.length + report.calendarViolations.length;

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 md:p-6 shadow-sm">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              IV Surface Interpolator & Volatility Arbitrage Scanner
            </h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary border border-primary/20">
              Milestone 37 / RBF Spline
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Bivariate thin-plate spline interpolation with real-time negative butterfly and calendar spread convexity violation detection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Symbol Selector */}
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
            <button
              onClick={() => {
                setSelectedSymbol("NIFTY");
                setQuotes(generateMarketOptionQuotes(24200));
              }}
              className={`rounded-md px-3 py-1 font-semibold transition-all ${
                selectedSymbol === "NIFTY" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              NIFTY 50 (₹24,200)
            </button>
            <button
              onClick={() => {
                setSelectedSymbol("BANKNIFTY");
                setQuotes(generateMarketOptionQuotes(51800));
              }}
              className={`rounded-md px-3 py-1 font-semibold transition-all ${
                selectedSymbol === "BANKNIFTY" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              BANK NIFTY (₹51,800)
            </button>
          </div>

          <button
            onClick={handleRefreshQuotes}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            Rescan Quotes
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Arbitrage Status</span>
          <div className="mt-1 flex items-center gap-1.5">
            {totalViolationsCount > 0 ? (
              <>
                <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" />
                <span className="font-bold text-amber-500 text-sm">{totalViolationsCount} Violations Found</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-gain" />
                <span className="font-bold text-gain text-sm">Arbitrage-Free Surface</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {report.butterflyViolations.length} Fly + {report.calendarViolations.length} Calendar
          </span>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400">Max Risk-Free Profit</span>
          <p className="num mt-1 font-mono text-base font-black text-gain">
            +{inr(report.maxArbitrageProfitInr)}
          </p>
          <span className="text-[10px] text-muted-foreground">Upfront arbitrage credit (50 lot)</span>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Surface Fitting RMSE</span>
          <p className="num mt-1 font-mono text-base font-bold text-foreground">
            {report.surfaceSmoothingRmse.toFixed(2)}% vol
          </p>
          <span className="text-[10px] text-muted-foreground">RBF thin-plate spline fit</span>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Maturities & Strikes</span>
          <p className="num mt-1 font-mono text-base font-bold text-primary">
            {dteOptions.length} Exp / {report.quoteCount} Quotes
          </p>
          <span className="text-[10px] text-muted-foreground">7D, 14D, 28D, 60D DTEs</span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedTab("ARBITRAGE_ALERTS")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              selectedTab === "ARBITRAGE_ALERTS"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Zap className="h-3.5 w-3.5" /> Arbitrage Alerts ({totalViolationsCount})
          </button>
          <button
            onClick={() => setSelectedTab("HEATMAP")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              selectedTab === "HEATMAP"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Layers className="h-3.5 w-3.5" /> Surface Residual Heatmap
          </button>
          <button
            onClick={() => setSelectedTab("SMILE_CROSS_SECTION")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              selectedTab === "SMILE_CROSS_SECTION"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" /> Smile Cross-Section ({activeChartDte}D)
          </button>
        </div>

        {/* DTE Filter */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[11px] text-muted-foreground font-semibold">DTE:</span>
          <select
            value={selectedDteFilter}
            onChange={(e) => setSelectedDteFilter(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
            className="rounded border border-border bg-background px-2 py-1 text-xs font-semibold"
          >
            <option value="ALL">All Expiries</option>
            {dteOptions.map((dte) => (
              <option key={dte} value={dte}>{dte} Days</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab 1: Arbitrage Alerts */}
      {selectedTab === "ARBITRAGE_ALERTS" && (
        <div className="space-y-3">
          {totalViolationsCount === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-gain/80" />
              <h3 className="mt-2 text-sm font-bold text-foreground">No Static Arbitrage Violations Detected</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-md">
                The current option prices satisfy strike convexity ($C(K_1) - 2C(K_2) + C(K_3) \ge 0$) and maturity monotonicity ($C(K, T_1) \le C(K, T_2)$).
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {[...report.butterflyViolations, ...report.calendarViolations].map((violation) => (
                <div
                  key={violation.id}
                  className="flex flex-col justify-between rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-amber-500">
                        {violation.type.replace(/_/g, " ")}
                      </span>
                      <span className="font-mono text-xs font-bold text-gain">
                        +{inr(violation.guaranteedProfit)} Profit
                      </span>
                    </div>

                    <h4 className="mt-2 text-xs font-bold text-foreground">
                      {violation.description}
                    </h4>

                    <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                      {violation.tradeRecommendation}
                    </p>

                    {/* Legs Breakdown */}
                    <div className="mt-3 space-y-1.5 rounded-lg border border-border/40 bg-background/60 p-2.5">
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">Execution Structure:</span>
                      <div className="grid grid-cols-3 gap-1 text-[11px] font-mono">
                        {violation.legs.map((leg, idx) => (
                          <div
                            key={idx}
                            className={`rounded px-1.5 py-0.5 text-center font-bold ${
                              leg.action === "BUY" ? "bg-gain/15 text-gain" : "bg-loss/15 text-loss"
                            }`}
                          >
                            {leg.action} {leg.qty}x {leg.strike} {leg.type}
                            <span className="block text-[9px] font-normal text-muted-foreground">₹{leg.price.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                    <span className="text-[10px] text-muted-foreground">
                      Edge: <strong className="text-foreground">{violation.theoreticalSpreadBps} bps</strong>
                    </span>
                    <button
                      onClick={() => handleExecuteArbitrage(violation)}
                      className="flex items-center gap-1.5 rounded-lg bg-gain px-3 py-1.5 text-xs font-bold text-white hover:bg-gain/90 transition-all shadow"
                    >
                      <Zap className="h-3.5 w-3.5" /> Execute Synthetic Arbitrage
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Surface Residual Heatmap */}
      {selectedTab === "HEATMAP" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Market IV vs Arbitrage-Free Fitted Surface IV</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-emerald-500"></span> Undervalued ($\Delta IV &lt; -1.4\%$)
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-rose-500"></span> Overvalued ($\Delta IV &gt; +1.4\%$)
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-amber-500"></span> Convexity Arbitrage
              </span>
            </div>
          </div>

          <div className="max-h-[420px] overflow-auto rounded-lg border border-border/60">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur font-semibold text-muted-foreground uppercase text-[10px]">
                <tr className="border-b border-border/60">
                  <th className="p-2.5">Expiry</th>
                  <th className="p-2.5">Strike</th>
                  <th className="p-2.5">Moneyness</th>
                  <th className="p-2.5 text-right">Market IV</th>
                  <th className="p-2.5 text-right">Fitted IV</th>
                  <th className="p-2.5 text-right">Residual ($\Delta IV$)</th>
                  <th className="p-2.5 text-right">Fitted Call Price</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 font-mono text-[11px]">
                {filteredGrid.map((pt, idx) => {
                  const isOver = pt.status === "OVERVALUED";
                  const isUnder = pt.status === "UNDERVALUED";
                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-accent/30 transition-colors ${
                        pt.isArbitrageViolation ? "bg-amber-500/10 font-bold" : ""
                      }`}
                    >
                      <td className="p-2.5 font-sans font-semibold">{pt.dte}D Expiry</td>
                      <td className="p-2.5 font-bold text-foreground">₹{pt.strike}</td>
                      <td className="p-2.5 text-muted-foreground">{(pt.moneyness * 100).toFixed(1)}%</td>
                      <td className="p-2.5 text-right">{pt.marketIv.toFixed(1)}%</td>
                      <td className="p-2.5 text-right text-primary">{pt.interpolatedIv.toFixed(1)}%</td>
                      <td className={`p-2.5 text-right font-bold ${isOver ? "text-loss" : isUnder ? "text-gain" : "text-muted-foreground"}`}>
                        {pt.residualIv > 0 ? "+" : ""}{pt.residualIv.toFixed(1)}%
                      </td>
                      <td className="p-2.5 text-right text-foreground">₹{pt.fittedCallPrice.toFixed(1)}</td>
                      <td className="p-2.5 text-center font-sans">
                        <span
                          className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${
                            pt.isArbitrageViolation
                              ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                              : isOver
                              ? "bg-loss/15 text-loss"
                              : isUnder
                              ? "bg-gain/15 text-gain"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {pt.isArbitrageViolation ? "ARBITRAGE" : pt.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Smile Cross-Section Chart */}
      {selectedTab === "SMILE_CROSS_SECTION" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Market Volatility Quotes vs Arbitrage-Free Fitted Spline ({activeChartDte} Days to Expiry)</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-semibold text-rose-400">
                <span className="size-2 rounded-full bg-rose-400"></span> Market IV (%)
              </span>
              <span className="flex items-center gap-1 font-semibold text-primary">
                <span className="size-2 rounded-full bg-primary"></span> RBF Spline Fitted IV (%)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <XAxis
                  dataKey="strike"
                  stroke="#888888"
                  fontSize={10}
                  tickFormatter={(v) => `₹${v}`}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={10}
                  domain={["auto", "auto"]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="rounded-lg border border-border bg-background p-2.5 text-xs shadow-md">
                        <p className="font-bold text-foreground">Strike: ₹{d.strike}</p>
                        <p className="text-rose-400">Market IV: {d.marketIv}%</p>
                        <p className="text-primary font-semibold">Fitted Arbitrage-Free IV: {d.fittedIv}%</p>
                        <p className="text-muted-foreground font-mono">Residual: {d.residual > 0 ? "+" : ""}{d.residual}%</p>
                        <p className="text-foreground font-mono">Theoretical Call: ₹{d.fittedCall}</p>
                      </div>
                    );
                  }}
                />
                <ReferenceLine x={spotPrice} stroke="#eab308" strokeDasharray="3 3" label={{ value: "ATM Spot", fill: "#eab308", fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="fittedIv"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="marketIv"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={{ r: 4, fill: "#f43f5e" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
