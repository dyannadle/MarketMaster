import { useState, useMemo } from "react";
import {
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
  TrendingUp,
  TrendingDown,
  Layers,
  ShieldCheck,
  Plus,
  Trash2,
  Zap,
  ArrowRight,
  Info,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { inr } from "@/lib/data";
import { toast } from "sonner";
import { nativeBridge } from "@/lib/native";

export interface StrategyLeg {
  id: string;
  side: "BUY" | "SELL";
  type: "CALL" | "PUT";
  strike: number;
  lots: number;
  premium: number;
  delta: number;
  theta: number;
}

export type StrategyTemplateId =
  | "BULL_CALL_SPREAD"
  | "BEAR_PUT_SPREAD"
  | "SHORT_STRADDLE"
  | "LONG_STRANGLE"
  | "IRON_CONDOR"
  | "CUSTOM";

interface OptionsStrategyBuilderProps {
  underlyingSymbol: string;
  spotPrice: number;
  lotSize?: number;
  onExecuteStrategy: (legs: StrategyLeg[], marginRequired: number) => Promise<void> | void;
}

export function OptionsStrategyBuilder({
  underlyingSymbol,
  spotPrice,
  lotSize = 50,
  onExecuteStrategy,
}: OptionsStrategyBuilderProps) {
  const strikeStep = underlyingSymbol.includes("BANK") ? 100 : 50;
  const atmStrike = Math.round(spotPrice / strikeStep) * strikeStep;

  // Helper to approximate option premium and Greeks based on strike & spot
  const estimateOption = (strike: number, type: "CALL" | "PUT") => {
    const isCall = type === "CALL";
    const intrinsic = isCall ? Math.max(0, spotPrice - strike) : Math.max(0, strike - spotPrice);
    const dist = Math.abs(spotPrice - strike);
    const timeValue = Math.max(20, 160 - dist * 0.16);
    const premium = Math.round((intrinsic + timeValue) * 10) / 10;

    // Delta estimate: 0.5 at ATM
    let delta = 0.5;
    if (isCall) {
      delta = spotPrice >= strike ? 0.5 + Math.min(0.45, (spotPrice - strike) / (strikeStep * 6)) : Math.max(0.05, 0.5 - (strike - spotPrice) / (strikeStep * 6));
    } else {
      delta = spotPrice <= strike ? -0.5 - Math.min(0.45, (strike - spotPrice) / (strikeStep * 6)) : Math.min(-0.05, -0.5 + (spotPrice - strike) / (strikeStep * 6));
    }

    const theta = -Math.round((14 - dist * 0.01) * 10) / 10;
    return { premium, delta: Math.round(delta * 100) / 100, theta };
  };

  // Generate default structure for a template
  const getTemplateLegs = (template: StrategyTemplateId): StrategyLeg[] => {
    switch (template) {
      case "BULL_CALL_SPREAD": {
        const estBuy = estimateOption(atmStrike, "CALL");
        const estSell = estimateOption(atmStrike + strikeStep * 2, "CALL");
        return [
          {
            id: "leg-1",
            side: "BUY",
            type: "CALL",
            strike: atmStrike,
            lots: 1,
            premium: estBuy.premium,
            delta: estBuy.delta,
            theta: estBuy.theta,
          },
          {
            id: "leg-2",
            side: "SELL",
            type: "CALL",
            strike: atmStrike + strikeStep * 2,
            lots: 1,
            premium: estSell.premium,
            delta: estSell.delta,
            theta: estSell.theta,
          },
        ];
      }
      case "BEAR_PUT_SPREAD": {
        const estBuy = estimateOption(atmStrike, "PUT");
        const estSell = estimateOption(atmStrike - strikeStep * 2, "PUT");
        return [
          {
            id: "leg-1",
            side: "BUY",
            type: "PUT",
            strike: atmStrike,
            lots: 1,
            premium: estBuy.premium,
            delta: estBuy.delta,
            theta: estBuy.theta,
          },
          {
            id: "leg-2",
            side: "SELL",
            type: "PUT",
            strike: atmStrike - strikeStep * 2,
            lots: 1,
            premium: estSell.premium,
            delta: estSell.delta,
            theta: estSell.theta,
          },
        ];
      }
      case "SHORT_STRADDLE": {
        const estCall = estimateOption(atmStrike, "CALL");
        const estPut = estimateOption(atmStrike, "PUT");
        return [
          {
            id: "leg-1",
            side: "SELL",
            type: "CALL",
            strike: atmStrike,
            lots: 1,
            premium: estCall.premium,
            delta: estCall.delta,
            theta: estCall.theta,
          },
          {
            id: "leg-2",
            side: "SELL",
            type: "PUT",
            strike: atmStrike,
            lots: 1,
            premium: estPut.premium,
            delta: estPut.delta,
            theta: estPut.theta,
          },
        ];
      }
      case "LONG_STRANGLE": {
        const estCall = estimateOption(atmStrike + strikeStep * 2, "CALL");
        const estPut = estimateOption(atmStrike - strikeStep * 2, "PUT");
        return [
          {
            id: "leg-1",
            side: "BUY",
            type: "CALL",
            strike: atmStrike + strikeStep * 2,
            lots: 1,
            premium: estCall.premium,
            delta: estCall.delta,
            theta: estCall.theta,
          },
          {
            id: "leg-2",
            side: "BUY",
            type: "PUT",
            strike: atmStrike - strikeStep * 2,
            lots: 1,
            premium: estPut.premium,
            delta: estPut.delta,
            theta: estPut.theta,
          },
        ];
      }
      case "IRON_CONDOR": {
        const estPutWing = estimateOption(atmStrike - strikeStep * 4, "PUT");
        const estPutShort = estimateOption(atmStrike - strikeStep * 2, "PUT");
        const estCallShort = estimateOption(atmStrike + strikeStep * 2, "CALL");
        const estCallWing = estimateOption(atmStrike + strikeStep * 4, "CALL");
        return [
          {
            id: "leg-1",
            side: "BUY",
            type: "PUT",
            strike: atmStrike - strikeStep * 4,
            lots: 1,
            premium: estPutWing.premium,
            delta: estPutWing.delta,
            theta: estPutWing.theta,
          },
          {
            id: "leg-2",
            side: "SELL",
            type: "PUT",
            strike: atmStrike - strikeStep * 2,
            lots: 1,
            premium: estPutShort.premium,
            delta: estPutShort.delta,
            theta: estPutShort.theta,
          },
          {
            id: "leg-3",
            side: "SELL",
            type: "CALL",
            strike: atmStrike + strikeStep * 2,
            lots: 1,
            premium: estCallShort.premium,
            delta: estCallShort.delta,
            theta: estCallShort.theta,
          },
          {
            id: "leg-4",
            side: "BUY",
            type: "CALL",
            strike: atmStrike + strikeStep * 4,
            lots: 1,
            premium: estCallWing.premium,
            delta: estCallWing.delta,
            theta: estCallWing.theta,
          },
        ];
      }
      case "CUSTOM":
      default: {
        const est = estimateOption(atmStrike, "CALL");
        return [
          {
            id: "leg-1",
            side: "BUY",
            type: "CALL",
            strike: atmStrike,
            lots: 1,
            premium: est.premium,
            delta: est.delta,
            theta: est.theta,
          },
        ];
      }
    }
  };

  const [activeTemplate, setActiveTemplate] = useState<StrategyTemplateId>("IRON_CONDOR");
  const [legs, setLegs] = useState<StrategyLeg[]>(() => getTemplateLegs("IRON_CONDOR"));
  const [isExecuting, setIsExecuting] = useState(false);

  // Switch template
  const handleSelectTemplate = (template: StrategyTemplateId) => {
    setActiveTemplate(template);
    setLegs(getTemplateLegs(template));
  };

  // Mutate Leg
  const updateLeg = (id: string, updates: Partial<StrategyLeg>) => {
    setActiveTemplate("CUSTOM");
    setLegs((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, ...updates };
        if (updates.strike != null || updates.type != null) {
          const est = estimateOption(updated.strike, updated.type);
          if (updates.premium == null) updated.premium = est.premium;
          updated.delta = est.delta;
          updated.theta = est.theta;
        }
        return updated;
      })
    );
  };

  // Delete Leg
  const removeLeg = (id: string) => {
    setActiveTemplate("CUSTOM");
    setLegs((prev) => prev.filter((l) => l.id !== id));
  };

  // Add Leg
  const addLeg = () => {
    setActiveTemplate("CUSTOM");
    const est = estimateOption(atmStrike, "CALL");
    const newLeg: StrategyLeg = {
      id: `leg-${Date.now()}`,
      side: "BUY",
      type: "CALL",
      strike: atmStrike,
      lots: 1,
      premium: est.premium,
      delta: est.delta,
      theta: est.theta,
    };
    setLegs((prev) => [...prev, newLeg]);
  };

  // Calculate Expiry Payoff Curve across Spot Price spectrum
  const { payoffData, maxProfit, maxLoss, breakevens, netCreditDebit, netDelta, netTheta } = useMemo(() => {
    const rangeSpan = strikeStep * 16;
    const minPrice = Math.max(100, atmStrike - rangeSpan);
    const maxPrice = atmStrike + rangeSpan;
    const stepSize = Math.max(10, Math.round((maxPrice - minPrice) / 50));

    const points: { spot: number; pnl: number; isProfit: boolean }[] = [];
    let calculatedMaxProfit = -Infinity;
    let calculatedMaxLoss = Infinity;
    const zeroCrossings: number[] = [];

    let prevPnl: number | null = null;
    let prevSpot: number | null = null;

    for (let s = minPrice; s <= maxPrice; s += stepSize) {
      let totalPnl = 0;
      for (const leg of legs) {
        const qty = leg.lots * lotSize;
        const isCall = leg.type === "CALL";
        const intrinsic = isCall ? Math.max(0, s - leg.strike) : Math.max(0, leg.strike - s);

        if (leg.side === "BUY") {
          totalPnl += (intrinsic - leg.premium) * qty;
        } else {
          totalPnl += (leg.premium - intrinsic) * qty;
        }
      }

      totalPnl = Math.round(totalPnl);
      points.push({
        spot: s,
        pnl: totalPnl,
        isProfit: totalPnl >= 0,
      });

      if (totalPnl > calculatedMaxProfit) calculatedMaxProfit = totalPnl;
      if (totalPnl < calculatedMaxLoss) calculatedMaxLoss = totalPnl;

      // Detect Breakeven zero-crossings
      if (prevPnl !== null && prevSpot !== null) {
        if ((prevPnl < 0 && totalPnl >= 0) || (prevPnl >= 0 && totalPnl < 0)) {
          const ratio = Math.abs(prevPnl) / (Math.abs(prevPnl) + Math.abs(totalPnl));
          const crossing = Math.round(prevSpot + ratio * (s - prevSpot));
          zeroCrossings.push(crossing);
        }
      }

      prevPnl = totalPnl;
      prevSpot = s;
    }

    // Net cash flow (credit or debit)
    let netFlow = 0;
    let deltaSum = 0;
    let thetaSum = 0;

    for (const leg of legs) {
      const multiplier = leg.side === "SELL" ? 1 : -1;
      const totalUnits = leg.lots * lotSize;
      netFlow += multiplier * leg.premium * totalUnits;
      deltaSum += (leg.side === "BUY" ? leg.delta : -leg.delta) * leg.lots;
      thetaSum += (leg.side === "BUY" ? leg.theta : -leg.theta) * leg.lots;
    }

    return {
      payoffData: points,
      maxProfit: calculatedMaxProfit,
      maxLoss: calculatedMaxLoss,
      breakevens: zeroCrossings,
      netCreditDebit: Math.round(netFlow),
      netDelta: Math.round(deltaSum * 100) / 100,
      netTheta: Math.round(thetaSum * lotSize),
    };
  }, [legs, atmStrike, strikeStep, lotSize]);

  // SEBI Portfolio Margin Calculation & Relief Estimation
  const { nakedMargin, hedgedMargin, marginRelief, reliefPercent } = useMemo(() => {
    const NAKED_MARGIN_PER_SHORT_LOT = 120000; // ~₹1.2 Lakh standard SPAN+Exposure per naked short lot
    let shortLots = 0;
    let longLots = 0;

    for (const leg of legs) {
      if (leg.side === "SELL") shortLots += leg.lots;
      else longLots += leg.lots;
    }

    const naked = shortLots * NAKED_MARGIN_PER_SHORT_LOT;

    if (shortLots === 0) {
      // Net buyer of options: margin is only the premium paid
      const premiumCapital = Math.max(0, -netCreditDebit);
      return {
        nakedMargin: 0,
        hedgedMargin: premiumCapital,
        marginRelief: 0,
        reliefPercent: 0,
      };
    }

    // If hedged: spread width * lotSize is maximum risk exposure
    let hedged = 0;
    if (longLots >= shortLots && maxLoss < 0) {
      // Defined risk spread: margin is Max Loss + 15% buffer
      hedged = Math.max(30000, Math.round(Math.abs(maxLoss) * 1.15));
    } else {
      // Partially hedged or unlimited risk
      hedged = Math.round(naked * 0.45);
    }

    const relief = Math.max(0, naked - hedged);
    const pct = naked > 0 ? Math.round((relief / naked) * 100) : 0;

    return {
      nakedMargin: naked,
      hedgedMargin: hedged,
      marginRelief: relief,
      reliefPercent: pct,
    };
  }, [legs, netCreditDebit, maxLoss]);

  // Risk to reward string
  const riskReward = useMemo(() => {
    if (maxLoss >= 0) return "Risk-Free / Net Credit";
    if (maxProfit <= 0) return "Unfavorable";
    const ratio = Math.abs(maxProfit / maxLoss);
    return `1 : ${ratio.toFixed(2)}`;
  }, [maxProfit, maxLoss]);

  // Execute multi-leg order
  const handleExecute = async () => {
    if (legs.length === 0) {
      toast.error("Add at least one option leg to execute a strategy.");
      return;
    }
    setIsExecuting(true);
    try {
      await onExecuteStrategy(legs, hedgedMargin);
      toast.success(
        `Successfully executed ${activeTemplate.replace(/_/g, " ")} (${legs.length} legs). Locked margin: ₹${hedgedMargin.toLocaleString("en-IN")}`
      );
      nativeBridge.vibrateFill();
    } catch (err: any) {
      toast.error(err?.message || "Failed to execute multi-leg strategy.");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      {/* 1. Header & 1-Click Strategy Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold tracking-tight">Institutional Multi-Leg Strategy Builder</h2>
          <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
            {underlyingSymbol} @ ₹{spotPrice.toLocaleString("en-IN")}
          </span>
          <span className="rounded bg-secondary/60 px-2 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground">
            Lot: {lotSize}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[11px] font-semibold text-muted-foreground mr-1">Pre-Built:</span>
          {(
            [
              { id: "BULL_CALL_SPREAD", label: "Bull Call Spread" },
              { id: "BEAR_PUT_SPREAD", label: "Bear Put Spread" },
              { id: "SHORT_STRADDLE", label: "Short Straddle" },
              { id: "LONG_STRANGLE", label: "Long Strangle" },
              { id: "IRON_CONDOR", label: "Iron Condor" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelectTemplate(t.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                activeTemplate === t.id
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-secondary/40 text-foreground hover:bg-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Interactive Expiry Payoff Diagram */}
      <div className="rounded-xl border border-border/60 bg-background/50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold tracking-tight text-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-gain" /> Expiry Payoff Curve (T+0 Expiration)
            </span>
            <span className="text-[11px] text-muted-foreground">
              Hover to inspect P&L at simulated expiry spot prices
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div>
              <span className="text-muted-foreground">Max Profit: </span>
              <span className={`font-bold ${maxProfit > 0 ? "text-gain" : "text-muted-foreground"}`}>
                {maxProfit > 2000000 ? "Unlimited" : inr(maxProfit)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Max Loss: </span>
              <span className={`font-bold ${maxLoss < 0 ? "text-loss" : "text-gain"}`}>
                {maxLoss < -2000000 ? "Unlimited" : inr(maxLoss)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">R:R: </span>
              <span className="font-bold text-foreground">{riskReward}</span>
            </div>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={payoffData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="payoffGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" opacity={0.6} />
              <XAxis
                dataKey="spot"
                tick={{ fontSize: 10, fill: "#888888" }}
                tickFormatter={(v) => `₹${v}`}
                domain={["dataMin", "dataMax"]}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#888888" }}
                tickFormatter={(v) => (v >= 1000 || v <= -1000 ? `₹${v / 1000}k` : `₹${v}`)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length && payload[0]?.payload) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border border-border bg-card p-2 text-xs shadow-lg">
                        <p className="font-mono text-muted-foreground">Expiry Spot: ₹{data.spot.toLocaleString("en-IN")}</p>
                        <p className={`font-mono font-bold text-sm ${data.pnl >= 0 ? "text-gain" : "text-loss"}`}>
                          P&L: {data.pnl >= 0 ? "+" : ""}{inr(data.pnl)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="#525252" strokeDasharray="4 4" />
              <ReferenceLine
                x={atmStrike}
                stroke="#eab308"
                strokeDasharray="3 3"
                label={{ value: "Spot", position: "top", fill: "#eab308", fontSize: 10 }}
              />
              {breakevens.map((be) => (
                <ReferenceLine
                  key={be}
                  x={be}
                  stroke="#38bdf8"
                  strokeDasharray="2 2"
                  label={{ value: `BE: ${be}`, position: "insideTopRight", fill: "#38bdf8", fontSize: 9 }}
                />
              ))}
              <Area
                type="monotone"
                dataKey="pnl"
                stroke="#10b981"
                fill="url(#payoffGradient)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Breakeven & Greeks Bar */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2 text-[11px] font-mono">
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground">Breakevens:</span>
            {breakevens.length > 0 ? (
              breakevens.map((be) => (
                <span key={be} className="rounded bg-sky-500/10 px-1.5 py-0.5 text-sky-400 font-bold">
                  ₹{be.toLocaleString("en-IN")}
                </span>
              ))
            ) : (
              <span className="text-muted-foreground">No zero crossing in range</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span>
              Net Premium:{" "}
              <strong className={netCreditDebit >= 0 ? "text-gain" : "text-loss"}>
                {netCreditDebit >= 0 ? `+${inr(netCreditDebit)} (Credit)` : `${inr(netCreditDebit)} (Debit)`}
              </strong>
            </span>
            <span>
              Net Delta: <strong className="text-foreground">{netDelta > 0 ? `+${netDelta}` : netDelta}</strong>
            </span>
            <span>
              Daily Theta: <strong className={netTheta >= 0 ? "text-gain" : "text-loss"}>{inr(netTheta)}/day</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 3. Strategy Legs Table */}
      <div className="overflow-x-auto">
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            STRATEGY LEGS ({legs.length})
          </span>
          <button
            onClick={addLeg}
            className="flex items-center gap-1 rounded bg-secondary/50 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-secondary transition-all"
          >
            <Plus className="h-3 w-3" /> Add Custom Leg
          </button>
        </div>

        <table className="w-full text-xs font-mono text-left">
          <thead className="border-b border-border/60 text-[11px] text-muted-foreground font-sans">
            <tr>
              <th className="p-2">ACTION</th>
              <th className="p-2">TYPE</th>
              <th className="p-2">STRIKE</th>
              <th className="p-2">LOTS</th>
              <th className="p-2">PREMIUM (LTP)</th>
              <th className="p-2">DELTA</th>
              <th className="p-2">THETA</th>
              <th className="p-2 text-right">REMOVE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {legs.map((leg) => (
              <tr key={leg.id} className="hover:bg-accent/30 transition-colors">
                {/* ACTION (BUY / SELL) */}
                <td className="p-2">
                  <button
                    onClick={() => updateLeg(leg.id, { side: leg.side === "BUY" ? "SELL" : "BUY" })}
                    className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase transition-all ${
                      leg.side === "BUY"
                        ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                    }`}
                  >
                    {leg.side}
                  </button>
                </td>

                {/* OPTION TYPE (CE / PE) */}
                <td className="p-2">
                  <button
                    onClick={() => updateLeg(leg.id, { type: leg.type === "CALL" ? "PUT" : "CALL" })}
                    className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                      leg.type === "CALL" ? "bg-primary/20 text-primary" : "bg-purple-500/20 text-purple-400"
                    }`}
                  >
                    {leg.type === "CALL" ? "CE (Call)" : "PE (Put)"}
                  </button>
                </td>

                {/* STRIKE */}
                <td className="p-2">
                  <input
                    type="number"
                    step={strikeStep}
                    value={leg.strike}
                    onChange={(e) => updateLeg(leg.id, { strike: Number(e.target.value) })}
                    className="w-24 rounded border border-border bg-background px-2 py-1 text-xs font-mono font-bold"
                  />
                </td>

                {/* LOTS */}
                <td className="p-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={leg.lots}
                    onChange={(e) => updateLeg(leg.id, { lots: Math.max(1, Number(e.target.value)) })}
                    className="w-16 rounded border border-border bg-background px-2 py-1 text-xs font-mono"
                  />
                  <span className="ml-1 text-[10px] text-muted-foreground">({leg.lots * lotSize} qty)</span>
                </td>

                {/* PREMIUM */}
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">₹</span>
                    <input
                      type="number"
                      step={0.5}
                      value={leg.premium}
                      onChange={(e) => updateLeg(leg.id, { premium: Number(e.target.value) })}
                      className="w-20 rounded border border-border bg-background px-2 py-1 text-xs font-mono font-semibold"
                    />
                  </div>
                </td>

                {/* DELTA */}
                <td className="p-2 text-muted-foreground">
                  {leg.delta > 0 ? `+${leg.delta}` : leg.delta}
                </td>

                {/* THETA */}
                <td className="p-2 text-muted-foreground">
                  {leg.theta}
                </td>

                {/* REMOVE */}
                <td className="p-2 text-right">
                  <button
                    onClick={() => removeLeg(leg.id)}
                    className="rounded p-1 text-muted-foreground hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. Portfolio Margin Offsets & Capital Efficiency Banner */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-foreground">SEBI Multi-Leg Portfolio Margin Relief</h3>
              {reliefPercent > 0 && (
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  {reliefPercent}% Capital Relief
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Hedging short options with long wings limits catastrophic risk, allowing SEBI SPAN to slash required collateral.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            {nakedMargin > 0 && (
              <div className="text-right">
                <span className="block text-[10px] text-muted-foreground">Without Hedge</span>
                <span className="line-through text-muted-foreground font-semibold">
                  {inr(nakedMargin)}
                </span>
              </div>
            )}
            <div className="text-right">
              <span className="block text-[10px] text-muted-foreground">Required Margin</span>
              <span className="text-sm font-black text-emerald-400">
                {inr(hedgedMargin)}
              </span>
            </div>
            {marginRelief > 0 && (
              <div className="text-right">
                <span className="block text-[10px] text-muted-foreground">Capital Saved</span>
                <span className="text-sm font-bold text-emerald-300">
                  +{inr(marginRelief)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. 1-Click Atomic Strategy Execution */}
      <div className="flex items-center justify-between border-t border-border/40 pt-3">
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-primary" />
          <span>Executes all {legs.length} legs simultaneously into your paper trading portfolio ledger.</span>
        </div>

        <button
          onClick={handleExecute}
          disabled={isExecuting || legs.length === 0}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {isExecuting ? (
            <span>Executing Legs...</span>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              <span>Execute {activeTemplate.replace(/_/g, " ")} ({legs.length} Legs)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
