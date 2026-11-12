import { useState, useEffect } from "react";
import { Trophy, ShieldCheck, Calendar, Flame, Award, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlphaArenaEntry,
  loadArenaEntries,
  submitArenaRun,
} from "@/lib/alpha-arena";

interface AlphaArenaPanelProps {
  traderTier?: string;
}

export function AlphaArenaPanel({ traderTier = "Prop Desk Trainee" }: AlphaArenaPanelProps) {
  const [entries, setEntries] = useState<AlphaArenaEntry[]>([]);
  const [enrolled, setEnrolled] = useState(true);

  useEffect(() => {
    setEntries(loadArenaEntries());
  }, []);

  const userRank = entries.findIndex((e) => e.isCurrentUser) + 1;
  const userEntry = entries.find((e) => e.isCurrentUser);

  const handleSimulateDisciplinedWeek = () => {
    const updated = submitArenaRun({
      weeklyReturnPct: 7.4,
      maxDrawdownPct: 1.2,
      sharpeRatio: 2.68,
      rule43Violations: 0,
      tradesCount: 16,
      tier: traderTier,
    });
    setEntries(updated);
    toast.success("Alpha Arena: Submitted disciplined weekly run (+7.4% return, 1.2% Max DD)!");
  };

  return (
    <div className="space-y-6">
      {/* Tournament Banner */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-emerald-500/5 p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                <Trophy className="h-3.5 w-3.5" /> Weekly Alpha Arena
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                <Calendar className="h-3 w-3" /> Mon 09:15 – Fri 15:30 IST
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-mono font-bold text-muted-foreground">
                ₹0 Free Entry
              </span>
            </div>
            <h2 className="text-lg font-bold tracking-tight">
              Risk-Adjusted Institutional Paper Tournament
            </h2>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Ranked strictly by <strong>Calmar Ratio &amp; Risk-Adjusted Score</strong> rather than raw P&amp;L.
              Reckless 100x leverage gamblers with massive drawdowns are penalized below disciplined Rule 4.3 risk managers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={enrolled ? "outline" : "default"}
              size="sm"
              onClick={() => {
                setEnrolled(true);
                toast.success("Enrolled in this week's Alpha Arena (Mon–Fri IST)!");
              }}
              className="text-xs font-bold"
            >
              {enrolled ? "✓ Enrolled This Week" : "Join Free Tournament"}
            </Button>
            <Button
              size="sm"
              onClick={handleSimulateDisciplinedWeek}
              className="gap-1.5 text-xs font-bold"
            >
              <TrendingUp className="h-3.5 w-3.5" /> Submit Disciplined Run
            </Button>
          </div>
        </div>

        {/* User Active Standing */}
        {userEntry && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/40 pt-4 sm:grid-cols-4">
            <div className="rounded-xl border border-border/50 bg-background/60 p-3 text-center">
              <span className="text-[10px] uppercase text-muted-foreground">Current Rank</span>
              <p className="num mt-0.5 text-xl font-black text-primary">#{userRank}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/60 p-3 text-center">
              <span className="text-[10px] uppercase text-muted-foreground">Calmar Ratio</span>
              <p className="num mt-0.5 text-xl font-black text-emerald-400">
                {userEntry.calmarRatio.toFixed(1)}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/60 p-3 text-center">
              <span className="text-[10px] uppercase text-muted-foreground">Weekly Return / DD</span>
              <p className="num mt-0.5 text-sm font-bold">
                <span className="text-gain">+{userEntry.weeklyReturnPct}%</span>{" "}
                <span className="text-muted-foreground">/</span>{" "}
                <span className="text-loss">-{userEntry.maxDrawdownPct}%</span>
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/60 p-3 text-center">
              <span className="text-[10px] uppercase text-muted-foreground">Risk-Adjusted Score</span>
              <p className="num mt-0.5 text-xl font-black text-foreground">
                {userEntry.riskAdjustedScore.toFixed(1)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Calmar-Ranked Leaderboard Table */}
      <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
        <table className="w-full text-xs">
          <thead className="border-b border-border/60 bg-secondary/30 text-left text-muted-foreground">
            <tr>
              <th className="p-3.5">Rank</th>
              <th className="p-3.5">Trader</th>
              <th className="p-3.5 text-right">Weekly Return</th>
              <th className="p-3.5 text-right">Max Drawdown</th>
              <th className="p-3.5 text-right">Calmar Ratio</th>
              <th className="p-3.5 text-right">Sharpe</th>
              <th className="p-3.5 text-center">Rule 4.3 Violations</th>
              <th className="p-3.5 text-right">Alpha Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {entries.map((entry, idx) => {
              const rank = idx + 1;
              const isReckless = entry.maxDrawdownPct > 15 || entry.rule43Violations > 2;
              return (
                <tr
                  key={entry.id}
                  className={
                    entry.isCurrentUser
                      ? "bg-primary/10 font-semibold"
                      : "hover:bg-secondary/20 transition-colors"
                  }
                >
                  <td className="p-3.5 font-mono font-bold">
                    {rank === 1 ? (
                      <span className="inline-flex items-center gap-1 text-amber-400">
                        <Award className="h-4 w-4" /> #1
                      </span>
                    ) : (
                      `#${rank}`
                    )}
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{entry.traderName}</span>
                      {entry.isCurrentUser && (
                        <span className="rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
                          YOU
                        </span>
                      )}
                      {isReckless && (
                        <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">
                          <Flame className="h-2.5 w-2.5" /> High DD Penalty
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{entry.tier} · {entry.tradesCount} trades</p>
                  </td>
                  <td className="num p-3.5 text-right font-bold text-gain">
                    +{entry.weeklyReturnPct.toFixed(1)}%
                  </td>
                  <td className="num p-3.5 text-right font-bold text-loss">
                    -{entry.maxDrawdownPct.toFixed(1)}%
                  </td>
                  <td className="num p-3.5 text-right font-black text-emerald-400">
                    {entry.calmarRatio.toFixed(1)}
                  </td>
                  <td className="num p-3.5 text-right font-mono">{entry.sharpeRatio.toFixed(2)}</td>
                  <td className="p-3.5 text-center">
                    {entry.rule43Violations === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        <ShieldCheck className="h-3 w-3" /> 0
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                        <AlertTriangle className="h-3 w-3" /> {entry.rule43Violations}
                      </span>
                    )}
                  </td>
                  <td className="num p-3.5 text-right font-black text-primary">
                    {entry.riskAdjustedScore.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
