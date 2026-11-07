import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Change } from "@/components/AppShell";
import { inr, instruments } from "@/lib/data";
import { applyOrder, useAccount, useLivePrices } from "@/lib/paper";

export const Route = createFileRoute("/trade")({
  validateSearch: (s: Record<string, unknown>): { s?: string | undefined } => ({ s: typeof s["s"] === "string" ? s["s"] : undefined }),
  head: () => ({
    meta: [
      { title: "Paper Trading Terminal — MarketMaster" },
      { name: "description", content: "Place simulated market and limit orders with ₹10 lakh virtual capital." },
      { property: "og:title", content: "Paper Trading Terminal — MarketMaster" },
      { property: "og:description", content: "Realistic order entry, positions and order book — zero real money." },
    ],
  }),
  component: Trade,
});

const tradable = instruments.filter((i) => i.segment !== "Index");

function Trade() {
  const { s } = Route.useSearch();
  const prices = useLivePrices();
  const { acc, save } = useAccount();
  const [sym, setSym] = useState(s && tradable.some((t) => t.symbol === s) ? s : tradable[0]!.symbol);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [type, setType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [lots, setLots] = useState(1);
  const [limit, setLimit] = useState("");
  const [hist, setHist] = useState<{ t: number; v: number }[]>([]);
  const inst = tradable.find((t) => t.symbol === sym)!;
  const q = prices[sym]!;

  useEffect(() => setHist([]), [sym]);
  useEffect(() => setHist((h) => [...h.slice(-80), { t: Date.now(), v: q.p }]), [q.p]);

  const qty = lots * inst.lot;
  const px = type === "LIMIT" && Number(limit) > 0 ? Number(limit) : q.p;
  const book = Array.from({ length: 5 }, (_, i) => ({ bid: q.p * (1 - 0.0004 * (i + 1)), ask: q.p * (1 + 0.0004 * (i + 1)), qb: 100 + ((i * 37) % 90) * 7, qa: 120 + ((i * 53) % 80) * 6 }));

  const place = () => {
    const r = applyOrder(acc, { symbol: sym, side, qty, price: px, type });
    if (typeof r === "string") { toast.error(r); return; }
    save(r);
    toast.success(`${side} ${qty} ${sym} @ ${px.toFixed(2)} filled`);
  };

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[220px_1fr_320px] md:p-6">
      <div className="rounded-xl border bg-card">
        <p className="border-b p-3 text-xs font-medium text-muted-foreground">WATCHLIST</p>
        <ul className="max-h-[70vh] overflow-y-auto">
          {tradable.map((t) => {
            const p = prices[t.symbol]!;
            return (
              <li key={t.symbol}>
                <button onClick={() => setSym(t.symbol)} className={`flex w-full justify-between px-3 py-2.5 text-left text-sm ${t.symbol === sym ? "bg-accent" : "hover:bg-accent/50"}`}>
                  <span>{t.symbol}<span className="block text-[10px] text-muted-foreground">{t.segment}</span></span>
                  <span className="text-right"><span className="num block">{p.p.toLocaleString("en-IN")}</span><Change v={((p.p - p.base) / p.base) * 100} /></span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div><h1 className="text-xl font-bold">{sym}</h1><p className="text-xs text-muted-foreground">{inst.name} · {inst.exchange} · Lot {inst.lot}</p></div>
            <p className="num text-2xl">{q.p.toLocaleString("en-IN")} <Change v={((q.p - q.base) / q.base) * 100} /></p>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <LineChart data={hist}><YAxis domain={["auto", "auto"]} hide /><Line dataKey="v" dot={false} stroke="var(--primary)" strokeWidth={2} isAnimationActive={false} /></LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-card">
          <p className="border-b p-3 text-xs font-medium text-muted-foreground">ORDER HISTORY</p>
          {acc.orders.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No orders yet.</p> : (
            <table className="w-full text-sm"><tbody>
              {acc.orders.slice(0, 8).map((o) => (
                <tr key={o.id} className="border-t">
                  <td className={`p-3 font-medium ${o.side === "BUY" ? "text-gain" : "text-loss"}`}>{o.side}</td>
                  <td className="p-3">{o.symbol}</td><td className="num p-3">{o.qty}</td><td className="num p-3">{o.price.toFixed(2)}</td>
                  <td className="p-3 text-xs text-muted-foreground">{o.type}</td><td className="p-3 text-xs text-gain">FILLED</td>
                </tr>
              ))}
            </tbody></table>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(["BUY", "SELL"] as const).map((x) => (
              <button key={x} onClick={() => setSide(x)} className={`rounded-md py-2 text-sm font-semibold ${side === x ? (x === "BUY" ? "bg-gain text-primary-foreground" : "bg-loss text-destructive-foreground") : "text-muted-foreground"}`}>{x}</button>
            ))}
          </div>
          <div className="mt-4 flex gap-2 text-sm">
            {(["MARKET", "LIMIT"] as const).map((x) => (
              <button key={x} onClick={() => setType(x)} className={`rounded-md border px-3 py-1 ${type === x ? "border-primary text-primary" : "text-muted-foreground"}`}>{x}</button>
            ))}
          </div>
          <label className="mt-4 block text-xs text-muted-foreground">Lots (qty {qty})
            <input type="number" min={1} value={lots} onChange={(e) => setLots(Math.max(1, Number(e.target.value)))} className="num mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground" />
          </label>
          {type === "LIMIT" && (
            <label className="mt-3 block text-xs text-muted-foreground">Limit price
              <input type="number" value={limit} placeholder={q.p.toFixed(2)} onChange={(e) => setLimit(e.target.value)} className="num mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground" />
            </label>
          )}
          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <p className="flex justify-between">Order value <span className="num text-foreground">{inr(qty * px)}</span></p>
            <p className="flex justify-between">Available cash <span className="num text-foreground">{inr(acc.cash)}</span></p>
          </div>
          <Button className="mt-4 w-full" onClick={place}>{side} {sym}</Button>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">MARKET DEPTH</p>
          <div className="num grid grid-cols-2 gap-x-3 text-xs">
            {book.map((b, i) => (
              <div key={i} className="contents">
                <p className="flex justify-between py-0.5 text-gain"><span>{b.qb}</span><span>{b.bid.toFixed(2)}</span></p>
                <p className="flex justify-between py-0.5 text-loss"><span>{b.ask.toFixed(2)}</span><span>{b.qa}</span></p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
