/**
 * Social Chart Annotation & Peer Setup Sharing System (PIP Part 5.2)
 * Allows traders to export interactive chart snapshots with entry, stop loss, targets,
 * and review them anonymously on the Alpha Desk setup forum with risk-adjusted scoring.
 */

export interface ChartAnnotationSetup {
  id: string;
  authorHandle: string;
  symbol: string;
  timeframe: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  stopLossPrice: number;
  targetPrice: number;
  riskRewardRatio: number;
  rule43Compliant: boolean; // Risk <= 1.5%
  tags: string[]; // e.g. ['#BreakoutRetest', '#OrderBlock', '#LiquidityGrab']
  thesis: string;
  timestamp: number;
  peerReviews: PeerReviewFeedback[];
}

export interface PeerReviewFeedback {
  id: string;
  reviewerHandle: string;
  clarityScore: number; // 1-5
  riskManagementScore: number; // 1-5
  pedagogicalComment: string;
  timestamp: number;
}

const STORAGE_KEY = 'marketmaster_alpha_desk_setups';

export const POPULAR_SETUP_TAGS = [
  '#BreakoutRetest',
  '#OrderBlock',
  '#LiquidityGrab',
  '#FairValueGap',
  '#WyckoffSpring',
  '#OptionsHedging',
  '#DeltaNeutral',
  '#OpeningRangeBreakout',
];

export function calculateRiskRewardRatio(entry: number, stop: number, target: number, side: 'BUY' | 'SELL'): number {
  if (entry <= 0 || stop <= 0 || target <= 0) return 0;
  const risk = Math.abs(entry - stop);
  if (risk === 0) return 0;
  const reward = Math.abs(target - entry);
  return Math.round((reward / risk) * 100) / 100;
}

export function validateRule43Compliance(entry: number, stop: number): boolean {
  if (entry <= 0) return false;
  const riskPct = (Math.abs(entry - stop) / entry) * 100;
  return riskPct <= 1.5; // Institutional rule: Risk <= 1.5% per trade
}

export function getStoredSetups(): ChartAnnotationSetup[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSetups();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getDefaultSetups();
  } catch {
    return getDefaultSetups();
  }
}

export function saveSetup(setup: Omit<ChartAnnotationSetup, 'id' | 'timestamp' | 'peerReviews'>): ChartAnnotationSetup {
  const all = getStoredSetups();
  const id = `setup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newSetup: ChartAnnotationSetup = {
    ...setup,
    id,
    timestamp: Date.now(),
    peerReviews: [],
  };

  const updated = [newSetup, ...all];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return newSetup;
}

export function addPeerReview(
  setupId: string,
  review: Omit<PeerReviewFeedback, 'id' | 'timestamp'>
): ChartAnnotationSetup | null {
  const all = getStoredSetups();
  const target = all.find((s) => s.id === setupId);
  if (!target) return null;

  const newFeedback: PeerReviewFeedback = {
    ...review,
    id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
  };

  target.peerReviews.push(newFeedback);

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
  return target;
}

export function getDefaultSetups(): ChartAnnotationSetup[] {
  return [
    {
      id: 'setup_demo_1',
      authorHandle: 'AnonDesk_84',
      symbol: 'NIFTY50',
      timeframe: '5m',
      side: 'BUY',
      entryPrice: 24200,
      stopLossPrice: 24080,
      targetPrice: 24560,
      riskRewardRatio: 3.0,
      rule43Compliant: true,
      tags: ['#BreakoutRetest', '#OrderBlock'],
      thesis: 'Clean liquidity sweep below previous day low followed by an impulsive candle retesting the 24,200 demand zone. Invalidation clearly below 24,080.',
      timestamp: Date.now() - 3600 * 1000 * 4,
      peerReviews: [
        {
          id: 'rev_1',
          reviewerHandle: 'RiskManager_01',
          clarityScore: 5,
          riskManagementScore: 5,
          pedagogicalComment: 'Flawless 1:3 R:R setup with clear structural invalidation. 0.5% capital risk adheres strictly to Rule 4.3.',
          timestamp: Date.now() - 3600 * 1000 * 2,
        },
      ],
    },
    {
      id: 'setup_demo_2',
      authorHandle: 'VolTrader_12',
      symbol: 'BANKNIFTY',
      timeframe: '15m',
      side: 'SELL',
      entryPrice: 51800,
      stopLossPrice: 52150,
      targetPrice: 50750,
      riskRewardRatio: 3.0,
      rule43Compliant: true,
      tags: ['#FairValueGap', '#LiquidityGrab'],
      thesis: 'Price failed to accept above Value Area High (VAH) rejecting the 15m Fair Value Gap. Targets POC at 50,750.',
      timestamp: Date.now() - 3600 * 1000 * 10,
      peerReviews: [
        {
          id: 'rev_2',
          reviewerHandle: 'MacroHedge_9',
          clarityScore: 4,
          riskManagementScore: 5,
          pedagogicalComment: 'Good confluence with market profile value area rejection. High probability intraday momentum continuation.',
          timestamp: Date.now() - 3600 * 1000 * 8,
        },
      ],
    },
  ];
}
