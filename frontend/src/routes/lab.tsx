import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/AppShell";
import { seededSeries, strategies } from "@/lib/data";

export const Route = createFileRoute("/lab")({
  head: () => ({
    meta: [
      { title: "Strategy Lab — MarketMaster" },
      { name: "description", content: "Backtest signal strategies and visualise TWAP/VWAP order slicing." },
      { property: "og:title", content: "Strategy Lab — MarketMaster" },
      { property: "og:description", content: "Moving-average backtests and execution slicing simulator." },
    ],
  }),
  component: Lab,
});

function Lab() {
  const [fast, setFast] = useState(10);
  const [slow, setSlow] = useState(30);
  const [total, setTotal] = useState(10000);
  const [slices, setSlices] = useState(8);

  const bt = useMemo(() => {
    const px = seededSeries(42, 250, 1000, 0.02);
    const ma = (i: number, n: number) => (i < n ? null : px.slice(i - n, i).reduce((s, p) => s + p.v, 0) / n);
    let eq = 100, pos = 0, trades = 0;
    const curve = px.map((p, i) => {
      if (i > 0 && pos) eq *= p.v / px[i - 1]!.v;
      const f = ma(i, fast), s = ma(i, slow);
      if (f && s) { const want = f > s ? 1 : 0; if (want !== pos) { trades++; pos = want; } }
      return { t: i, strat: +eq.toFixed(2), hold: +((p.v / px[0]!.v) * 100).toFixed(2) };
    });
    return { curve, trades, ret: eq - 100 };
  }, [fast, slow]);

  const twap = Array.from({ length: slices }, (_, i) => ({ s: `T${i + 1}`, qty: Math.round(total / slices) }));

  return (
    <div>
      <PageHeader title="Strategy Lab" sub="Backtest on synthetic data and simulate execution slicing." />
      <div className="grid gap-4 p-5 lg:grid-cols-2 md:p-8">
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">MA Crossover backtest</h2>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <Slider label={`Fast MA ${fast}`} v={fast} min={3} max={50} set={setFast} />
            <Slider label={`Slow MA ${slow}`} v={slow} min={10} max={120} set={setSlow} />
          </div>
          <div className="mt-4 h-56"><ResponsiveContainer><LineChart data={bt.curve}><XAxis dataKey="t" hide /><YAxis hide domain={["auto", "auto"]} /><Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} /><Line dataKey="strat" name="Strategy" stroke="var(--primary)" dot={false} /><Line dataKey="hold" name="Buy & hold" stroke="var(--muted-foreground)" dot={false} /></LineChart></ResponsiveContainer></div>
          <p className="mt-2 text-sm">Return <span className={`num ${bt.ret >= 0 ? "text-gain" : "text-loss"}`}>{bt.ret.toFixed(1)}%</span> · Trades <span className="num">{bt.trades}</span></p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">TWAP slicing simulator</h2>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <Slider label={`Parent qty ${total}`} v={total} min={1000} max={50000} step={1000} set={setTotal} />
            <Slider label={`Slices ${slices}`} v={slices} min={2} max={20} set={setSlices} />
          </div>
          <div className="mt-4 h-56"><ResponsiveContainer><BarChart data={twap}><XAxis dataKey="s" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} /><Bar dataKey="qty" fill="var(--chart-2)" radius={4} /></BarChart></ResponsiveContainer></div>
          <p className="mt-2 text-sm text-muted-foreground">Each child order: <span className="num text-foreground">{Math.round(total / slices)}</span> shares at equal time intervals.</p>
        </div>
      </div>
      <div className="grid gap-3 px-5 pb-10 sm:grid-cols-2 lg:grid-cols-4 md:px-8">
        {strategies.map((s) => (
          <div key={s.name} className="rounded-xl border bg-card p-4"><p className="text-xs text-primary">{s.type}</p><p className="mt-1 font-semibold">{s.name}</p><p className="mt-1 text-sm text-muted-foreground">{s.desc}</p></div>
        ))}
      </div>
    </div>
  );
}

function Slider({ label, v, min, max, step = 1, set }: { label: string; v: number; min: number; max: number; step?: number; set: (n: number) => void }) {
  return <label className="flex flex-col gap-1">{label}<input type="range" className="accent-primary" min={min} max={max} step={step} value={v} onChange={(e) => set(Number(e.target.value))} /></label>;
}
