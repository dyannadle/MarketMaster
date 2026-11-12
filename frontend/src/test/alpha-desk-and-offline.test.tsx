import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateRiskRewardRatio,
  validateRule43Compliance,
  saveSetup,
  addPeerReview,
  getStoredSetups,
  getDefaultSetups,
} from '../lib/chart-annotations';

describe('PIP 5.2 Alpha Desk & Peer Setup Annotations', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('calculates risk-to-reward ratio correctly for BUY and SELL setups', () => {
    // BUY: Entry 24000, SL 23900 (Risk 100), Target 24300 (Reward 300) -> 1:3.0
    const buyRR = calculateRiskRewardRatio(24000, 23900, 24300, 'BUY');
    expect(buyRR).toBe(3.0);

    // SELL: Entry 50000, SL 50200 (Risk 200), Target 49400 (Reward 600) -> 1:3.0
    const sellRR = calculateRiskRewardRatio(50000, 50200, 49400, 'SELL');
    expect(sellRR).toBe(3.0);

    // Zero edge check
    expect(calculateRiskRewardRatio(0, 0, 0, 'BUY')).toBe(0);
  });

  it('enforces Rule 4.3 (Risk <= 1.5% of asset price per trade)', () => {
    // 100 pt risk on 24,000 spot is 0.416% -> Valid
    expect(validateRule43Compliance(24000, 23900)).toBe(true);

    // 360 pt risk on 24,000 spot is 1.50% -> Valid
    expect(validateRule43Compliance(24000, 23640)).toBe(true);

    // 500 pt risk on 24,000 spot is 2.08% -> Invalid (exceeds 1.5%)
    expect(validateRule43Compliance(24000, 23500)).toBe(false);
  });

  it('persists setups to localStorage and allows adding peer feedback', () => {
    const saved = saveSetup({
      authorHandle: 'TestTrader_99',
      symbol: 'NIFTY50',
      timeframe: '5m',
      side: 'BUY',
      entryPrice: 24100,
      stopLossPrice: 24000,
      targetPrice: 24400,
      riskRewardRatio: 3.0,
      rule43Compliant: true,
      tags: ['#BreakoutRetest'],
      thesis: 'Test breakout thesis above range high.',
    });

    expect(saved.id).toBeDefined();
    expect(saved.peerReviews).toHaveLength(0);

    const updated = addPeerReview(saved.id, {
      reviewerHandle: 'SeniorDesk_PM',
      clarityScore: 5,
      riskManagementScore: 4,
      pedagogicalComment: 'Solid execution plan with strict stop-loss adherence.',
    });

    expect(updated).not.toBeNull();
    expect(updated?.peerReviews).toHaveLength(1);
    expect(updated?.peerReviews[0]?.clarityScore).toBe(5);

    const all = getStoredSetups();
    expect(all.length).toBeGreaterThan(0);
    expect(all.find((s) => s.id === saved.id)).toBeDefined();
  });
});
