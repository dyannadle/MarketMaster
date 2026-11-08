import { useState, useEffect } from "react";
import { AlertTriangle, Award, CheckCircle2, ShieldAlert, Sparkles, X, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/data";
import { nativeBridge } from "@/lib/native";

export interface PostMortemData {
  symbol: string;
  side: "LONG" | "SHORT" | "BUY" | "SELL";
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnl: number;
  disciplineScore: number;
  disciplineDelta: number;
  tags: string[];
  stopLossUsed: boolean;
  targetUsed: boolean;
  isCoolDownTriggered: boolean;
}

interface PostMortemModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PostMortemData | null;
}

export function PostMortemModal({ isOpen, onClose, data }: PostMortemModalProps) {
  const [journalNote, setJournalNote] = useState("");
  const [coolDownTimer, setCoolDownTimer] = useState(180); // 3-minute cool-down

  useEffect(() => {
    if (!isOpen || !data) return;
    if (data.isCoolDownTriggered) {
      nativeBridge.vibrateBreathingPulse();
    } else if (data.realizedPnl < 0) {
      nativeBridge.vibrateStopLoss();
    }
  }, [isOpen, data]);

  if (!isOpen || !data) return null;

  const isProfitable = data.realizedPnl >= 0;
  const pnlPct = ((data.exitPrice - data.entryPrice) / data.entryPrice) * (data.side === "SHORT" || data.side === "SELL" ? -100 : 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/40 pb-4">
          <div className={`grid size-10 place-items-center rounded-xl ${isProfitable ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
            {isProfitable ? <Award className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Institutional Trade Post-Mortem</h2>
            <p className="text-xs text-muted-foreground">Automated behavioral diagnostics & discipline audit</p>
          </div>
        </div>

        {/* Trade Summary Telemetry */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 text-center">
            <span className="text-[10px] uppercase text-muted-foreground">Contract</span>
            <p className="mt-0.5 text-sm font-bold font-sans">{data.symbol}</p>
            <span className="text-[10px] text-muted-foreground">{data.quantity} qty</span>
          </div>

          <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 text-center">
            <span className="text-[10px] uppercase text-muted-foreground">Entry / Exit</span>
            <p className="num mt-0.5 text-xs font-mono font-bold">₹{data.entryPrice.toFixed(1)}</p>
            <span className="num text-[10px] text-muted-foreground">→ ₹{data.exitPrice.toFixed(1)}</span>
          </div>

          <div className={`rounded-xl border p-3 text-center ${isProfitable ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"}`}>
            <span className="text-[10px] uppercase text-muted-foreground">Realized P&L</span>
            <p className={`num mt-0.5 text-sm font-black ${isProfitable ? "text-gain" : "text-loss"}`}>
              {isProfitable ? "+" : ""}{inr(data.realizedPnl)}
            </p>
            <span className="text-[10px] text-muted-foreground">{pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(2)}%</span>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
            <span className="text-[10px] uppercase text-muted-foreground">Discipline Index</span>
            <p className="num mt-0.5 text-sm font-black text-primary">{data.disciplineScore} / 100</p>
            <span className={`text-[10px] font-semibold ${data.disciplineDelta >= 0 ? "text-gain" : "text-loss"}`}>
              {data.disciplineDelta >= 0 ? `+${data.disciplineDelta}` : `${data.disciplineDelta}`} pts
            </span>
          </div>
        </div>

        {/* Psychological Pattern Badges */}
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Psychological Tags Detected</p>
          <div className="flex flex-wrap gap-2">
            {data.tags.map((tag) => {
              const isNegative = tag.includes("NoStopLoss") || tag.includes("Revenge") || tag.includes("Overleveraged");
              return (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isNegative
                      ? "border border-rose-500/30 bg-rose-500/10 text-rose-400"
                      : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  }`}
                >
                  {isNegative ? <AlertTriangle className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                  {tag}
                </span>
              );
            })}
          </div>
        </div>

        {/* Mandatory Cool-Down Breathing Mode Alert if discipline drops < 70 */}
        {data.isCoolDownTriggered && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <HeartPulse className="h-4 w-4 animate-pulse" />
              Cool-Down Breathing Mode Activated (Discipline &lt; 70)
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
              Your discipline score dropped to {data.disciplineScore}/100. Terminal execution is temporarily paused for 3 minutes to prevent dopamine-fueled revenge trading. Take 5 deep breaths before placing your next order.
            </p>
          </div>
        )}

        {/* Trader Journal & Self-Reflection */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-muted-foreground uppercase">
            Trader Reflection / Journal Note
          </label>
          <input
            type="text"
            placeholder="e.g. Followed plan cleanly, waited for 15m breakout confirmation..."
            value={journalNote}
            onChange={(e) => setJournalNote(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Action Button */}
        <div className="mt-5 flex justify-end">
          <Button onClick={onClose} className="font-bold text-xs">
            Save Journal & Continue Trading →
          </Button>
        </div>
      </div>
    </div>
  );
}

