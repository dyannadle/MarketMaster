/**
 * Weekly "Alpha Arena" Paper Tournament Engine
 * Free Mon 09:15 IST – Fri 15:30 IST competition ranked by Calmar Ratio and Risk-Adjusted Return
 * rather than raw P&L, rewarding disciplined risk managers over reckless leverage.
 */

export interface AlphaArenaEntry {
  id: string;
  traderName: string;
  tier: string;
  weeklyReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  calmarRatio: number;
  rule43Violations: number;
  riskAdjustedScore: number;
  tradesCount: number;
  isCurrentUser?: boolean;
}

const ARENA_STORAGE_KEY = "mm-alpha-arena-entries";

/**
 * Calmar Ratio = Annualized Return (%) / Max Drawdown (%)
 * Floors drawdown at 0.5% to avoid division-by-zero distortion.
 */
export function calculateCalmarRatio(weeklyReturnPct: number, maxDrawdownPct: number): number {
  const annualizedReturn = weeklyReturnPct * 52;
  const effectiveDd = Math.max(maxDrawdownPct, 0.5);
  return Math.round((annualizedReturn / effectiveDd) * 100) / 100;
}

/**
 * Composite Risk-Adjusted Score:
 * Rewards Calmar Ratio + Sharpe Ratio, penalizes Rule 4.3 violations (-15 pts each)
 * and extreme drawdowns (> 10%).
 */
export function calculateRiskAdjustedScore(
  weeklyReturnPct: number,
  maxDrawdownPct: number,
  sharpeRatio: number,
  rule43Violations: number
): number {
  const calmar = calculateCalmarRatio(weeklyReturnPct, maxDrawdownPct);
  const drawdownPenalty = maxDrawdownPct > 10 ? (maxDrawdownPct - 10) * 1.5 : 0;
  const violationPenalty = rule43Violations * 15;
  const rawScore = calmar * 2.5 + sharpeRatio * 18 - drawdownPenalty - violationPenalty;
  return Math.max(0, Math.round(rawScore * 10) / 10);
}

export function getSeedArenaEntries(): AlphaArenaEntry[] {
  const raw = [
    {
      id: "aa-1",
      traderName: "Aarav Mehta (Desk Quant)",
      tier: "Macro Hedge Fund PM",
      weeklyReturnPct: 6.4,
      maxDrawdownPct: 1.1,
      sharpeRatio: 2.85,
      rule43Violations: 0,
      tradesCount: 14,
    },
    {
      id: "aa-2",
      traderName: "Priya Nair",
      tier: "Senior Derivatives Trader",
      weeklyReturnPct: 8.2,
      maxDrawdownPct: 1.8,
      sharpeRatio: 2.41,
      rule43Violations: 0,
      tradesCount: 19,
    },
    {
      id: "aa-3",
      traderName: "You (Institutional Candidate)",
      tier: "Prop Desk Trainee",
      weeklyReturnPct: 4.9,
      maxDrawdownPct: 1.4,
      sharpeRatio: 2.12,
      rule43Violations: 0,
      tradesCount: 11,
      isCurrentUser: true,
    },
    {
      id: "aa-4",
      traderName: "Vikram Singh",
      tier: "Prop Desk Trainee",
      weeklyReturnPct: 11.5,
      maxDrawdownPct: 4.9,
      sharpeRatio: 1.65,
      rule43Violations: 1,
      tradesCount: 27,
    },
    {
      id: "aa-5",
      traderName: "YOLO_100X_Scalper",
      tier: "Novice Scalper",
      weeklyReturnPct: 44.8,
      maxDrawdownPct: 38.5,
      sharpeRatio: 0.72,
      rule43Violations: 6,
      tradesCount: 84,
    },
  ];

  return sortArenaLeaderboard(
    raw.map((r) => ({
      ...r,
      calmarRatio: calculateCalmarRatio(r.weeklyReturnPct, r.maxDrawdownPct),
      riskAdjustedScore: calculateRiskAdjustedScore(
        r.weeklyReturnPct,
        r.maxDrawdownPct,
        r.sharpeRatio,
        r.rule43Violations
      ),
    }))
  );
}

export function sortArenaLeaderboard(entries: AlphaArenaEntry[]): AlphaArenaEntry[] {
  return [...entries].sort((a, b) => b.riskAdjustedScore - a.riskAdjustedScore);
}

export function loadArenaEntries(): AlphaArenaEntry[] {
  if (typeof window === "undefined") return getSeedArenaEntries();
  try {
    const raw = localStorage.getItem(ARENA_STORAGE_KEY);
    if (!raw) {
      const seed = getSeedArenaEntries();
      localStorage.setItem(ARENA_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? sortArenaLeaderboard(parsed) : getSeedArenaEntries();
  } catch {
    return getSeedArenaEntries();
  }
}

export function submitArenaRun(params: {
  weeklyReturnPct: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  rule43Violations: number;
  tradesCount: number;
  tier?: string;
}): AlphaArenaEntry[] {
  const entries = loadArenaEntries().filter((e) => !e.isCurrentUser);
  const calmarRatio = calculateCalmarRatio(params.weeklyReturnPct, params.maxDrawdownPct);
  const riskAdjustedScore = calculateRiskAdjustedScore(
    params.weeklyReturnPct,
    params.maxDrawdownPct,
    params.sharpeRatio,
    params.rule43Violations
  );

  const userEntry: AlphaArenaEntry = {
    id: "aa-user",
    traderName: "You (Institutional Candidate)",
    tier: params.tier || "Prop Desk Trainee",
    weeklyReturnPct: Math.round(params.weeklyReturnPct * 10) / 10,
    maxDrawdownPct: Math.round(params.maxDrawdownPct * 10) / 10,
    sharpeRatio: Math.round(params.sharpeRatio * 100) / 100,
    calmarRatio,
    rule43Violations: params.rule43Violations,
    riskAdjustedScore,
    tradesCount: params.tradesCount,
    isCurrentUser: true,
  };

  const updated = sortArenaLeaderboard([userEntry, ...entries]);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ARENA_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }
  return updated;
}
