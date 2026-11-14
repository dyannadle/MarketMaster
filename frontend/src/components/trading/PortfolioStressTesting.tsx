// Milestone 17: Multi-Asset Cross-Margin & Portfolio Stress Testing Simulator UI
// PIP Part 4.3 & SEBI Cross-Margin RMS Compliance

import { useState } from "react";
import {
  ShieldAlert,
  Sliders,
  TrendingDown,
  TrendingUp,
  Percent,
  Activity,
  Layers,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/data";
import {
  PRESET_STRESS_SCENARIOS,
  calculateCrossMargin,
  simulatePortfolioStress,
  type MarketShock,
  type PositionSummary,
} from "@/lib/cross-margin-stress";

interface Props {
  positions: PositionSummary[];
  cash: number;
}

export function PortfolioStressTesting({ positions, cash }: Props) {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customEquityShock, setCustomEquityShock] = useState<number>(-2.5);
  const [customVixShift, setCustomVixShift] = useState<number>(5.0);
  const [customRateShift, setCustomRateShift] = useState<number>(25);

  // Cross Margin Computation
  const crossMargin = calculateCrossMargin(positions, cash);

  // Active Shock Calculation
  const activeShock: MarketShock = isCustomMode
    ? {
        name: "Custom Macro Stress Test",
        description: `Manual shock: Equity ${customEquityShock}%, VIX ${customVixShift > 0 ? "+" : ""}${customVixShift} pts, Rates ${customRateShift} bps.`,
        equityShockPct: customEquityShock,
        vixShiftPts: customVixShift,
        rateShiftBps: customRateShift,
      }
    : (PRESET_STRESS_SCENARIOS[selectedPresetIndex] ?? PRESET_STRESS_SCENARIOS[0]!);

  const stressResult = simulatePortfolioStress(positions, cash, activeShock);

  return (
    <div className="space-y-6">
      {/* 1. SEBI Cross-Margin Optimization Panel */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Layers className="size-4" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">SEBI PRAN Cross-Margin Relief</h3>
              <p className="text-xs text-muted-foreground">
                Hedged portfolio margin optimization across Cash, Futures & Options
              </p>
            </div>
          </div>
          <span className="rounded-md bg-primary/15 px-2.5 py-1 text-xs font-mono font-bold text-primary">
            {crossMargin.reliefPercentage.toFixed(1)}% Capital Relief
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Standalone Margin</span>
            <p className="mt-1 font-mono text-base font-bold text-foreground">
              {inr(crossMargin.unhedgedMargin)}
            </p>
          </div>
          <div className="rounded-lg border bg-primary/5 border-primary/20 p-3">
            <span className="text-[11px] font-semibold text-primary uppercase">Optimized Hedged Margin</span>
            <p className="mt-1 font-mono text-base font-bold text-primary">
              {inr(crossMargin.crossMarginRequired)}
            </p>
          </div>
          <div className="rounded-lg border bg-emerald-500/10 border-emerald-500/20 p-3">
            <span className="text-[11px] font-semibold text-gain uppercase">Capital Released</span>
            <p className="mt-1 font-mono text-base font-bold text-gain">
              +{inr(crossMargin.marginRelief)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Margin Utilization</span>
            <p className="mt-1 font-mono text-base font-bold text-foreground">
              {crossMargin.marginUtilization.toFixed(1)}%
            </p>
          </div>
        </div>

        {crossMargin.hedgeBreakdown.length > 0 && (
          <div className="mt-4 space-y-2 border-t pt-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Identified Institutional Hedges
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {crossMargin.hedgeBreakdown.map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border bg-background/60 p-2.5 text-xs">
                  <div>
                    <p className="font-semibold text-foreground">{h.category}</p>
                    <p className="text-[11px] text-muted-foreground">{h.description}</p>
                  </div>
                  <span className="font-mono font-bold text-gain">+{inr(h.reliefAmount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Portfolio Stress Testing Simulator */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-rose-500/10 text-rose-500">
              <Activity className="size-4" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Macro Scenario Stress Testing (RMS)</h3>
              <p className="text-xs text-muted-foreground">
                Simulate mark-to-market impacts, Greek exposures and Rule 4.3 thresholds
              </p>
            </div>
          </div>
          <Button
            variant={isCustomMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsCustomMode(!isCustomMode)}
            className="gap-1.5 text-xs font-semibold"
          >
            <Sliders className="size-3.5" />
            {isCustomMode ? "Using Custom Mode" : "Switch to Custom Sliders"}
          </Button>
        </div>

        {/* Preset Selector */}
        {!isCustomMode ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {PRESET_STRESS_SCENARIOS.map((scenario, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedPresetIndex(idx)}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                  selectedPresetIndex === idx
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-sm"
                    : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <p className="font-semibold">{scenario.name}</p>
                <p className="text-[10px] opacity-80">{scenario.description}</p>
              </button>
            ))}
          </div>
        ) : (
          /* Custom Sliders */
          <div className="mt-4 grid gap-4 rounded-lg border bg-muted/20 p-4 sm:grid-cols-3">
            <div>
              <div className="flex justify-between text-xs font-semibold">
                <span>Nifty Shock (%)</span>
                <span className={customEquityShock >= 0 ? "text-gain" : "text-loss"}>
                  {customEquityShock > 0 ? "+" : ""}{customEquityShock.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.5"
                value={customEquityShock}
                onChange={(e) => setCustomEquityShock(parseFloat(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold">
                <span>India VIX Shift (pts)</span>
                <span className={customVixShift >= 0 ? "text-loss" : "text-gain"}>
                  {customVixShift > 0 ? "+" : ""}{customVixShift.toFixed(1)} pts
                </span>
              </div>
              <input
                type="range"
                min="-10"
                max="30"
                step="1"
                value={customVixShift}
                onChange={(e) => setCustomVixShift(parseFloat(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold">
                <span>RBI Repo Shift (bps)</span>
                <span className="text-foreground">
                  {customRateShift > 0 ? "+" : ""}{customRateShift} bps
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="25"
                value={customRateShift}
                onChange={(e) => setCustomRateShift(parseInt(e.target.value))}
                className="mt-2 w-full accent-primary"
              />
            </div>
          </div>
        )}

        {/* Stress Results Display */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border bg-muted/30 p-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Current Equity</span>
            <p className="mt-1 font-mono text-base font-bold text-foreground">
              {inr(stressResult.baselineEquity)}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Stressed Equity</span>
            <p className="mt-1 font-mono text-base font-bold text-foreground">
              {inr(stressResult.stressedEquity)}
            </p>
          </div>
          <div className={`rounded-lg border p-3 ${stressResult.mtmImpact >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}>
            <span className="text-[11px] font-semibold uppercase">Simulated MTM Impact</span>
            <p className={`mt-1 font-mono text-base font-bold ${stressResult.mtmImpact >= 0 ? "text-gain" : "text-loss"}`}>
              {stressResult.mtmImpact >= 0 ? "+" : ""}{inr(stressResult.mtmImpact)} ({stressResult.mtmImpactPct.toFixed(2)}%)
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">Stressed Margin Req</span>
            <p className="mt-1 font-mono text-base font-bold text-foreground">
              {inr(stressResult.stressedMarginRequired)}
            </p>
          </div>
        </div>

        {/* Rule 4.3 Capital Risk Gate Banner */}
        <div className="mt-4">
          {stressResult.rule43Breached ? (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-400">
              <ShieldAlert className="size-5 shrink-0" />
              <div className="text-xs">
                <span className="font-bold">Rule 4.3 Capital Guard Alert: </span>
                Projected drawdown of {Math.abs(stressResult.mtmImpactPct).toFixed(2)}% breaches your institutional
                1.50% capital limit ({inr(stressResult.rule43Threshold)}). Consider hedging with protective puts.
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-400">
              <CheckCircle2 className="size-5 shrink-0" />
              <div className="text-xs">
                <span className="font-bold">Rule 4.3 Compliant: </span>
                Projected stress impact is safely within the 1.50% daily risk ceiling ({inr(stressResult.rule43Threshold)}).
              </div>
            </div>
          )}
        </div>

        {/* Portfolio Greeks Aggregates */}
        <div className="mt-5 border-t pt-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Simulated Portfolio Greeks Exposure
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
            <div className="rounded-lg border bg-background/70 p-2.5">
              <span className="text-muted-foreground">Net Delta (Δ)</span>
              <p className="font-mono font-bold text-foreground">{stressResult.portfolioGreeks.netDelta.toFixed(1)} ₹/1%</p>
            </div>
            <div className="rounded-lg border bg-background/70 p-2.5">
              <span className="text-muted-foreground">Net Gamma (Γ)</span>
              <p className="font-mono font-bold text-foreground">{stressResult.portfolioGreeks.netGamma.toFixed(3)}</p>
            </div>
            <div className="rounded-lg border bg-background/70 p-2.5">
              <span className="text-muted-foreground">Net Theta (Θ)</span>
              <p className="font-mono font-bold text-foreground">{stressResult.portfolioGreeks.netTheta.toFixed(1)} ₹/day</p>
            </div>
            <div className="rounded-lg border bg-background/70 p-2.5">
              <span className="text-muted-foreground">Net Vega (ν)</span>
              <p className="font-mono font-bold text-foreground">{stressResult.portfolioGreeks.netVega.toFixed(1)} ₹/VIX pt</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
