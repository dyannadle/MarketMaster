import { createFileRoute, Link } from "@tanstack/react-router";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowRight, BookOpen, CandlestickChart, FlaskConical, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Change } from "@/components/AppShell";
import { curriculum, instruments, inr, seededSeries } from "@/lib/data";
import { useAccount, useLivePrices, STARTING_CASH } from "@/lib/paper";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarketMaster Academy — Learn, Practise, Master the Markets" },
      { name: "description", content: "From financial literacy to F&O, currency, commodities and algo trading — with a realistic paper trading terminal." },
      { property: "og:title", content: "MarketMaster Academy" },
      { property: "og:description", content: "Learn every market concept and practise with virtual funds." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const prices = useLivePrices();
  const { acc } = useAccount();
  const holdings = acc.positions.reduce((s, p) => s + p.qty * (prices[p.symbol]?.p ?? p.avg), 0);
  const equity = acc.cash + holdings;
  const curve = seededSeries(7, 60, STARTING_CASH, 0.006);

  return (
    <div>
      <section className="relative overflow-hidden border-b bg-hero px-5 py-14 md:px-8 md:py-20">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative max-w-3xl">
          <p className="mb-4 inline-flex rounded-full border px-3 py-1 text-xs text-muted-foreground">Equity · F&O · Currency · Commodity · Algo</p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Learn. Practise. <span className="text-primary">Master the markets.</span>
          </h1>
          <p className="mt-5 max-w-xl text-muted-foreground">
            A full academy from zero to professional — SEBI, NSE, BSE, MCX, options, hedging, RMS, slicing algos — paired with a realistic paper trading terminal.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/learn">Start learning <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/trade">Open terminal</Link></Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 p-5 md:grid-cols-3 md:p-8">
        <div className="rounded-2xl border bg-card p-5 md:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Virtual account equity</p>
              <p className="num mt-1 text-3xl font-semibold">{inr(equity)}</p>
              <p className="mt-1 text-sm"><Change v={((equity - STARTING_CASH) / STARTING_CASH) * 100} /> <span className="text-muted-foreground">all time</span></p>
            </div>
            <p className="num text-right text-sm text-muted-foreground">Cash<br /><span className="text-foreground">{inr(acc.cash)}</span></p>
          </div>
          <div className="mt-4 h-40">
            <ResponsiveContainer>
              <AreaChart data={curve}>
                <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--primary)" stopOpacity={0.4} /><stop offset="1" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs>
                <Area dataKey="v" stroke="var(--primary)" fill="url(#g)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <p className="mb-3 text-sm font-medium">Market pulse</p>
          <ul className="space-y-2.5">
            {instruments.slice(0, 7).map((i) => {
              const q = prices[i.symbol]!;
              return (
                <li key={i.symbol} className="flex items-center justify-between text-sm">
                  <span>{i.symbol}<span className="ml-2 text-xs text-muted-foreground">{i.exchange}</span></span>
                  <span className="text-right"><span className="num">{q.p.toLocaleString("en-IN")}</span> <Change v={((q.p - q.base) / q.base) * 100} /></span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 px-5 pb-8 sm:grid-cols-2 md:px-8 lg:grid-cols-4">
        {[
          { icon: BookOpen, t: "Learn", d: `${curriculum.length} levels, ${curriculum.reduce((s, l) => s + l.courses.length, 0)} courses`, to: "/learn" },
          { icon: CandlestickChart, t: "Paper trade", d: "₹10L virtual capital", to: "/trade" },
          { icon: FlaskConical, t: "Strategy lab", d: "Backtest & slicing algos", to: "/lab" },
          { icon: ShieldCheck, t: "Risk & RMS", d: "Margin, exposure, sizing", to: "/portfolio" },
        ].map((f) => (
          <Link key={f.t} to={f.to} className="group rounded-2xl border bg-card p-5 transition hover:shadow-glow">
            <f.icon className="size-6 text-primary" />
            <p className="mt-4 font-semibold">{f.t}</p>
            <p className="text-sm text-muted-foreground">{f.d}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
