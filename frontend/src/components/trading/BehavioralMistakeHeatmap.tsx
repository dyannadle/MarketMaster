import { useState, useEffect } from "react";
import {
  Brain,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Flame,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/data";
import {
  calculateBehavioralMistakes,
  getJournalTrades,
  resetJournal,
  BehavioralHeatmapReport,
  JournalTrade,
} from "@/lib/journal";

export function BehavioralMistakeHeatmap() {
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [report, setReport] = useState<BehavioralHeatmapReport | null>(null);

  const refreshData = () => {
    const currentTrades = getJournalTrades();
    setTrades(currentTrades);
    setReport(calculateBehavioralMistakes(currentTrades));
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (!report) return null;

  const theoreticalEdgePnl = report.disciplinedPnl;
  const leakage = report.emotionalLossTax;

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
              <Brain className="h-4 w-4" />
            </div>
            <h3 className="text-base font-bold tracking-tight">Behavioral Mistake Heatmap</h3>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Trader Psychology
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Quantifying the exact P&L cost of emotional errors vs. disciplined strategy edge
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const reset = resetJournal();
              setTrades(reset);
              setReport(calculateBehavioralMistakes(reset));
            }}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" /> Reset Demo History
          </Button>
        </div>
      </div>

      {/* Psychology Metric Telemetry Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Disciplined Edge PnL */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>Disciplined Edge P&L</span>
            <ShieldCheck className="h-4 w-4" />
          </div>
          <p className="num mt-2 text-xl font-black text-emerald-400">
            {theoreticalEdgePnl >= 0 ? "+" : ""}{inr(theoreticalEdgePnl)}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{report.disciplinedTradesCount} trades</span>
            <span className="font-semibold text-emerald-400">{report.disciplinedWinRatePct}% win rate</span>
          </div>
        </div>

        {/* Emotional Loss Tax */}
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
          <div className="flex items-center justify-between text-xs text-rose-400 font-medium">
            <span>Emotional Leakage (Loss)</span>
            <Flame className="h-4 w-4" />
          </div>
          <p className="num mt-2 text-xl font-black text-rose-400">
            -{inr(leakage)}
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{report.emotionalTradesCount} mistakes</span>
            <span className="font-semibold text-rose-400">{report.emotionalWinRatePct}% win rate</span>
          </div>
        </div>

        {/* Net Realized PnL */}
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Net Realized P&L</span>
            {report.netPnl >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-400" />
            )}
          </div>
          <p className={`num mt-2 text-xl font-black ${report.netPnl >= 0 ? "text-gain" : "text-loss"}`}>
            {report.netPnl >= 0 ? "+" : ""}{inr(report.netPnl)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Overall across {report.totalTrades} journaled trades
          </p>
        </div>

        {/* Average Discipline Score */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between text-xs text-primary font-medium">
            <span>Discipline Rating</span>
            <Brain className="h-4 w-4" />
          </div>
          <p className="num mt-2 text-xl font-black text-primary">
            {report.disciplineScoreAverage} / 100
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {report.disciplineScoreAverage >= 85
              ? "Institutional Grade"
              : report.disciplineScoreAverage >= 70
              ? "Acceptable Control"
              : "Cool-Down Required"}
          </p>
        </div>
      </div>

      {/* AI Institutional Psychology Coach Callout */}
      <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground font-bold text-xs">
            PM
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                Risk Manager Behavioral Diagnosis
              </h4>
              {report.topBehavioralLeak && (
                <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                  Primary Leak: {report.topBehavioralLeak}
                </span>
              )}
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed font-sans">
              {report.coachingRecommendation}
            </p>
          </div>
        </div>
      </div>

      {/* Behavioral Mistake Heatmap Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cognitive Error & Discipline Breakdown
          </h4>
          <span className="text-[11px] text-muted-foreground">
            Color intensity indicates magnitude of P&L impact
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {report.tagMetrics.map((item) => {
            const isPlan = item.tag === "#PlanAdhered";
            const isNegative = item.totalPnl < 0;

            let heatBg = "bg-card border-border/50";
            if (isPlan) {
              heatBg = "bg-emerald-500/5 border-emerald-500/30";
            } else if (item.severity === "critical" && item.tradeCount > 0) {
              heatBg = "bg-rose-500/10 border-rose-500/40";
            } else if (item.tradeCount > 0) {
              heatBg = "bg-amber-500/10 border-amber-500/30";
            }

            return (
              <div
                key={item.tag}
                className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${heatBg}`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-foreground">
                      {item.tag}
                    </span>
                    <span className="rounded bg-secondary/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {item.tradeCount} trades
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 border-t border-border/40 pt-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] uppercase text-muted-foreground">Net P&L</span>
                    <span
                      className={`num text-sm font-black ${
                        item.totalPnl >= 0 ? "text-gain" : "text-loss"
                      }`}
                    >
                      {item.totalPnl >= 0 ? "+" : ""}{inr(item.totalPnl)}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Win Rate</span>
                    <span className="font-semibold text-foreground">{item.winRatePct}%</span>
                  </div>

                  {!isPlan && item.tradeCount > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Share of Error Loss</span>
                        <span className="font-bold text-rose-400">{item.shareOfMistakeLossPct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-secondary/60 overflow-hidden">
                        <div
                          className="h-full bg-rose-500 rounded-full"
                          style={{ width: `${Math.min(item.shareOfMistakeLossPct, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Journal History */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Trade Journal Logs & Post-Mortem Tags
        </h4>

        <div className="overflow-x-auto rounded-xl border border-border/50 bg-card">
          <table className="w-full text-xs">
            <thead className="bg-secondary/30 text-left text-muted-foreground border-b border-border/50">
              <tr>
                <th className="p-3">Time</th>
                <th className="p-3">Contract</th>
                <th className="p-3 text-right">Side / Qty</th>
                <th className="p-3 text-right">Entry → Exit</th>
                <th className="p-3 text-right">Realized P&L</th>
                <th className="p-3">Behavioral Tags</th>
                <th className="p-3">Reflection Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {trades.slice(0, 8).map((t) => {
                const dateStr = new Date(t.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const isGain = t.realizedPnl >= 0;

                return (
                  <tr key={t.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="p-3 font-mono text-muted-foreground">{dateStr}</td>
                    <td className="p-3 font-bold">{t.symbol}</td>
                    <td className="p-3 text-right font-medium">
                      <span className={t.side === "BUY" ? "text-primary" : "text-amber-400"}>
                        {t.side}
                      </span>{" "}
                      {t.quantity}
                    </td>
                    <td className="p-3 text-right font-mono">
                      ₹{t.entryPrice.toFixed(1)} → ₹{t.exitPrice.toFixed(1)}
                    </td>
                    <td className={`p-3 text-right font-bold font-mono ${isGain ? "text-gain" : "text-loss"}`}>
                      {isGain ? "+" : ""}{inr(t.realizedPnl)}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {t.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                              tag === "#PlanAdhered"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground max-w-xs truncate" title={t.notes}>
                      {t.notes || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
