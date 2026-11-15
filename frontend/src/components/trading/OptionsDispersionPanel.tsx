import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Percent,
  Layers,
  Scale,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Info,
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
  BarChart,
  Bar,
} from "recharts";
import { inr } from "@/lib/data";
import {
  buildDispersionState,
  runDispersionSimulation,
  DEFAULT_NIFTY_CONSTITUENTS,
  DispersionPortfolioState,
} from "@/lib/options-dispersion";

export const OptionsDispersionPanel: React.FC = () => {
  const [indexIv, setIndexIv] = useState(0.165); // 16.5%
  const [realizedCorr, setRealizedCorr] = useState(0.42); // 0.42
  const [spreadThreshold, setSpreadThreshold] = useState(0.08); // 8% spread
  const [durationDays, setDurationDays] = useState(20);

  const state: DispersionPortfolioState = useMemo(() => {
    return buildDispersionState(24500, indexIv, realizedCorr, spreadThreshold, DEFAULT_NIFTY_CONSTITUENTS);
  }, [indexIv, realizedCorr, spreadThreshold]);

  const report = useMemo(() => {
    return runDispersionSimulation(state, durationDays, 1000000);
  }, [state, durationDays]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-secondary/10 p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-black uppercase text-primary">
                Milestone 43
              </span>
              <h2 className="text-lg font-bold tracking-tight">
                Options Dispersion & Implied Correlation Arbitrage Engine
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Exploits volatility pricing dislocations between Nifty 50 index options and its top constituent equities
              via the weighted equicorrelation theorem.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                state.tradeRecommendation === "LONG_DISPERSION"
                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                  : state.tradeRecommendation === "SHORT_DISPERSION"
                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Sparkles className="size-3.5" />
              {state.tradeRecommendation === "LONG_DISPERSION"
                ? "LONG DISPERSION (BUY BASKET, SELL INDEX)"
                : state.tradeRecommendation === "SHORT_DISPERSION"
                ? "SHORT DISPERSION (SELL BASKET, BUY INDEX)"
                : "CORRELATION IN EQUILIBRIUM"}
            </span>
          </div>
        </div>
      </div>

      {/* Top KPI Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Implied Correlation (ρ_iv)</div>
          <div className="mt-1 font-mono text-xl font-bold text-primary">
            {(state.impliedCorrelation * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground">Extracted from Nifty & basket IVs</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Realized Correlation (ρ_real)</div>
          <div className="mt-1 font-mono text-xl font-bold text-foreground">
            {(state.realizedCorrelation * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground">Rolling 30-day stock returns</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Correlation Spread (Δρ)</div>
          <div
            className={`mt-1 font-mono text-xl font-bold ${
              state.correlationSpread >= 0 ? "text-emerald-500" : "text-amber-500"
            }`}
          >
            {state.correlationSpread >= 0 ? "+" : ""}
            {(state.correlationSpread * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground">Threshold: ±{(state.spreadThreshold * 100).toFixed(0)}%</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Dispersion Net P&L</div>
          <div
            className={`mt-1 font-mono text-xl font-bold ${
              report.totalPnL >= 0 ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {inr(report.totalPnL)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Return: {report.returnPct >= 0 ? "+" : ""}
            {report.returnPct}% (Sharpe: {report.sharpeRatio})
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Rule 4.3 Risk Status</div>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-lg font-bold">
            {report.rule43Compliant ? (
              <span className="flex items-center gap-1 text-emerald-500">
                <ShieldCheck className="size-4" /> PASSED
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-500">
                <AlertTriangle className="size-4" /> BREACHED
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground">Max DD: {report.maxDrawdownPct}% (Limit: 1.5%)</div>
        </div>
      </div>

      {/* Interactive Controls & Strategy Setup */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Controls Card */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Scale className="size-4 text-primary" /> Volatility & Model Controls
          </h3>
          <div className="mt-4 space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-medium">
                <span>Nifty 50 Implied Vol (IV)</span>
                <span className="font-mono font-bold text-primary">{(indexIv * 100).toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0.12"
                max="0.25"
                step="0.005"
                value={indexIv}
                onChange={(e) => setIndexIv(parseFloat(e.target.value))}
                className="mt-1.5 w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>12.0% (Subdued)</span>
                <span>25.0% (Elevated)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium">
                <span>Realized Return Correlation (ρ)</span>
                <span className="font-mono font-bold text-foreground">{(realizedCorr * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="0.70"
                step="0.02"
                value={realizedCorr}
                onChange={(e) => setRealizedCorr(parseFloat(e.target.value))}
                className="mt-1.5 w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>20% (Decoupled)</span>
                <span>70% (Synchronous)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium">
                <span>Arbitrage Trigger Threshold</span>
                <span className="font-mono font-bold text-foreground">±{(spreadThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.04"
                max="0.15"
                step="0.01"
                value={spreadThreshold}
                onChange={(e) => setSpreadThreshold(parseFloat(e.target.value))}
                className="mt-1.5 w-full accent-primary"
              />
            </div>

            <div>
              <div className="flex justify-between font-medium">
                <span>Simulation Horizon (Days)</span>
                <span className="font-mono font-bold text-foreground">{durationDays} Days</span>
              </div>
              <input
                type="range"
                min="10"
                max="30"
                step="5"
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value))}
                className="mt-1.5 w-full accent-primary"
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1 font-semibold text-foreground">
                <Info className="size-3.5" /> Theoretical Equicorrelation Rule:
              </div>
              <p className="mt-1 leading-relaxed">
                When index options are rich relative to components, implied correlation exceeds realized correlation.
                Long dispersion is gamma-positive on component moves and short index correlation.
              </p>
            </div>
          </div>
        </div>

        {/* Structure Breakdown Card */}
        <div className="rounded-xl border bg-card p-5 shadow-xs lg:col-span-2">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Layers className="size-4 text-primary" /> Active Dispersion Execution Legs
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Vega-neutral and delta-neutral paired straddle structure dynamically sized across constituent weights.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Index Leg */}
            <div className="rounded-lg border border-border/80 bg-background/50 p-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-primary">Index Leg: NIFTY 50 ATM</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    state.tradeRecommendation === "LONG_DISPERSION"
                      ? "bg-rose-500/10 text-rose-600"
                      : "bg-emerald-500/10 text-emerald-600"
                  }`}
                >
                  {state.tradeRecommendation === "LONG_DISPERSION" ? "SHORT 10 LOTS" : "LONG 10 LOTS"}
                </span>
              </div>
              <div className="mt-2 space-y-1 text-[11px] text-muted-foreground font-mono">
                <div className="flex justify-between">
                  <span>Strike / Spot:</span>
                  <span className="text-foreground">24,500 CE + PE</span>
                </div>
                <div className="flex justify-between">
                  <span>Straddle Premium:</span>
                  <span className="text-foreground">{inr(state.indexStraddlePrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Net Vega per lot:</span>
                  <span className="text-foreground">{state.indexVega.toFixed(1)}</span>
                </div>
              </div>
            </div>

            {/* Component Basket Leg */}
            <div className="rounded-lg border border-border/80 bg-background/50 p-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-500">Component Basket: Top 5 Equities</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    state.tradeRecommendation === "LONG_DISPERSION"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-rose-500/10 text-rose-600"
                  }`}
                >
                  {state.tradeRecommendation === "LONG_DISPERSION" ? "LONG BASKET" : "SHORT BASKET"}
                </span>
              </div>
              <div className="mt-2 space-y-1 text-[11px] text-muted-foreground font-mono">
                <div className="flex justify-between">
                  <span>Weights:</span>
                  <span className="text-foreground">HDFC 30%, REL 24%, ICICI 18%...</span>
                </div>
                <div className="flex justify-between">
                  <span>Vega Neutrality:</span>
                  <span className="text-foreground">Matched to Index Total Vega</span>
                </div>
                <div className="flex justify-between">
                  <span>Hedging Style:</span>
                  <span className="text-foreground">Delta-Neutral ATM Straddles</span>
                </div>
              </div>
            </div>
          </div>

          {/* Constituent Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
                <tr>
                  <th className="py-1.5 px-2">Constituent</th>
                  <th className="py-1.5 px-2 text-right">Weight</th>
                  <th className="py-1.5 px-2 text-right">Spot (₹)</th>
                  <th className="py-1.5 px-2 text-right">IV (%)</th>
                  <th className="py-1.5 px-2 text-right">Straddle (₹)</th>
                  <th className="py-1.5 px-2 text-right">Vega</th>
                  <th className="py-1.5 px-2 text-right">Gamma</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono">
                {state.constituents.map((c) => (
                  <tr key={c.symbol} className="hover:bg-muted/20">
                    <td className="py-1.5 px-2 font-bold font-sans">
                      {c.symbol} <span className="text-[10px] text-muted-foreground font-normal">({c.name})</span>
                    </td>
                    <td className="py-1.5 px-2 text-right text-primary font-bold">{(c.weight * 100).toFixed(0)}%</td>
                    <td className="py-1.5 px-2 text-right">{c.spot.toLocaleString()}</td>
                    <td className="py-1.5 px-2 text-right">{(c.impliedVol * 100).toFixed(1)}%</td>
                    <td className="py-1.5 px-2 text-right">{c.straddlePrice.toFixed(1)}</td>
                    <td className="py-1.5 px-2 text-right text-muted-foreground">{c.vega.toFixed(1)}</td>
                    <td className="py-1.5 px-2 text-right text-muted-foreground">{c.gamma.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cumulative PnL Curve */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Cumulative Dispersion P&L Trajectory
            </h3>
            <span className="font-mono text-xs font-bold text-emerald-500">
              Final: {inr(report.totalPnL)}
            </span>
          </div>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={report.steps} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="day" stroke="#888888" fontSize={11} tickFormatter={(d) => `D${d}`} />
                <YAxis stroke="#888888" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, "P&L"]}
                  labelFormatter={(l) => `Day ${l}`}
                  contentStyle={{ backgroundColor: "#1e1e24", borderColor: "#444" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="cumulativePnL"
                  name="Net Dispersion P&L"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="basketPnL"
                  name="Basket Options Leg"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="indexPnL"
                  name="Index Option Leg"
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Greek Attribution: Gamma Rent vs Theta Bleed */}
        <div className="rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Greek Attribution: Net Gamma Rent vs Theta Bleed
            </h3>
            <span className="font-mono text-xs text-muted-foreground">
              Gamma: {inr(report.gammaRentAttribution)} | Theta: {inr(report.thetaBleedAttribution)}
            </span>
          </div>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report.steps} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="day" stroke="#888888" fontSize={11} tickFormatter={(d) => `D${d}`} />
                <YAxis stroke="#888888" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, "INR"]}
                  labelFormatter={(l) => `Day ${l}`}
                  contentStyle={{ backgroundColor: "#1e1e24", borderColor: "#444" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="netGammaRent" name="Net Gamma Rent" fill="#10b981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="netThetaBleed" name="Net Theta Bleed" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Daily Audit Log */}
      <div className="rounded-xl border bg-card p-5 shadow-xs">
        <h3 className="text-sm font-bold">Daily Dispersion Simulation Audit Journal</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Step-by-step mark-to-market performance, gamma harvest, theta bleed, and Rule 4.3 drawdown checks.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-muted/40 font-semibold text-muted-foreground">
              <tr>
                <th className="py-2 px-3">Day</th>
                <th className="py-2 px-3 text-right">Nifty Spot</th>
                <th className="py-2 px-3 text-right">Net Gamma Rent</th>
                <th className="py-2 px-3 text-right">Net Theta Bleed</th>
                <th className="py-2 px-3 text-right">Daily P&L</th>
                <th className="py-2 px-3 text-right">Cumulative P&L</th>
                <th className="py-2 px-3 text-right">Max Drawdown</th>
                <th className="py-2 px-3 text-center">Rule 4.3</th>
              </tr>
            </thead>
            <tbody className="divide-y font-mono">
              {report.steps.map((step) => (
                <tr key={step.day} className="hover:bg-muted/20">
                  <td className="py-2 px-3 font-bold font-sans">Day {step.day}</td>
                  <td className="py-2 px-3 text-right">{step.indexSpot.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-emerald-500 font-bold">
                    +{inr(step.netGammaRent)}
                  </td>
                  <td className="py-2 px-3 text-right text-rose-500 font-bold">
                    {inr(step.netThetaBleed)}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-bold ${
                      step.netGammaRent + step.netThetaBleed - step.transactionFriction >= 0
                        ? "text-emerald-500"
                        : "text-rose-500"
                    }`}
                  >
                    {inr(step.netGammaRent + step.netThetaBleed - step.transactionFriction)}
                  </td>
                  <td
                    className={`py-2 px-3 text-right font-bold ${
                      step.cumulativePnL >= 0 ? "text-emerald-500" : "text-rose-500"
                    }`}
                  >
                    {inr(step.cumulativePnL)}
                  </td>
                  <td className="py-2 px-3 text-right text-muted-foreground">
                    {step.maxDrawdownPct}%
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        !step.rule43Breached
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-rose-500/10 text-rose-600"
                      }`}
                    >
                      {!step.rule43Breached ? "OK (≤1.5%)" : "BREACH"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
