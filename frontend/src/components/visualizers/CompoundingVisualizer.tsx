import { useState, useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Slider } from "@/components/ui/slider";

export function CompoundingVisualizer() {
  const [principal, setPrincipal] = useState(100000);
  const [cagr, setCagr] = useState(12.0); // 12% Nifty historic CAGR
  const [years, setYears] = useState(20);

  const data = useMemo(() => {
    const list = [];
    const r = cagr / 100.0;
    for (let yr = 0; yr <= years; yr += Math.max(1, Math.floor(years / 8))) {
      const simple = Math.round(principal * (1 + r * yr));
      const compound = Math.round(principal * Math.pow(1 + r, yr));
      list.push({
        year: `Yr ${yr}`,
        Principal: principal,
        SimpleInterest: simple,
        CompoundWealth: compound,
        WealthMultiplier: (compound / principal).toFixed(1) + "x",
      });
    }
    return list;
  }, [principal, cagr, years]);

  const finalCompound = Math.round(principal * Math.pow(1 + cagr / 100.0, years));
  const multiplier = (finalCompound / principal).toFixed(1);

  return (
    <div className="space-y-6 rounded-xl border border-primary/20 bg-background/50 p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
        <div>
          <h4 className="font-bold text-foreground">Compounding Growth Visualizer</h4>
          <p className="text-xs text-muted-foreground">Compare Simple Interest vs Compound Interest (Einstein's 8th Wonder).</p>
        </div>
        <span className="rounded-md bg-gain/15 px-2.5 py-1 text-xs font-semibold text-gain">
          {multiplier}x Wealth Multiplier
        </span>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Expected Annual CAGR</span>
            <span className="text-primary font-mono">{cagr}% (NIFTY 50 20-Yr Avg: ~12-14%)</span>
          </div>
          <Slider
            min={4}
            max={25}
            step={0.5}
            value={[cagr]}
            onValueChange={([val]) => val !== undefined && setCagr(val)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Investment Horizon</span>
            <span className="text-primary font-mono">{years} Years</span>
          </div>
          <Slider
            min={1}
            max={35}
            step={1}
            value={[years]}
            onValueChange={([val]) => val !== undefined && setYears(val)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-card/60 p-3">
          <p className="text-[11px] text-muted-foreground">Initial Principal</p>
          <p className="font-mono text-base font-bold text-foreground">₹{principal.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-lg border bg-card/60 p-3">
          <p className="text-[11px] text-muted-foreground">Terminal Wealth</p>
          <p className="font-mono text-base font-bold text-gain">₹{finalCompound.toLocaleString("en-IN")}</p>
        </div>
        <div className="col-span-2 rounded-lg border bg-card/60 p-3 md:col-span-1">
          <p className="text-[11px] text-muted-foreground">Total Growth</p>
          <p className="font-mono text-base font-bold text-primary">₹{(finalCompound - principal).toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <XAxis dataKey="year" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-border bg-popover/95 p-3 text-xs shadow-xl backdrop-blur-md">
                      <p className="font-bold text-foreground">{d.year}</p>
                      <p className="text-muted-foreground">Simple Interest: ₹{d.SimpleInterest.toLocaleString("en-IN")}</p>
                      <p className="font-bold text-gain">Compound Interest: ₹{d.CompoundWealth.toLocaleString("en-IN")}</p>
                      <p className="text-primary font-mono">Multiplier: {d.WealthMultiplier}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
            <Bar dataKey="SimpleInterest" name="Simple Growth" fill="#64748b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="CompoundWealth" name="Compound Growth" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

