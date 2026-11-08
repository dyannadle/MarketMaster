import { useState, useMemo } from "react";
import { ArrowDownUp, Zap, HelpCircle, SlidersHorizontal } from "lucide-react";
import { inr } from "@/lib/data";

export interface SelectedOptionStrike {
  strike: number;
  type: "CALL" | "PUT";
  ltp: number;
  symbol: string;
  iv: number;
}

interface OptionsChainMatrixProps {
  underlyingSymbol: string;
  spotPrice: number;
  onSelectOption: (option: SelectedOptionStrike) => void;
  onOpenStrategyBuilder?: () => void;
}

export function OptionsChainMatrix({ underlyingSymbol, spotPrice, onSelectOption, onOpenStrategyBuilder }: OptionsChainMatrixProps) {
  const [expiry, setExpiry] = useState("CURRENT_WEEK");

  // Determine strike step based on underlying
  const strikeStep = underlyingSymbol.includes("BANK") ? 100 : 50;
  const atmStrike = Math.round(spotPrice / strikeStep) * strikeStep;

  // Generate dynamic strike ladder (15 strikes centered around ATM)
  const strikeRows = useMemo(() => {
    const rows = [];
    const count = 7;
    for (let i = -count; i <= count; i++) {
      const strike = atmStrike + i * strikeStep;
      const isAtm = strike === atmStrike;
      const isCallItm = strike < spotPrice;
      const isPutItm = strike > spotPrice;

      // Realistic simulated Black-Scholes-like premiums
      const callDist = Math.max(0, spotPrice - strike);
      const putDist = Math.max(0, strike - spotPrice);
      const timeVal = Math.max(25, 180 - Math.abs(strike - spotPrice) * 0.18);

      const callLtp = Math.round((callDist + timeVal) * 10) / 10;
      const putLtp = Math.round((putDist + timeVal) * 10) / 10;

      // Realistic OI & Volumes
      const callOi = Math.round((85000 - Math.abs(strike - spotPrice) * 45) + ((strike * 17) % 5000));
      const putOi = Math.round((82000 - Math.abs(strike - spotPrice) * 42) + ((strike * 23) % 5000));
      const callIv = Math.round((13.5 + Math.abs(strike - spotPrice) * 0.004) * 10) / 10;
      const putIv = Math.round((14.2 + Math.abs(strike - spotPrice) * 0.004) * 10) / 10;

      rows.push({
        strike,
        isAtm,
        isCallItm,
        isPutItm,
        call: {
          oi: callOi,
          oiChg: Math.round(((strike * 7) % 3500) - 1000),
          vol: Math.round(callOi * 0.35),
          iv: callIv,
          ltp: callLtp,
        },
        put: {
          oi: putOi,
          oiChg: Math.round(((strike * 11) % 3500) - 1000),
          vol: Math.round(putOi * 0.35),
          iv: putIv,
          ltp: putLtp,
        },
      });
    }
    return rows;
  }, [atmStrike, spotPrice, strikeStep]);

  return (
    <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      {/* Header & Expiry selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-bold tracking-tight">NSE Derivative Option Chain Matrix</h3>
          <span className="rounded bg-secondary/50 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
            Spot: ₹{spotPrice.toLocaleString("en-IN")}
          </span>
          <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400">
            ATM: {atmStrike}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {onOpenStrategyBuilder && (
            <button
              onClick={onOpenStrategyBuilder}
              className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Strategy Builder & Payoff
            </button>
          )}
          <span className="text-muted-foreground">Expiry:</span>
          <select
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold"
          >
            <option value="CURRENT_WEEK">This Week (Weekly Expiry)</option>
            <option value="NEXT_WEEK">Next Week</option>
            <option value="MONTHLY">Monthly Expiry</option>
          </select>
        </div>
      </div>

      {/* Option Chain Table */}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-center text-xs font-mono">
          <thead>
            {/* Top Super-headers */}
            <tr className="border-b border-border/40 text-[10px] uppercase font-sans">
              <th colSpan={4} className="bg-emerald-500/10 py-1 text-emerald-400 font-bold">
                CALLS (CE)
              </th>
              <th className="bg-secondary/40 py-1 text-foreground font-bold">STRIKE</th>
              <th colSpan={4} className="bg-rose-500/10 py-1 text-rose-400 font-bold">
                PUTS (PE)
              </th>
            </tr>
            {/* Column Headers */}
            <tr className="border-b border-border/40 text-[10px] text-muted-foreground font-sans">
              <th className="p-1.5 text-right">OI</th>
              <th className="p-1.5 text-right">Volume</th>
              <th className="p-1.5 text-right">IV%</th>
              <th className="p-1.5 text-right font-bold text-emerald-400">CALL LTP</th>
              <th className="p-1.5 text-center font-bold text-foreground">STRIKE</th>
              <th className="p-1.5 text-left font-bold text-rose-400">PUT LTP</th>
              <th className="p-1.5 text-left">IV%</th>
              <th className="p-1.5 text-left">Volume</th>
              <th className="p-1.5 text-left">OI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/20">
            {strikeRows.map((r) => (
              <tr
                key={r.strike}
                className={`transition-colors hover:bg-accent/40 ${
                  r.isAtm ? "ring-1 ring-amber-400/50 bg-amber-400/5 font-bold" : ""
                }`}
              >
                {/* CALL SIDE */}
                <td className={`p-1.5 text-right text-muted-foreground ${r.isCallItm ? "bg-emerald-500/5" : ""}`}>
                  {r.call.oi.toLocaleString()}
                </td>
                <td className={`p-1.5 text-right text-muted-foreground ${r.isCallItm ? "bg-emerald-500/5" : ""}`}>
                  {r.call.vol.toLocaleString()}
                </td>
                <td className={`p-1.5 text-right text-muted-foreground ${r.isCallItm ? "bg-emerald-500/5" : ""}`}>
                  {r.call.iv}%
                </td>
                <td className={`p-1.5 text-right font-bold ${r.isCallItm ? "bg-emerald-500/10 text-emerald-300" : "text-emerald-400"}`}>
                  <button
                    onClick={() =>
                      onSelectOption({
                        strike: r.strike,
                        type: "CALL",
                        ltp: r.call.ltp,
                        symbol: `${underlyingSymbol}_${r.strike}_CE`,
                        iv: r.call.iv,
                      })
                    }
                    className="rounded px-2 py-0.5 hover:bg-emerald-500 hover:text-white transition-all"
                  >
                    ₹{r.call.ltp.toFixed(1)}
                  </button>
                </td>

                {/* CENTER STRIKE */}
                <td
                  className={`p-1.5 font-bold font-sans text-center ${
                    r.isAtm ? "text-amber-400 bg-amber-400/10 text-sm" : "text-foreground bg-secondary/30"
                  }`}
                >
                  {r.strike}
                  {r.isAtm && <span className="ml-1 text-[9px] uppercase text-amber-400">ATM</span>}
                </td>

                {/* PUT SIDE */}
                <td className={`p-1.5 text-left font-bold ${r.isPutItm ? "bg-rose-500/10 text-rose-300" : "text-rose-400"}`}>
                  <button
                    onClick={() =>
                      onSelectOption({
                        strike: r.strike,
                        type: "PUT",
                        ltp: r.put.ltp,
                        symbol: `${underlyingSymbol}_${r.strike}_PE`,
                        iv: r.put.iv,
                      })
                    }
                    className="rounded px-2 py-0.5 hover:bg-rose-500 hover:text-white transition-all"
                  >
                    ₹{r.put.ltp.toFixed(1)}
                  </button>
                </td>
                <td className={`p-1.5 text-left text-muted-foreground ${r.isPutItm ? "bg-rose-500/5" : ""}`}>
                  {r.put.iv}%
                </td>
                <td className={`p-1.5 text-left text-muted-foreground ${r.isPutItm ? "bg-rose-500/5" : ""}`}>
                  {r.put.vol.toLocaleString()}
                </td>
                <td className={`p-1.5 text-left text-muted-foreground ${r.isPutItm ? "bg-rose-500/5" : ""}`}>
                  {r.put.oi.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500/30" /> In-The-Money (ITM) Shading
        </span>
        <span>Click any Call or Put LTP to populate the Order Ticket & Option Greeks</span>
      </div>
    </div>
  );
}

