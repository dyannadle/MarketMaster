import { useState, useEffect } from "react";
import { Brain, RotateCcw, Sparkles, CheckCircle2, Clock, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Flashcard,
  ReviewQuality,
  getDueCards,
  loadSm2Deck,
  resetSm2Deck,
  reviewCard,
  saveSm2Deck,
} from "@/lib/spaced-repetition";

export function SpacedRepetitionDeck() {
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionReviews, setSessionReviews] = useState(0);

  useEffect(() => {
    setDeck(loadSm2Deck());
  }, []);

  const dueCards = getDueCards(deck);
  const activeCard = dueCards[0] ?? null;
  const masteredCount = deck.filter((c) => c.interval >= 7).length;

  const handleGrade = (quality: ReviewQuality) => {
    if (!activeCard) return;
    const updatedCard = reviewCard(activeCard, quality);
    const nextDeck = deck.map((c) => (c.id === updatedCard.id ? updatedCard : c));
    setDeck(nextDeck);
    saveSm2Deck(nextDeck);
    setIsFlipped(false);
    setSessionReviews((prev) => prev + 1);
  };

  const handleReset = () => {
    const fresh = resetSm2Deck();
    setDeck(fresh);
    setIsFlipped(false);
    setSessionReviews(0);
  };

  return (
    <div className="rounded-2xl border border-primary/25 bg-card p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight">SM-2 Spaced Repetition Drill</h3>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
                {dueCards.length} Due Today
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Adaptive recall intervals (1d → 3d → 7d → 21d) across Levels 0–5
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-secondary/40 px-2.5 py-1 text-muted-foreground">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            <span>
              Mastered: <strong className="text-foreground">{masteredCount}/{deck.length}</strong>
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-secondary/40 px-2.5 py-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>
              Reviewed: <strong className="text-foreground">{sessionReviews}</strong>
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset} className="h-8 gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Reset Queue
          </Button>
        </div>
      </div>

      {/* Active Card or Completed State */}
      {activeCard ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-secondary/20 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="rounded bg-primary/15 px-2 py-0.5 font-mono font-bold text-primary">
                LEVEL {activeCard.level} · {activeCard.levelName}
              </span>
              <span className="font-mono text-muted-foreground">
                Topic: <strong className="text-foreground">{activeCard.topic}</strong> · EF {activeCard.easeFactor.toFixed(2)}
              </span>
            </div>

            <p className="mt-4 text-base font-semibold leading-relaxed text-foreground">
              {activeCard.question}
            </p>

            {isFlipped ? (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <Sparkles className="h-3.5 w-3.5" /> Institutional Answer
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{activeCard.answer}</p>
                {activeCard.formula && (
                  <p className="rounded-md bg-background/80 px-3 py-1.5 font-mono text-xs text-primary border border-border/40">
                    {activeCard.formula}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-5 flex justify-center">
                <Button onClick={() => setIsFlipped(true)} className="font-bold text-xs px-6">
                  Reveal Answer & Grade Recall
                </Button>
              </div>
            )}
          </div>

          {/* SM-2 Quality Grading Buttons */}
          {isFlipped && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => handleGrade(1)}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-center transition hover:bg-rose-500/20"
              >
                <p className="text-xs font-bold text-rose-400">Again</p>
                <p className="text-[10px] text-muted-foreground">Reset · 1d</p>
              </button>
              <button
                type="button"
                onClick={() => handleGrade(3)}
                className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-center transition hover:bg-amber-500/20"
              >
                <p className="text-xs font-bold text-amber-400">Hard</p>
                <p className="text-[10px] text-muted-foreground">Interval · 3d</p>
              </button>
              <button
                type="button"
                onClick={() => handleGrade(4)}
                className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-2.5 text-center transition hover:bg-sky-500/20"
              >
                <p className="text-xs font-bold text-sky-400">Good</p>
                <p className="text-[10px] text-muted-foreground">Optimal · 7d</p>
              </button>
              <button
                type="button"
                onClick={() => handleGrade(5)}
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-center transition hover:bg-emerald-500/20"
              >
                <p className="text-xs font-bold text-emerald-400">Easy</p>
                <p className="text-[10px] text-muted-foreground">Mastered · 21d+</p>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-2">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          <p className="text-sm font-bold text-foreground">All Due Flashcards Reviewed!</p>
          <p className="text-xs text-muted-foreground max-w-md">
            Your SM-2 memory decay schedule is up to date. Weak concepts will automatically resurface at 1d, 3d, 7d, and 21d intervals.
          </p>
          <Button variant="outline" size="sm" onClick={handleReset} className="mt-2 text-xs">
            Practice Full Deck Again
          </Button>
        </div>
      )}
    </div>
  );
}
