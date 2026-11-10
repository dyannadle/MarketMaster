/**
 * Behavioral Trade Journal & Cool-Down Engine (Trader Psychology)
 * Tracks execution psychology, emotional errors, and calculates behavioral P&L leakage.
 * Invariant: Rule 4.3 Risk Enforcement & Mandatory Cool-Down Protocol.
 */

export type BehavioralTag =
  | "#PlanAdhered"
  | "#RevengeTrade"
  | "#MovedStopLoss"
  | "#FOMOEntry"
  | "#CutWinnerEarly";

export interface JournalTrade {
  id: string;
  timestamp: number;
  symbol: string;
  side: "BUY" | "SELL" | "LONG" | "SHORT";
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  realizedPnl: number;
  tags: BehavioralTag[];
  notes: string;
  stopLossUsed: boolean;
  targetUsed: boolean;
  isStopLossHit?: boolean;
  disciplineScore: number;
}

export interface MistakeMetric {
  tag: BehavioralTag;
  label: string;
  description: string;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  winRatePct: number;
  totalPnl: number;
  avgPnl: number;
  shareOfMistakeLossPct: number;
  severity: "critical" | "warning" | "neutral" | "positive";
}

export interface BehavioralHeatmapReport {
  totalTrades: number;
  netPnl: number;
  disciplinedTradesCount: number;
  disciplinedPnl: number;
  disciplinedWinRatePct: number;
  emotionalTradesCount: number;
  emotionalPnl: number;
  emotionalWinRatePct: number;
  emotionalLossTax: number; // Rupee leakage purely from emotional trades
  disciplineScoreAverage: number;
  tagMetrics: MistakeMetric[];
  topBehavioralLeak: string | null;
  coachingRecommendation: string;
}

const JOURNAL_STORAGE_KEY = "mm-trade-journal";
const LAST_LOSS_KEY = "mm-last-loss-timestamp";
const COOL_DOWN_UNTIL_KEY = "mm-cool-down-until";

/** Seed initial realistic demo journal entries if empty */
export const SEED_JOURNAL_TRADES: JournalTrade[] = [
  {
    id: "jt-001",
    timestamp: Date.now() - 3600000 * 28,
    symbol: "NIFTY_FUT",
    side: "BUY",
    quantity: 150,
    entryPrice: 24420,
    exitPrice: 24580,
    realizedPnl: 24000,
    tags: ["#PlanAdhered"],
    notes: "Waited for 15-minute pullback to 21 EMA. Clean R:R 1:2 hit.",
    stopLossUsed: true,
    targetUsed: true,
    isStopLossHit: false,
    disciplineScore: 95,
  },
  {
    id: "jt-002",
    timestamp: Date.now() - 3600000 * 24,
    symbol: "BANKNIFTY_FUT",
    side: "SELL",
    quantity: 60,
    entryPrice: 52100,
    exitPrice: 52320,
    realizedPnl: -13200,
    tags: ["#PlanAdhered"],
    notes: "Stop-loss triggered cleanly at resistance invalidation. Accepted loss calmly.",
    stopLossUsed: true,
    targetUsed: true,
    isStopLossHit: true,
    disciplineScore: 92,
  },
  {
    id: "jt-003",
    timestamp: Date.now() - 3600000 * 23.95, // 3 minutes after jt-002 loss
    symbol: "BANKNIFTY_FUT",
    side: "BUY",
    quantity: 90,
    entryPrice: 52330,
    exitPrice: 52180,
    realizedPnl: -13500,
    tags: ["#RevengeTrade", "#FOMOEntry"],
    notes: "Felt frustration after stop-out. Doubled lot size and bought market top without setup.",
    stopLossUsed: false,
    targetUsed: false,
    isStopLossHit: false,
    disciplineScore: 65,
  },
  {
    id: "jt-004",
    timestamp: Date.now() - 3600000 * 18,
    symbol: "RELIANCE",
    side: "BUY",
    quantity: 200,
    entryPrice: 2980,
    exitPrice: 2950,
    realizedPnl: -6000,
    tags: ["#MovedStopLoss"],
    notes: "Price neared initial ₹2965 stop. Dragged stop lower hoping for bounce.",
    stopLossUsed: true,
    targetUsed: true,
    isStopLossHit: false,
    disciplineScore: 68,
  },
  {
    id: "jt-005",
    timestamp: Date.now() - 3600000 * 12,
    symbol: "TCS",
    side: "BUY",
    quantity: 100,
    entryPrice: 4120,
    exitPrice: 4145,
    realizedPnl: 2500,
    tags: ["#CutWinnerEarly"],
    notes: "Target was ₹4220 (+100 pts). Exited after +25 pts out of fear of giving back profit.",
    stopLossUsed: true,
    targetUsed: true,
    isStopLossHit: false,
    disciplineScore: 78,
  },
  {
    id: "jt-006",
    timestamp: Date.now() - 3600000 * 6,
    symbol: "NIFTY_FUT",
    side: "BUY",
    quantity: 150,
    entryPrice: 24500,
    exitPrice: 24650,
    realizedPnl: 22500,
    tags: ["#PlanAdhered"],
    notes: "Standard VWAP bounce setup. Trailed stop loss according to institutional plan.",
    stopLossUsed: true,
    targetUsed: true,
    isStopLossHit: false,
    disciplineScore: 96,
  },
];

/** Retrieve all journaled trades */
export function getJournalTrades(): JournalTrade[] {
  if (typeof window === "undefined") return SEED_JOURNAL_TRADES;
  try {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(SEED_JOURNAL_TRADES));
      return SEED_JOURNAL_TRADES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_JOURNAL_TRADES;
  } catch {
    return SEED_JOURNAL_TRADES;
  }
}

/** Save a trade into the journal */
export function saveJournalTrade(trade: JournalTrade): JournalTrade[] {
  const current = getJournalTrades();
  const updated = [trade, ...current.filter((t) => t.id !== trade.id)];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }
  return updated;
}

/** Reset or clear journal */
export function resetJournal(): JournalTrade[] {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(SEED_JOURNAL_TRADES));
    } catch {}
  }
  return SEED_JOURNAL_TRADES;
}

/**
 * Psychological Cool-Down Protocol:
 * If revenge trading is detected (>= 2 losing market orders placed within 45 seconds of a stop-out or loss),
 * locks order execution for a mandatory 3-minute (180s) guided breathing and discipline reset.
 */
export interface RevengeCheckResult {
  isTriggered: boolean;
  remainingSeconds: number;
  reason?: string;
}

export function recordLossEvent(timestamp: number = Date.now()) {
  if (typeof window === "undefined") return;
  try {
    const recentLossesRaw = localStorage.getItem(LAST_LOSS_KEY);
    const recentLosses: number[] = recentLossesRaw ? JSON.parse(recentLossesRaw) : [];
    // Keep only losses within the last 5 minutes
    const validLosses = [...recentLosses.filter((t) => timestamp - t < 300000), timestamp];
    localStorage.setItem(LAST_LOSS_KEY, JSON.stringify(validLosses));
  } catch {}
}

export function checkCoolDownStatus(): RevengeCheckResult {
  if (typeof window === "undefined") return { isTriggered: false, remainingSeconds: 0 };
  try {
    const lockUntilRaw = localStorage.getItem(COOL_DOWN_UNTIL_KEY);
    if (lockUntilRaw) {
      const lockUntil = Number(lockUntilRaw);
      const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
      if (remaining > 0) {
        return {
          isTriggered: true,
          remainingSeconds: remaining,
          reason: "Mandatory 3-minute cool-down active. Order ticket locked to prevent emotional escalation.",
        };
      } else {
        localStorage.removeItem(COOL_DOWN_UNTIL_KEY);
      }
    }
  } catch {}
  return { isTriggered: false, remainingSeconds: 0 };
}

export function triggerCoolDown(durationSeconds: number = 180): number {
  if (typeof window === "undefined") return durationSeconds;
  try {
    const lockUntil = Date.now() + durationSeconds * 1000;
    localStorage.setItem(COOL_DOWN_UNTIL_KEY, lockUntil.toString());
  } catch {}
  return durationSeconds;
}

export function cancelCoolDown() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(COOL_DOWN_UNTIL_KEY);
  } catch {}
}

/**
 * Detects if a new order or closed trade violates the 45-second revenge trading invariant:
 * If >= 2 losing market trades/orders are placed within 45 seconds of a stop-out or loss.
 */
export function detectRevengeTrading(
  recentLossPnl: number,
  orderType: string = "MARKET"
): { isRevenge: boolean; coolDownSeconds: number } {
  if (recentLossPnl >= 0) return { isRevenge: false, coolDownSeconds: 0 };

  const now = Date.now();
  recordLossEvent(now);

  if (typeof window === "undefined") return { isRevenge: false, coolDownSeconds: 0 };

  try {
    const recentLossesRaw = localStorage.getItem(LAST_LOSS_KEY);
    const recentLosses: number[] = recentLossesRaw ? JSON.parse(recentLossesRaw) : [];

    // Filter losses within the last 45 seconds
    const rapidLosses = recentLosses.filter((t) => now - t <= 45000);

    if (rapidLosses.length >= 2 && orderType === "MARKET") {
      // Trigger mandatory 3-minute lock
      triggerCoolDown(180);
      return { isRevenge: true, coolDownSeconds: 180 };
    }
  } catch {}

  return { isRevenge: false, coolDownSeconds: 0 };
}

/**
 * Calculate Behavioral Mistake Heatmap Report & Emotional Leakage
 */
export function calculateBehavioralMistakes(trades: JournalTrade[]): BehavioralHeatmapReport {
  if (!trades || trades.length === 0) {
    trades = SEED_JOURNAL_TRADES;
  }

  const totalTrades = trades.length;
  const netPnl = trades.reduce((sum, t) => sum + t.realizedPnl, 0);

  // Disciplined trades are those tagged #PlanAdhered and without any emotional tags
  const emotionalTagList: BehavioralTag[] = [
    "#RevengeTrade",
    "#MovedStopLoss",
    "#FOMOEntry",
    "#CutWinnerEarly",
  ];

  const disciplinedTrades = trades.filter(
    (t) => t.tags.includes("#PlanAdhered") && !t.tags.some((tag) => emotionalTagList.includes(tag))
  );

  const emotionalTrades = trades.filter((t) =>
    t.tags.some((tag) => emotionalTagList.includes(tag))
  );

  const disciplinedCount = disciplinedTrades.length;
  const disciplinedPnl = disciplinedTrades.reduce((s, t) => s + t.realizedPnl, 0);
  const disciplinedWins = disciplinedTrades.filter((t) => t.realizedPnl > 0).length;
  const disciplinedWinRatePct = disciplinedCount > 0 ? (disciplinedWins / disciplinedCount) * 100 : 0;

  const emotionalCount = emotionalTrades.length;
  const emotionalPnl = emotionalTrades.reduce((s, t) => s + t.realizedPnl, 0);
  const emotionalWins = emotionalTrades.filter((t) => t.realizedPnl > 0).length;
  const emotionalWinRatePct = emotionalCount > 0 ? (emotionalWins / emotionalCount) * 100 : 0;

  // Emotional Loss Tax: Sum of negative PnL incurred specifically during emotional trades
  const emotionalLossTax = Math.abs(
    emotionalTrades
      .filter((t) => t.realizedPnl < 0)
      .reduce((s, t) => s + t.realizedPnl, 0)
  );

  const disciplineScoreSum = trades.reduce((s, t) => s + t.disciplineScore, 0);
  const disciplineScoreAverage = totalTrades > 0 ? Math.round(disciplineScoreSum / totalTrades) : 85;

  // Per-tag breakdown
  const tagDefinitions: { tag: BehavioralTag; label: string; description: string; severity: MistakeMetric["severity"] }[] = [
    {
      tag: "#RevengeTrade",
      label: "Revenge Trading",
      description: "Impulsive entries placed within minutes of a loss to recoup capital.",
      severity: "critical",
    },
    {
      tag: "#MovedStopLoss",
      label: "Moved Stop-Loss",
      description: "Dragging stop-loss further away to avoid realizing an open loss.",
      severity: "critical",
    },
    {
      tag: "#FOMOEntry",
      label: "FOMO / Chased Entry",
      description: "Chasing breakout candles without waiting for retest or confirmation.",
      severity: "warning",
    },
    {
      tag: "#CutWinnerEarly",
      label: "Cut Winner Early",
      description: "Exited a profitable trade out of fear before reaching pre-defined target.",
      severity: "warning",
    },
    {
      tag: "#PlanAdhered",
      label: "Plan Adhered",
      description: "Executed strictly within institutional risk and strategy parameters.",
      severity: "positive",
    },
  ];

  const totalNegativeMistakeLoss = Math.abs(
    trades
      .filter((t) => t.tags.some((tag) => emotionalTagList.includes(tag)) && t.realizedPnl < 0)
      .reduce((s, t) => s + t.realizedPnl, 0)
  ) || 1;

  const tagMetrics: MistakeMetric[] = tagDefinitions.map((def) => {
    const matched = trades.filter((t) => t.tags.includes(def.tag));
    const count = matched.length;
    const wins = matched.filter((t) => t.realizedPnl > 0).length;
    const losses = matched.filter((t) => t.realizedPnl < 0).length;
    const winRate = count > 0 ? (wins / count) * 100 : 0;
    const tagPnl = matched.reduce((s, t) => s + t.realizedPnl, 0);
    const avgPnl = count > 0 ? tagPnl / count : 0;

    const tagLoss = Math.abs(matched.filter((t) => t.realizedPnl < 0).reduce((s, t) => s + t.realizedPnl, 0));
    const shareOfMistakeLoss = (tagLoss / totalNegativeMistakeLoss) * 100;

    return {
      tag: def.tag,
      label: def.label,
      description: def.description,
      tradeCount: count,
      winCount: wins,
      lossCount: losses,
      winRatePct: Math.round(winRate * 10) / 10,
      totalPnl: Math.round(tagPnl),
      avgPnl: Math.round(avgPnl),
      shareOfMistakeLossPct: Math.round(shareOfMistakeLoss * 10) / 10,
      severity: def.severity,
    };
  });

  // Identify top behavioral leak
  const emotionalMetrics = tagMetrics.filter((m) => emotionalTagList.includes(m.tag) && m.totalPnl < 0);
  emotionalMetrics.sort((a, b) => a.totalPnl - b.totalPnl); // Most negative first

  const topLeak = emotionalMetrics.length > 0 && emotionalMetrics[0]!.totalPnl < 0
    ? `${emotionalMetrics[0]!.label} (${Math.round(emotionalMetrics[0]!.shareOfMistakeLossPct)}% of emotional losses)`
    : null;

  let coachingRecommendation = "Superb psychological composure. Maintain adherence to Rule 4.3 (R <= 1.5%).";
  if (topLeak) {
    if (topLeak.includes("Revenge")) {
      coachingRecommendation =
        "Top Priority: When a stop-loss is triggered, step away from the terminal. Never place a market order within 45 seconds of a loss.";
    } else if (topLeak.includes("Moved Stop-Loss")) {
      coachingRecommendation =
        "Hard Rule Violation: Moving stops turns controlled 1.5% risk into catastrophic drawdown. Never adjust stop-loss against your position.";
    } else if (topLeak.includes("FOMO")) {
      coachingRecommendation =
        "Wait for the retest. Entering extended candles damages your risk-to-reward ratio. Let missed moves go.";
    } else if (topLeak.includes("Cut Winner")) {
      coachingRecommendation =
        "Let winners run to target. Cutting profits early prevents favorable asymmetry from overcoming unavoidable small losses.";
    }
  }

  return {
    totalTrades,
    netPnl: Math.round(netPnl),
    disciplinedTradesCount: disciplinedCount,
    disciplinedPnl: Math.round(disciplinedPnl),
    disciplinedWinRatePct: Math.round(disciplinedWinRatePct * 10) / 10,
    emotionalTradesCount: emotionalCount,
    emotionalPnl: Math.round(emotionalPnl),
    emotionalWinRatePct: Math.round(emotionalWinRatePct * 10) / 10,
    emotionalLossTax: Math.round(emotionalLossTax),
    disciplineScoreAverage,
    tagMetrics,
    topBehavioralLeak: topLeak,
    coachingRecommendation,
  };
}
