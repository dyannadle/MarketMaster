import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Change, PageHeader } from "@/components/AppShell";
import { instruments } from "@/lib/data";
import { useLivePrices } from "@/lib/paper";

export const Route = createFileRoute("/markets")({
  head: () => ({
    meta: [
      { title: "Markets — MarketMaster" },
      { name: "description", content: "Simulated quotes across equity, F&O, currency, commodity and ETFs." },
      { property: "og:title", content: "Markets — MarketMaster" },
      { property: "og:description", content: "Watch NSE, BSE and MCX instruments in a live simulator." },
    ],
  }),
  component: Markets,
});

const segs = ["All", "Index", "Equity", "F&O", "Currency", "Commodity", "ETF"] as const;

function Markets() {
  const prices = useLivePrices();
  const [seg, setSeg] = useState<(typeof segs)[number]>("All");
  const rows = instruments.filter((i) => seg === "All" || i.segment === seg);
  return (
    <div>
      <PageHeader title="Markets" sub="Simulated prices for practice — not live exchange data." />
      <div className="flex gap-2 overflow-x-auto px-5 py-4 md:px-8">
        {segs.map((s) => (
          <button key={s} onClick={() => setSeg(s)} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${seg === s ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{s}</button>
        ))}
      </div>
      <div className="mx-5 overflow-x-auto rounded-xl border md:mx-8">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs text-muted-foreground">
            <tr><th className="p-3">Symbol</th><th className="p-3">Segment</th><th className="p-3">Exch</th><th className="p-3 text-right">LTP</th><th className="p-3 text-right">Chg</th><th className="p-3 text-right">Lot</th><th className="p-3" /></tr>
          </thead>
          <tbody>
            {rows.map((i) => {
              const q = prices[i.symbol]!;
              return (
                <tr key={i.symbol} className="border-t hover:bg-accent/40">
                  <td className="p-3"><p className="font-medium">{i.symbol}</p><p className="text-xs text-muted-foreground">{i.name}</p></td>
                  <td className="p-3 text-muted-foreground">{i.segment}</td>
                  <td className="p-3 text-muted-foreground">{i.exchange}</td>
                  <td className="num p-3 text-right">{q.p.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-right"><Change v={((q.p - q.base) / q.base) * 100} /></td>
                  <td className="num p-3 text-right text-muted-foreground">{i.lot}</td>
                  <td className="p-3 text-right">{i.segment !== "Index" && <Link to="/trade" search={{ s: i.symbol }} className="text-primary">Trade</Link>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
