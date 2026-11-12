import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  createInitialDeck,
  getDueCards,
  reviewCard,
} from "@/lib/spaced-repetition";
import {
  calculateCalmarRatio,
  calculateRiskAdjustedScore,
  getSeedArenaEntries,
  submitArenaRun,
} from "@/lib/alpha-arena";
import { SpacedRepetitionDeck } from "@/components/learn/SpacedRepetitionDeck";
import { AlphaArenaPanel } from "@/components/challenges/AlphaArenaPanel";

describe("Option 2: SM-2 Spaced Repetition & Alpha Arena Tournaments", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("progresses SM-2 intervals accurately (1d -> 3d -> 7d -> 21d) and resets on failure", () => {
    const now = 1_700_000_000_000;
    const deck = createInitialDeck(now);
    const card = deck[0]!;

    // Good (4) progression: 1d -> 3d -> 7d
    const r1 = reviewCard(card, 4, now);
    expect(r1.interval).toBe(1);
    expect(r1.repetitions).toBe(1);

    const r2 = reviewCard(r1, 4, now);
    expect(r2.interval).toBe(3);
    expect(r2.repetitions).toBe(2);

    const r3 = reviewCard(r2, 4, now);
    expect(r3.interval).toBe(7);
    expect(r3.repetitions).toBe(3);

    // Easy (5) advances to 21d+
    const r4 = reviewCard(r3, 5, now);
    expect(r4.interval).toBeGreaterThanOrEqual(21);

    // Again (1) resets repetitions back to 0 and interval to 1d
    const failed = reviewCard(r4, 1, now);
    expect(failed.repetitions).toBe(0);
    expect(failed.interval).toBe(1);
  });

  it("identifies due cards accurately", () => {
    const now = 1_700_000_000_000;
    const deck = createInitialDeck(now);
    const due = getDueCards(deck, now);
    expect(due.length).toBeGreaterThan(0);
  });

  it("renders SpacedRepetitionDeck, reveals answer, and grades recall", () => {
    render(<SpacedRepetitionDeck />);
    expect(screen.getByText(/SM-2 Spaced Repetition Drill/i)).toBeInTheDocument();

    const revealBtn = screen.getByText(/Reveal Answer & Grade Recall/i);
    fireEvent.click(revealBtn);

    expect(screen.getByText(/Institutional Answer/i)).toBeInTheDocument();
    const goodBtn = screen.getByText("Good");
    fireEvent.click(goodBtn);

    expect(screen.getByText(/Reviewed:/i)).toBeInTheDocument();
  });

  it("ranks disciplined low-drawdown traders above reckless high-drawdown gamblers via Calmar & Risk-Adjusted Score", () => {
    const disciplinedCalmar = calculateCalmarRatio(6.4, 1.1);
    const recklessCalmar = calculateCalmarRatio(44.8, 38.5);
    expect(disciplinedCalmar).toBeGreaterThan(recklessCalmar);

    const disciplinedScore = calculateRiskAdjustedScore(6.4, 1.1, 2.85, 0);
    const recklessScore = calculateRiskAdjustedScore(44.8, 38.5, 0.72, 6);
    expect(disciplinedScore).toBeGreaterThan(recklessScore);

    const seeded = getSeedArenaEntries();
    expect(seeded[0]!.rule43Violations).toBe(0);
    expect(seeded[seeded.length - 1]!.traderName).toContain("YOLO");
  });

  it("renders AlphaArenaPanel and updates leaderboard on disciplined run submission", () => {
    const updated = submitArenaRun({
      weeklyReturnPct: 9.0,
      maxDrawdownPct: 1.0,
      sharpeRatio: 3.1,
      rule43Violations: 0,
      tradesCount: 15,
    });
    expect(updated[0]!.isCurrentUser).toBe(true);

    render(<AlphaArenaPanel traderTier="Macro Hedge Fund PM" />);
    expect(screen.getByText(/Risk-Adjusted Institutional Paper Tournament/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Calmar Ratio/i).length).toBeGreaterThan(0);
  });
});
