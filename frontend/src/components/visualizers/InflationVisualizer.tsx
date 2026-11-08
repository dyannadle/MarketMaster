import { useState, useMemo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { Slider } from "@/components/ui/slider";

export function InflationVisualizer() {
  const [initialAmount, setInitialAmount] = useState(1000000);
  const [inflationRate, setInflationRate] = useState(6.0);
  const [years, setYears] = useState(15);

  const data = useMemo(() => {
    const points = [];
    const r = inflationRate / 100.0;
    for (let yr = 0; yr <= years; yr++) {
      const realValue = initialAmount / Math.pow(1 + r, yr);
      points.push({
        year: yr === 0 ? "Today" : `Yr ${yr}`,
        nominal: initialAmount,
        realValue: Math.round(realValue),
        lossPct: Math.round(((initialAmount - realValue) / initialAmount) * 100),
      });
    }
    return points;
  }, [initialAmount, inflationRate, years]);

  const currentRealValue = data[data.length - 1]?.realValue ?? initialAmount;
  const purchasingPowerLost = Math.round(((initialAmount - currentRealValue) / initialAmount) * 100);
  const halvingYears = Math.round(72 / inflationRate);

  return (
    <div className="space-y-6 rounded-xl border border-primary/20 bg-background/50 p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-4">
        <div>
          <h4 className="font-bold text-foreground">Interactive Purchasing Power Simulator</h4>
          <p className="text-xs text-muted-foreground">See how inflation silently erodes real rupee purchasing power over time.</p>
        </div>
        <span className="rounded-md bg-loss/15 px-2.5 py-1 text-xs font-semibold text-loss">
          -{purchasingPowerLost}% Real Value Lost
        </span>
      </div>

      {/* Control Sliders */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Annual Inflation Rate</span>
            <span className="text-primary font-mono">{inflationRate}% (RBI target: 4% ± 2%)</span>
          </div>
          <Slider
            min={3}
            max={12}
            step={0.5}
            value={[inflationRate]}
            onValueChange={([val]) => val !== undefined && setInflationRate(val)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-muted-foreground">Time Horizon</span>
            <span className="text-primary font-mono">{years} Years</span>
          </div>
          <Slider
            min={1}
            max={30}
            step={1}
            value={[years]}
            onValueChange={([val]) => val !== undefined && setYears(val)}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-card/60 p-3">
          <p className="text-[11px] text-muted-foreground">Initial Capital</p>
          <p className="font-mono text-base font-bold text-foreground">₹{initialAmount.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-lg border bg-card/60 p-3">
          <p className="text-[11px] text-muted-foreground">Future Purchasing Power</p>
          <p className="font-mono text-base font-bold text-loss">₹{currentRealValue.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-lg border bg-card/60 p-3">
          <p className="text-[11px] text-muted-foreground">Purchasing Power Loss</p>
          <p className="font-mono text-base font-bold text-loss">{purchasingPowerLost}%</p>
        </div>
        <div className="rounded-lg border bg-card/60 p-3">
          <p className="text-[11px] text-muted-foreground">Value Halving Time</p>
          <p className="font-mono text-base font-bold text-primary">~{halvingYears} Years</p>
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="realValueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="year" stroke="#64748b" fontSize={11} tickLine={false} />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length && payload[0]?.payload) {
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-border bg-popover/95 p-3 text-xs shadow-xl backdrop-blur-md">
                      <p className="font-bold text-foreground">{d.year}</p>
                      <p className="text-muted-foreground">Original Amount: <span className="font-mono text-foreground">₹{d.nominal.toLocaleString("en-IN")}</span></p>
                      <p className="text-primary">Real Value: <span className="font-mono font-bold">₹{d.realValue.toLocaleString("en-IN")}</span></p>
                      <p className="text-loss">Purchasing Power Eroded: <span className="font-mono">{d.lossPct}%</span></p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="realValue"
              stroke="var(--primary)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#realValueGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] italic text-muted-foreground">
        * Based on Rule of 72: At {inflationRate}% inflation, your cash loses half of its purchasing ability every {halvingYears} years without active compounding return.
      </p>
    </div>
  );
}

