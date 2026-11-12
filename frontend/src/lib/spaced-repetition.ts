/**
 * SuperMemo-2 (SM-2) Spaced Repetition Engine for MarketMaster Academy
 * Resurfaces concepts across Levels 0–5 at optimal retention intervals (1d -> 3d -> 7d -> 21d+).
 */

export interface Flashcard {
  id: string;
  level: number;
  levelName: string;
  topic: string;
  question: string;
  answer: string;
  formula?: string;
  easeFactor: number; // default 2.5, min 1.3
  interval: number; // days
  repetitions: number;
  nextReviewDate: number; // epoch ms
  lastReviewedAt?: number;
}

export type ReviewQuality = 1 | 3 | 4 | 5; // 1=Again (1d), 3=Hard (3d), 4=Good (7d), 5=Easy (21d)

const SM2_STORAGE_KEY = "mm-sm2-deck";
const DAY_MS = 24 * 60 * 60 * 1000;

export const INITIAL_FLASHCARDS: Omit<
  Flashcard,
  "easeFactor" | "interval" | "repetitions" | "nextReviewDate"
>[] = [
  {
    id: "sm2-l0-compounding",
    level: 0,
    levelName: "Foundations",
    topic: "Real vs Nominal Return",
    question: "If a portfolio earns 12% nominal CAGR while inflation averages 6%, what is the approximate real rate of return?",
    answer:
      "Using the Fisher equation (1 + r_real) = (1 + r_nom) / (1 + i), the exact real return is (1.12 / 1.06) - 1 = 5.66% (approximated as 12% - 6% = 6%).",
    formula: "r_real = (1 + r_nominal) / (1 + inflation) - 1",
  },
  {
    id: "sm2-l1-slippage",
    level: 1,
    levelName: "Market Microstructure",
    topic: "Impact Cost & Slippage",
    question: "Why does a large Market Order experience non-linear slippage compared to a Limit Order?",
    answer:
      "A Market Order walks up/down the Level-2 order book consuming resting liquidity across multiple price ticks, whereas a Limit Order rests in the FIFO queue at a fixed maximum/minimum price.",
    formula: "Slippage ~ k * (OrderQty / TopOfBookDepth)^1.35",
  },
  {
    id: "sm2-l2-wyckoff",
    level: 2,
    levelName: "Price Action & Tape",
    topic: "Wyckoff Accumulation Spring",
    question: "What characterizes a Wyckoff 'Spring' (Shakeout) at the end of an Accumulation range?",
    answer:
      "Price briefly breaks below range support to trigger retail stop-losses and absorb remaining supply, then snaps back inside the range on strong volume—signaling institutional markup.",
  },
  {
    id: "sm2-l3-greeks-theta",
    level: 3,
    levelName: "Options & Derivatives",
    topic: "Option Greeks & IV Crush",
    question: "Why can an OTM Call buyer lose money after a major event (e.g., Election Day / Earnings) even if the underlying spot rallies?",
    answer:
      "Implied Volatility (IV) collapses immediately after event uncertainty resolves ('IV Crush'). Negative Vega + Theta decay losses can exceed positive Delta gains.",
    formula: "dOption ~ Delta*dS + 0.5*Gamma*dS^2 + Vega*dIV + Theta*dt",
  },
  {
    id: "sm2-l3-iron-condor",
    level: 3,
    levelName: "Options & Derivatives",
    topic: "Margin Relief on Hedged Wings",
    question: "How does buying protective OTM wings transform a Short Straddle/Strangle into an Iron Condor?",
    answer:
      "Buying outer OTM Call and Put wings caps tail risk, turning unlimited risk into defined max loss and reducing NSE SPAN + Exposure margin by ~65–70%.",
  },
  {
    id: "sm2-l4-rule43",
    level: 4,
    levelName: "Risk & Psychology",
    topic: "Rule 4.3 Position Sizing",
    question: "Under Rule 4.3 (R <= 1.5%), on a ₹10,00,000 account with a ₹50 stop-loss distance on Nifty Futures, what is the maximum allowed position size?",
    answer:
      "Max risk capital = 1.5% of ₹10,00,000 = ₹15,000. Max Qty = ₹15,000 / ₹50 = 300 qty (6 lots of 50). Exceeding this violates capital preservation invariants.",
    formula: "MaxQty = (Equity * 0.015) / |Entry - StopLoss|",
  },
  {
    id: "sm2-l4-revenge",
    level: 4,
    levelName: "Risk & Psychology",
    topic: "Revenge Trading Cool-Down",
    question: "What triggers the MarketMaster Psychological Cool-Down Protocol?",
    answer:
      "Placing >= 2 losing market orders within 45 seconds of a stop-out locks the terminal for 3 minutes of guided Box Breathing to prevent emotional escalation.",
  },
  {
    id: "sm2-l5-calmar",
    level: 5,
    levelName: "Quant & Execution",
    topic: "Calmar Ratio vs Raw P&L",
    question: "Why do institutional funds and Alpha Arena rank strategies on Calmar Ratio instead of raw P&L?",
    answer:
      "Calmar Ratio divides annualized return by Maximum Drawdown. It penalizes reckless leverage and rewards smooth, capital-preserving compounding.",
    formula: "Calmar = Annualized Return (%) / Max Drawdown (%)",
  },
  {
    id: "sm2-l5-vwap",
    level: 5,
    levelName: "Quant & Execution",
    topic: "VWAP U-Curve Execution",
    question: "How does an institutional VWAP execution engine pace a 5,000-lot parent order across the NSE session?",
    answer:
      "It follows the intraday U-shaped liquidity curve—slicing heavier clips during high-volume Market Open (09:15–10:00) and Close (14:45–15:30) and lighter clips at midday.",
  },
];

export function createInitialDeck(now: number = Date.now()): Flashcard[] {
  return INITIAL_FLASHCARDS.map((c, idx) => ({
    ...c,
    easeFactor: 2.5,
    interval: idx === 0 ? 1 : 0,
    repetitions: 0,
    // First 5 cards due immediately so user always has an active review session
    nextReviewDate: idx < 5 ? now - 1000 : now + (idx - 4) * DAY_MS,
  }));
}

export function loadSm2Deck(now: number = Date.now()): Flashcard[] {
  if (typeof window === "undefined") return createInitialDeck(now);
  try {
    const raw = localStorage.getItem(SM2_STORAGE_KEY);
    if (!raw) {
      const deck = createInitialDeck(now);
      localStorage.setItem(SM2_STORAGE_KEY, JSON.stringify(deck));
      return deck;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : createInitialDeck(now);
  } catch {
    return createInitialDeck(now);
  }
}

export function saveSm2Deck(deck: Flashcard[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SM2_STORAGE_KEY, JSON.stringify(deck));
  } catch {}
}

export function resetSm2Deck(now: number = Date.now()): Flashcard[] {
  const deck = createInitialDeck(now);
  saveSm2Deck(deck);
  return deck;
}

/**
 * Pure SuperMemo-2 (SM-2) update calculation.
 * Maps user recall quality to optimal retention intervals (1d -> 3d -> 7d -> 21d+).
 */
export function reviewCard(
  card: Flashcard,
  quality: ReviewQuality,
  now: number = Date.now()
): Flashcard {
  let { easeFactor, interval, repetitions } = card;

  // Update ease factor using canonical SM-2 formula
  const qDiff = 5 - quality;
  easeFactor = Math.max(1.3, easeFactor + (0.1 - qDiff * (0.08 + qDiff * 0.02)));

  if (quality < 3) {
    // Failed recall: reset repetitions and schedule for tomorrow (1 day)
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (quality === 3) {
      // Hard: 3-day step or conservative scaling
      interval = repetitions === 1 ? 3 : Math.max(3, Math.round(interval * 1.2));
    } else if (quality === 4) {
      // Good: 1d -> 3d -> 7d -> interval * EF
      if (repetitions === 1) interval = 1;
      else if (repetitions === 2) interval = 3;
      else if (repetitions === 3) interval = 7;
      else interval = Math.round(interval * easeFactor);
    } else {
      // Easy (5): fast-track up to 21d
      if (repetitions === 1) interval = 7;
      else if (repetitions === 2) interval = 21;
      else interval = Math.max(21, Math.round(interval * easeFactor * 1.3));
    }
  }

  return {
    ...card,
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions,
    lastReviewedAt: now,
    nextReviewDate: now + interval * DAY_MS,
  };
}

export function getDueCards(deck: Flashcard[], now: number = Date.now()): Flashcard[] {
  return deck.filter((c) => c.nextReviewDate <= now);
}
