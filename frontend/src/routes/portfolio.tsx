import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileSpreadsheet, Brain, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Change, PageHeader } from "@/components/AppShell";
import { inr } from "@/lib/data";
import { STARTING_CASH, useAccount, useLivePrices } from "@/lib/paper";
import { TradeStatementExporter } from "@/components/trading/TradeStatementExporter";
import { BehavioralMistakeHeatmap } from "@/components/trading/BehavioralMistakeHeatmap";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio & Risk — MarketMaster" },
      { name: "description", content: "Track virtual holdings, P&L, behavioral mistake heatmap, and risk exposure." },
      { property: "og:title", content: "Portfolio & Risk — MarketMaster" },
      { property: "og:description", content: "Positions, P&L, psychology diagnostics and RMS-style exposure for your paper account." },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  const [isExporterOpen, setIsExporterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"POSITIONS" | "PSYCHOLOGY">("POSITIONS");
  const prices = useLivePrices();
  const { acc, reset } = useAccount();
  const rows = acc.positions.map((p) => {
    const avg = Number(p.avg || 0);
    const qty = Number(p.qty || 0);
    const ltp = Number(prices[p.symbol]?.p ?? avg);
    return { ...p, avg, qty, ltp, value: ltp * qty, pnl: (ltp - avg) * qty };
  });
  const invested = rows.reduce((s, r) => s + r.value, 0);
  const equity = Number(acc.cash || 0) + invested;
  const pnl = rows.reduce((s, r) => s + r.pnl, 0);
  const exposure = equity > 0 ? (invested / equity) * 100 : 0;
  const largest = rows.length && equity > 0 ? (Math.max(...rows.map((r) => r.value)) / equity) * 100 : 0;

  return (
    <div className="pb-12">
      <PageHeader title="Portfolio & Risk" sub="Your virtual account, positions, RMS checks and psychological analytics.">
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsExporterOpen(true)} className="gap-2 font-bold text-xs">
            <FileSpreadsheet className="size-4" /> Export Statement (CSV / PDF)
          </Button>
          <Button variant="outline" onClick={() => confirm("Reset paper account to ₹10,00,000?") && reset()}>
            Reset account
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 md:p-8">
        <Stat label="Total equity" value={inr(equity)} extra={<Change v={STARTING_CASH > 0 ? ((equity - STARTING_CASH) / STARTING_CASH) * 100 : 0} />} />
        <Stat label="Unrealised P&L" value={inr(pnl)} tone={pnl >= 0 ? "text-gain" : "text-loss"} />
        <Stat label="Exposure" value={`${Number(exposure || 0).toFixed(1)}%`} extra={<Bar v={exposure} />} />
        <Stat label="Largest position" value={`${Number(largest || 0).toFixed(1)}%`} extra={<span className={`text-xs ${largest > 25 ? "text-loss" : "text-gain"}`}>{largest > 25 ? "Concentration risk" : "Within limits"}</span>} />
      </div>

      {/* View Switcher: Open Positions vs Behavioral Psychology Heatmap */}
      <div className="mx-5 mb-4 flex border-b border-border/60 md:mx-8">
        <button
          onClick={() => setActiveTab("POSITIONS")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "POSITIONS"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="size-4" />
          <span>Active Holdings & Positions ({rows.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("PSYCHOLOGY")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "PSYCHOLOGY"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Brain className="size-4" />
          <span>Behavioral Mistake Heatmap & Psychology</span>
        </button>
      </div>

      {activeTab === "POSITIONS" ? (
        <div className="mx-5 overflow-x-auto rounded-xl border md:mx-8">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Symbol</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Avg</th>
                <th className="p-3 text-right">LTP</th>
                <th className="p-3 text-right">Value</th>
                <th className="p-3 text-right">P&L</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No open positions. Place a trade in the terminal.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.symbol} className="num border-t">
                  <td className="p-3 font-sans font-medium">{r.symbol}</td>
                  <td className="p-3 text-right">{r.qty}</td>
                  <td className="p-3 text-right">{Number(r.avg || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">{Number(r.ltp || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">{inr(r.value)}</td>
                  <td className={`p-3 text-right ${r.pnl >= 0 ? "text-gain" : "text-loss"}`}>
                    {inr(r.pnl)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mx-5 md:mx-8">
          <BehavioralMistakeHeatmap />
        </div>
      )}

      <TradeStatementExporter
        isOpen={isExporterOpen}
        onClose={() => setIsExporterOpen(false)}
      />
    </div>
  );
}

function Stat({ label, value, extra, tone = "" }: { label: string; value: string; extra?: React.ReactNode; tone?: string }) {
  return <div className="rounded-xl border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className={`num mt-1 text-xl font-semibold ${tone}`}>{value}</p><div className="mt-1">{extra}</div></div>;
}
function Bar({ v }: { v: number }) {
  return <div className="mt-2 h-1.5 rounded-full bg-muted"><div className={`h-full rounded-full ${v > 80 ? "bg-loss" : "bg-primary"}`} style={{ width: `${Math.min(v, 100)}%` }} /></div>;
}
