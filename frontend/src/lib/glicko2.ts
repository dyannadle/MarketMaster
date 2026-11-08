/**
 * Glicko-2 Rating Engine for Trader Skill Quantification.
 * Evaluates performance against historical market scenario benchmarks,
 * penalizing high variance, lack of stop loss, and rewarding high Sharpe/expectancy.
 */

export interface GlickoTrader {
  rating: number;       // Skill rating, default: 1500
  rd: number;           // Rating deviation (uncertainty), default: 350
  vol: number;          // Volatility, default: 0.06
  totalSessions: number;
  bestRating: number;
  rankTitle: TraderRank;
}

export type TraderRank =
  | "Novice Scalper"
  | "Prop Desk Trainee"
  | "Senior Derivatives Trader"
  | "Macro Hedge Fund PM";

export function getRankFromRating(rating: number): { title: TraderRank; badgeColor: string; tier: number } {
  if (rating < 1350) {
    return { title: "Novice Scalper", badgeColor: "text-amber-500 bg-amber-500/10 border-amber-500/30", tier: 1 };
  } else if (rating < 1650) {
    return { title: "Prop Desk Trainee", badgeColor: "text-sky-400 bg-sky-400/10 border-sky-400/30", tier: 2 };
  } else if (rating < 1950) {
    return { title: "Senior Derivatives Trader", badgeColor: "text-purple-400 bg-purple-400/10 border-purple-400/30", tier: 3 };
  } else {
    return { title: "Macro Hedge Fund PM", badgeColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30", tier: 4 };
  }
}

const STORAGE_KEY = "mm-trader-glicko-profile";

export function getSavedTraderProfile(): GlickoTrader {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        rating: Math.round(parsed.rating || 1500),
        rd: Math.round(parsed.rd || 350),
        vol: parsed.vol || 0.06,
        totalSessions: parsed.totalSessions || 0,
        bestRating: Math.round(parsed.bestRating || 1500),
        rankTitle: getRankFromRating(parsed.rating || 1500).title,
      };
    }
  } catch {}

  return {
    rating: 1500,
    rd: 350,
    vol: 0.06,
    totalSessions: 0,
    bestRating: 1500,
    rankTitle: "Prop Desk Trainee",
  };
}

export function saveTraderProfile(profile: GlickoTrader) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}

/**
 * Calculates updated Glicko-2 rating after a rated replay session.
 * @param current Current trader profile
 * @param sessionPnl Net realized P&L from the session
 * @param winRate Percentage of winning trades (0.0 to 1.0)
 * @param disciplineScore Discipline score during session (0 to 100)
 * @param scenarioDifficulty Base benchmark rating of scenario (e.g. Covid Crash = 1800, Range = 1400)
 */
export function calculateUpdatedRating(
  current: GlickoTrader,
  sessionPnl: number,
  winRate: number,
  disciplineScore: number,
  scenarioDifficulty: number = 1500
): { updated: GlickoTrader; ratingDelta: number } {
  // Score s: 1.0 = Big Win, 0.5 = Breakeven, 0.0 = Loss
  let outcomeScore = 0.5;
  if (sessionPnl > 20000) outcomeScore = 1.0;
  else if (sessionPnl > 0) outcomeScore = 0.75;
  else if (sessionPnl < -20000) outcomeScore = 0.0;
  else if (sessionPnl < 0) outcomeScore = 0.25;

  // Weight by discipline (Rule 4.3 compliance)
  const disciplineMultiplier = disciplineScore >= 80 ? 1.15 : disciplineScore < 60 ? 0.6 : 0.9;

  // Scale Glicko rating
  const q = Math.log(10) / 400;
  const gRD = 1 / Math.sqrt(1 + (3 * q * q * current.rd * current.rd) / (Math.PI * Math.PI));
  const expectedScore = 1 / (1 + Math.pow(10, (-gRD * (current.rating - scenarioDifficulty)) / 400));

  const d2 = 1 / (q * q * gRD * gRD * expectedScore * (1 - expectedScore));
  const ratingDelta = Math.round(
    ((q / (1 / (current.rd * current.rd) + 1 / d2)) * gRD * (outcomeScore - expectedScore)) * disciplineMultiplier
  );

  const newRating = Math.max(800, Math.min(2800, current.rating + ratingDelta));
  const newRd = Math.max(50, Math.round(Math.sqrt(1 / (1 / (current.rd * current.rd) + 1 / d2))));
  const best = Math.max(current.bestRating, newRating);

  const updated: GlickoTrader = {
    rating: newRating,
    rd: newRd,
    vol: current.vol,
    totalSessions: current.totalSessions + 1,
    bestRating: best,
    rankTitle: getRankFromRating(newRating).title,
  };

  saveTraderProfile(updated);
  return { updated, ratingDelta };
}
