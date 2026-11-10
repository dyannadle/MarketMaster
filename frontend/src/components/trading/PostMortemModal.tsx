import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  X,
  HeartPulse,
  Brain,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { inr } from "@/lib/data";
import { nativeBridge } from "@/lib/native";
import { BehavioralTag, saveJournalTrade, JournalTrade } from "@/lib/journal";

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
  onSave?: (savedTrade: JournalTrade) => void;
}

const AVAILABLE_TAGS: { tag: BehavioralTag; label: string; desc: string; type: "positive" | "negative" }[] = [
  { tag: "#PlanAdhered", label: "Plan Adhered", desc: "Executed setup strictly as planned", type: "positive" },
  { tag: "#RevengeTrade", label: "Revenge Trade", desc: "Impulsive order after a loss", type: "negative" },
  { tag: "#MovedStopLoss", label: "Moved Stop-Loss", desc: "Widened/cancelled stop against plan", type: "negative" },
  { tag: "#FOMOEntry", label: "FOMO Entry", desc: "Chased extended candle without retest", type: "negative" },
  { tag: "#CutWinnerEarly", label: "Cut Winner Early", desc: "Exited green trade out of fear", type: "negative" },
];

export function PostMortemModal({ isOpen, onClose, data, onSave }: PostMortemModalProps) {
  const [journalNote, setJournalNote] = useState("");
  const [selectedTags, setSelectedTags] = useState<BehavioralTag[]>([]);
  const [breathingPhase, setBreathingPhase] = useState<"INHALE" | "HOLD" | "EXHALE" | "REST">("INHALE");
  const [breathingTimer, setBreathingTimer] = useState(4);

  // Initialize tags based on automated telemetry
  useEffect(() => {
    if (!data) return;
    const initialTags: BehavioralTag[] = [];

    if (data.realizedPnl >= 0) {
      initialTags.push("#PlanAdhered");
    } else {
      if (!data.stopLossUsed) {
        initialTags.push("#MovedStopLoss");
      }
      if (data.isCoolDownTriggered) {
        initialTags.push("#RevengeTrade");
      } else if (data.stopLossUsed) {
        initialTags.push("#PlanAdhered");
      }
    }

    // Include existing tags if present
    data.tags?.forEach((t) => {
      if (AVAILABLE_TAGS.some((at) => at.tag === t) && !initialTags.includes(t as BehavioralTag)) {
        initialTags.push(t as BehavioralTag);
      }
    });

    setSelectedTags(initialTags);
  }, [data]);

  // Breathing Box animation timer for Cool-Down
  useEffect(() => {
    if (!isOpen || !data?.isCoolDownTriggered) return;

    nativeBridge.vibrateBreathingPulse();

    const interval = setInterval(() => {
      setBreathingTimer((prev) => {
        if (prev <= 1) {
          setBreathingPhase((phase) => {
            switch (phase) {
              case "INHALE":
                return "HOLD";
              case "HOLD":
                return "EXHALE";
              case "EXHALE":
                return "REST";
              case "REST":
                return "INHALE";
            }
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, data?.isCoolDownTriggered]);

  if (!isOpen || !data) return null;

  const isProfitable = data.realizedPnl >= 0;
  const pnlPct =
    ((data.exitPrice - data.entryPrice) / (data.entryPrice || 1)) *
    (data.side === "SHORT" || data.side === "SELL" ? -100 : 100);

  const toggleTag = (tag: BehavioralTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSaveAndClose = () => {
    const journalEntry: JournalTrade = {
      id: "jt-" + Date.now(),
      timestamp: Date.now(),
      symbol: data.symbol,
      side: data.side,
      quantity: data.quantity,
      entryPrice: data.entryPrice,
      exitPrice: data.exitPrice,
      realizedPnl: data.realizedPnl,
      tags: selectedTags,
      notes: journalNote.trim(),
      stopLossUsed: data.stopLossUsed,
      targetUsed: data.targetUsed,
      isStopLossHit: !isProfitable && data.stopLossUsed,
      disciplineScore: data.disciplineScore,
    };

    saveJournalTrade(journalEntry);
    if (onSave) {
      onSave(journalEntry);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={handleSaveAndClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close Modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/40 pb-4">
          <div
            className={`grid size-10 place-items-center rounded-xl ${
              isProfitable ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
            }`}
          >
            {isProfitable ? <Award className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">Institutional Trade Post-Mortem</h2>
              <span className="rounded bg-secondary/80 px-2 py-0.5 text-[10px] font-mono font-semibold uppercase text-muted-foreground">
                Psychology Audit
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Automated behavioral diagnostics & cognitive discipline tracking
            </p>
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

          <div
            className={`rounded-xl border p-3 text-center ${
              isProfitable ? "border-emerald-500/20 bg-emerald-500/5" : "border-rose-500/20 bg-rose-500/5"
            }`}
          >
            <span className="text-[10px] uppercase text-muted-foreground">Realized P&L</span>
            <p className={`num mt-0.5 text-sm font-black ${isProfitable ? "text-gain" : "text-loss"}`}>
              {isProfitable ? "+" : ""}
              {inr(data.realizedPnl)}
            </p>
            <span className="text-[10px] text-muted-foreground">
              {pnlPct >= 0 ? "+" : ""}
              {pnlPct.toFixed(2)}%
            </span>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-center">
            <span className="text-[10px] uppercase text-muted-foreground">Discipline Index</span>
            <p className="num mt-0.5 text-sm font-black text-primary">{data.disciplineScore} / 100</p>
            <span
              className={`text-[10px] font-semibold ${
                data.disciplineDelta >= 0 ? "text-gain" : "text-loss"
              }`}
            >
              {data.disciplineDelta >= 0 ? `+${data.disciplineDelta}` : `${data.disciplineDelta}`} pts
            </span>
          </div>
        </div>

        {/* Guided Box Breathing Module (If Cool-Down Triggered) */}
        {data.isCoolDownTriggered && (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-center">
            <div className="flex items-center justify-center gap-2 font-bold text-amber-400">
              <HeartPulse className="h-5 w-5 animate-pulse" />
              Psychological Cool-Down: Guided Breathing Reset
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Revenge trade detected. Terminal locked for 3 minutes to restore cognitive equilibrium.
            </p>

            <div className="my-4 flex flex-col items-center justify-center">
              <div
                className={`relative flex size-24 items-center justify-center rounded-full border-4 transition-all duration-1000 ${
                  breathingPhase === "INHALE"
                    ? "scale-110 border-primary bg-primary/20 text-primary shadow-lg shadow-primary/30"
                    : breathingPhase === "EXHALE"
                    ? "scale-90 border-amber-500 bg-amber-500/10 text-amber-400"
                    : "scale-100 border-muted-foreground bg-secondary/40 text-foreground"
                }`}
              >
                <div className="text-center">
                  <p className="text-xs font-bold uppercase tracking-wider">{breathingPhase}</p>
                  <p className="num text-xl font-black">{breathingTimer}s</p>
                </div>
              </div>
              <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                {breathingPhase === "INHALE" && "Breathe in deeply through your nose..."}
                {breathingPhase === "HOLD" && "Hold breath calmly. Disconnect from P&L."}
                {breathingPhase === "EXHALE" && "Slowly exhale out tension through mouth..."}
                {breathingPhase === "REST" && "Rest and reset before next inhalation."}
              </p>
            </div>
          </div>
        )}

        {/* Psychological Pattern Selection */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tag Execution Psychology (Multi-select)
            </label>
            <span className="text-[11px] text-muted-foreground">Click to toggle tags</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {AVAILABLE_TAGS.map((item) => {
              const isSelected = selectedTags.includes(item.tag);
              const isPositive = item.type === "positive";

              return (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => toggleTag(item.tag)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? isPositive
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500"
                        : "border-rose-500 bg-rose-500/20 text-rose-400 ring-1 ring-rose-500"
                      : "border-border/60 bg-secondary/30 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                  }`}
                >
                  {isPositive ? (
                    <Sparkles className="h-3.5 w-3.5" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )}
                  <span>{item.tag}</span>
                  {isSelected && <CheckCircle2 className="h-3 w-3 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Trader Journal & Self-Reflection */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-muted-foreground uppercase">
              Trader Reflection / Post-Mortem Note
            </label>
            <span className="text-[10px] text-muted-foreground">Optional, saved to journal</span>
          </div>
          <textarea
            rows={2}
            placeholder="What was the emotional state during this trade? Did you adhere strictly to Rule 4.3 (R <= 1.5%)?"
            value={journalNote}
            onChange={(e) => setJournalNote(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>

        {/* Action Button */}
        <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-4">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Brain className="h-4 w-4 text-primary" />
            <span>Logged to Institutional Psychology Journal</span>
          </div>
          <Button onClick={handleSaveAndClose} className="font-bold text-xs">
            Save Journal & Continue →
          </Button>
        </div>
      </div>
    </div>
  );
}
