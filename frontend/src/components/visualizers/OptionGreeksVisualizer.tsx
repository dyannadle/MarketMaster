import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Activity } from "lucide-react";
import { inr } from "@/lib/data";

// Standard Normal cumulative distribution function approximation
function cdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2.0);

  const t = 1.0 / (1.0 + p * absX);
  const erf = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * erf);
}

// Standard Normal probability density function
function pdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export function OptionGreeksVisualizer() {
  const [optionType, setOptionType] = useState<"CALL" | "PUT">("CALL");
  const [spot, setSpot] = useState(24500);
  const [strike, setStrike] = useState(24500);
  const [daysToExpiry, setDaysToExpiry] = useState(7);
  const [iv, setIv] = useState(15); // 15% IV
  const r = 0.065; // 6.5% RBI repo rate

  const T = Math.max(0.001, daysToExpiry / 365);
  const sigma = iv / 100;

  // Black-Scholes Formula calculation
  const { callPrice, putPrice, delta, gamma, theta, vega, rho } = useMemo(() => {
    const d1 = (Math.log(spot / strike) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);

    const Nd1 = cdf(d1);
    const Nd2 = cdf(d2);
    const N_minus_d1 = cdf(-d1);
    const N_minus_d2 = cdf(-d2);
    const nd1 = pdf(d1);

    const callP = spot * Nd1 - strike * Math.exp(-r * T) * Nd2;
    const putP = strike * Math.exp(-r * T) * N_minus_d2 - spot * N_minus_d1;

    // Greeks
    const callDelta = Nd1;
    const putDelta = Nd1 - 1;
    const calcGamma = nd1 / (spot * sigma * Math.sqrt(T));
    
    // Daily Theta (divided by 365)
    const callTheta = (-(spot * nd1 * sigma) / (2 * Math.sqrt(T)) - r * strike * Math.exp(-r * T) * Nd2) / 365;
    const putTheta = (-(spot * nd1 * sigma) / (2 * Math.sqrt(T)) + r * strike * Math.exp(-r * T) * N_minus_d2) / 365;

    // Vega (per 1% IV shift)
    const calcVega = (spot * Math.sqrt(T) * nd1) / 100;

    // Rho (per 1% rate shift)
    const callRho = (strike * T * Math.exp(-r * T) * Nd2) / 100;
    const putRho = (-strike * T * Math.exp(-r * T) * N_minus_d2) / 100;

    return {
      callPrice: Math.max(0, callP),
      putPrice: Math.max(0, putP),
      delta: optionType === "CALL" ? callDelta : putDelta,
      gamma: calcGamma,
      theta: optionType === "CALL" ? callTheta : putTheta,
      vega: calcVega,
      rho: optionType === "CALL" ? callRho : putRho,
    };
  }, [spot, strike, T, sigma, optionType]);

  const premium = optionType === "CALL" ? callPrice : putPrice;

  // Generate Payoff Diagram across spot range (-5% to +5%)
  const payoffData = useMemo(() => {
    const range = 1200;
    const step = 50;
    const data = [];
    for (let s = strike - range; s <= strike + range; s += step) {
      // Payoff at Expiry
      const expiryPayoff = optionType === "CALL"
        ? Math.max(0, s - strike) - premium
        : Math.max(0, strike - s) - premium;

      // Current Price curve with Time Value
      const curD1 = (Math.log(s / strike) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
      const curD2 = curD1 - sigma * Math.sqrt(T);
      const curTheoPrice = optionType === "CALL"
        ? s * cdf(curD1) - strike * Math.exp(-r * T) * cdf(curD2)
        : strike * Math.exp(-r * T) * cdf(-curD2) - s * cdf(-curD1);
      const curPayoff = curTheoPrice - premium;

      data.push({
        spot: s,
        expiry: Math.round(expiryPayoff),
        today: Math.round(curPayoff),
      });
    }
    return data;
  }, [strike, premium, optionType, sigma, T]);

  const breakEven = optionType === "CALL" ? strike + premium : strike - premium;

  return (
    <div className="space-y-6 rounded-2xl border border-border/60 bg-gradient-to-b from-card to-card/60 p-5 md:p-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-5 w-5 text-sky-400" />
            Black-Scholes Options Greeks & Payoff Engine
          </h3>
          <p className="text-xs text-muted-foreground">
            Vectorized mathematical option valuation with live analytical first and second-order Greeks.
          </p>
        </div>
        <div className="flex rounded-lg bg-muted p-1 text-xs">
          <button
            onClick={() => setOptionType("CALL")}
            className={`rounded-md px-3 py-1 font-semibold transition-all ${
              optionType === "CALL" ? "bg-emerald-500 text-white shadow" : "text-muted-foreground"
            }`}
          >
            CALL OPTION
          </button>
          <button
            onClick={() => setOptionType("PUT")}
            className={`rounded-md px-3 py-1 font-semibold transition-all ${
              optionType === "PUT" ? "bg-rose-500 text-white shadow" : "text-muted-foreground"
            }`}
          >
            PUT OPTION
          </button>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/40 bg-background/50 p-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Underlying Spot (S)</span>
            <span className="num font-bold text-foreground">{spot}</span>
          </div>
          <input
            type="range"
            min={23000}
            max={26000}
            step={50}
            value={spot}
            onChange={(e) => setSpot(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </div>

        <div className="rounded-xl border border-border/40 bg-background/50 p-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Strike Price (K)</span>
            <span className="num font-bold text-foreground">{strike}</span>
          </div>
          <input
            type="range"
            min={23000}
            max={26000}
            step={50}
            value={strike}
            onChange={(e) => setStrike(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </div>

        <div className="rounded-xl border border-border/40 bg-background/50 p-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Days to Expiry (T)</span>
            <span className="num font-bold text-foreground">{daysToExpiry} Days</span>
          </div>
          <input
            type="range"
            min={1}
            max={60}
            step={1}
            value={daysToExpiry}
            onChange={(e) => setDaysToExpiry(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </div>

        <div className="rounded-xl border border-border/40 bg-background/50 p-3">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Implied Volatility (IV)</span>
            <span className="num font-bold text-amber-400">{iv}%</span>
          </div>
          <input
            type="range"
            min={8}
            max={40}
            step={1}
            value={iv}
            onChange={(e) => setIv(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </div>
      </div>

      {/* Greeks Telemetry Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
          <span className="text-[10px] text-muted-foreground block uppercase font-medium">Theo Premium</span>
          <span className="num text-xl font-black text-primary">₹{premium.toFixed(2)}</span>
          <span className="text-[9px] text-muted-foreground block mt-0.5">Lot (50): {inr(premium * 50)}</span>
        </div>

        <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 text-center">
          <span className="text-[10px] text-muted-foreground block uppercase font-medium">Delta (Δ)</span>
          <span className="num text-xl font-bold text-foreground">{delta.toFixed(3)}</span>
          <span className="text-[9px] text-muted-foreground block mt-0.5">₹ per 1 pt move</span>
        </div>

        <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 text-center">
          <span className="text-[10px] text-muted-foreground block uppercase font-medium">Gamma (Γ)</span>
          <span className="num text-xl font-bold text-foreground">{gamma.toFixed(5)}</span>
          <span className="text-[9px] text-muted-foreground block mt-0.5">Δ sensitivity</span>
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-center">
          <span className="text-[10px] text-rose-400 block uppercase font-medium">Theta (Θ)</span>
          <span className="num text-xl font-bold text-rose-400">{theta.toFixed(2)}</span>
          <span className="text-[9px] text-muted-foreground block mt-0.5">Daily time decay</span>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
          <span className="text-[10px] text-amber-400 block uppercase font-medium">Vega (ν)</span>
          <span className="num text-xl font-bold text-amber-400">+{vega.toFixed(2)}</span>
          <span className="text-[9px] text-muted-foreground block mt-0.5">₹ per +1% IV</span>
        </div>

        <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 text-center">
          <span className="text-[10px] text-muted-foreground block uppercase font-medium">Break-Even</span>
          <span className="num text-xl font-bold text-foreground">{breakEven.toFixed(0)}</span>
          <span className="text-[9px] text-muted-foreground block mt-0.5">{optionType === "CALL" ? "K + Premium" : "K - Premium"}</span>
        </div>
      </div>

      {/* Payoff Chart */}
      <div className="rounded-xl border border-border/40 bg-background/50 p-4">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-semibold text-foreground">Interactive Payoff Curve: At Expiry vs Today</span>
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary" /> Today (T = {daysToExpiry}d)
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> At Expiry (T = 0)
            </span>
          </div>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={payoffData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="spot" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
              <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "11px" }}
                formatter={(val: any) => [`₹${val}`, "P&L per share"]}
                labelFormatter={(lbl) => `Underlying Spot: ₹${lbl}`}
              />
              <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" />
              <ReferenceLine x={breakEven} stroke="#eab308" strokeDasharray="3 3" label={{ value: `BE: ${breakEven.toFixed(0)}`, fill: "#eab308", fontSize: 10, position: "top" }} />
              <Line type="monotone" dataKey="today" stroke="var(--primary)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="expiry" stroke="#10b981" strokeWidth={2} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
