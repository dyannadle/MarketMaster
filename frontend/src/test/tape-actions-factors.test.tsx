import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  generateSyntheticTapeStream,
  computeTapeVelocityMetrics,
  TAPE_DRILL_SCENARIOS,
  TapePrint,
} from '../lib/tape-reading';
import { TapeReadingSandbox } from '../components/trading/TapeReadingSandbox';
import {
  SAMPLE_CORPORATE_ACTIONS,
  applyCorporateAction,
  computeAdjustedPriceSeries,
  CorporateActionEvent,
  PortfolioHolding,
} from '../lib/corporate-actions';
import { CorporateActionsSimulator } from '../components/trading/CorporateActionsSimulator';
import {
  computeFactorRiskAttribution,
  generateSyntheticFactorReturns,
  solveMultiVariateOls,
} from '../lib/factor-risk-model';
import { FactorRiskModelPanel } from '../components/trading/FactorRiskModelPanel';

describe('Milestone 34: Time & Sales (Tape) Velocity & Microstructure Sandbox', () => {
  it('generates synthetic tape prints with timestamp, price, and block tags', () => {
    const prints = generateSyntheticTapeStream(2500.0, 50);
    expect(prints.length).toBe(50);

    const first = prints[0]!;
    expect(first.price).toBeGreaterThan(0);
    expect(first.quantity).toBeGreaterThan(0);
    expect(['BUY', 'SELL']).toContain(first.side);
    expect(first.timeStr).toMatch(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
    expect(first.valueInr).toBe(first.quantity * first.price);
  });

  it('calculates tape velocity ratio, aggressive flow imbalance, and resting iceberg patterns', () => {
    const baseTs = 1700000000000;
    const testPrints: TapePrint[] = [
      { id: '1', timestamp: baseTs, timeStr: '10:00:00.000', price: 2450.0, quantity: 500, side: 'SELL', isBlockTrade: false, valueInr: 1225000, bidPrice: 2450.0, askPrice: 2450.25 },
      { id: '2', timestamp: baseTs + 50, timeStr: '10:00:00.050', price: 2450.0, quantity: 800, side: 'SELL', isBlockTrade: false, valueInr: 1960000, bidPrice: 2450.0, askPrice: 2450.25 },
      { id: '3', timestamp: baseTs + 100, timeStr: '10:00:00.100', price: 2450.0, quantity: 1500, side: 'SELL', isBlockTrade: true, valueInr: 3675000, bidPrice: 2450.0, askPrice: 2450.25 },
    ];

    const metrics = computeTapeVelocityMetrics(testPrints);
    expect(metrics.totalVolume).toBe(2800);
    expect(metrics.sellVolume).toBe(2800);
    expect(metrics.buyRatio).toBe(0);
    expect(metrics.blockTradeCount).toBe(1);
    expect(metrics.detectedIcebergs.length).toBeGreaterThan(0);
    expect(metrics.detectedIcebergs[0]!.side).toBe('BUY_ICEBERG');
    expect(metrics.detectedIcebergs[0]!.price).toBe(2450.0);
  });

  it('includes gamified practice drills with verified answers', () => {
    expect(TAPE_DRILL_SCENARIOS.length).toBeGreaterThanOrEqual(3);
    const icebergDrill = TAPE_DRILL_SCENARIOS.find(d => d.id === 'DRILL-1-ICEBERG');
    expect(icebergDrill).toBeDefined();
    expect(icebergDrill?.correctAction).toBe('BUY_REVERSAL');
  });

  it('renders TapeReadingSandbox without crashing', () => {
    render(<TapeReadingSandbox symbol="RELIANCE" currentPrice={2450.0} />);
    expect(screen.getByText(/Time & Sales \(Tape\) Velocity & Microstructure Sandbox/i)).toBeDefined();
    expect(screen.getByText(/Tape Velocity \(TPS\)/i)).toBeDefined();
    expect(screen.getByText(/Aggressive Flow Imbalance/i)).toBeDefined();
  });
});

describe('Milestone 35: Corporate Actions & Dividend Adjustment Simulator', () => {
  const holding: PortfolioHolding = {
    symbol: 'INFY',
    quantity: 100,
    averagePrice: 1800.0,
  };

  it('executes 1:1 bonus issue, doubling quantity and halving average cost', () => {
    const bonusEvent: CorporateActionEvent = {
      id: 'E-BONUS',
      symbol: 'INFY',
      type: 'BONUS_ISSUE',
      exDate: '2024-09-12',
      recordDate: '2024-09-13',
      description: '1:1 Bonus Issue',
      ratio: 1.0,
    };

    const res = applyCorporateAction(holding, bonusEvent);
    expect(res.newQuantity).toBe(200);
    expect(res.newAveragePrice).toBe(900.0);
    expect(res.oldQuantity * res.oldAveragePrice).toBe(res.newQuantity * res.newAveragePrice);
  });

  it('executes 1:5 stock split, multiplying quantity by 5 and dividing cost by 5', () => {
    const splitEvent: CorporateActionEvent = {
      id: 'E-SPLIT',
      symbol: 'TATAMOTORS',
      type: 'STOCK_SPLIT',
      exDate: '2024-10-25',
      recordDate: '2024-10-26',
      description: '1:5 Stock Split',
      ratio: 5.0,
    };

    const res = applyCorporateAction({ symbol: 'TATAMOTORS', quantity: 50, averagePrice: 1000.0 }, splitEvent);
    expect(res.newQuantity).toBe(250);
    expect(res.newAveragePrice).toBe(200.0);
  });

  it('calculates cash dividend with Indian Section 194 10% TDS withholding', () => {
    const divEvent: CorporateActionEvent = {
      id: 'E-DIV',
      symbol: 'RELIANCE',
      type: 'CASH_DIVIDEND',
      exDate: '2024-08-19',
      recordDate: '2024-08-20',
      description: 'Cash Dividend ₹10.00',
      dividendPerShare: 10.0,
    };

    const res = applyCorporateAction({ symbol: 'RELIANCE', quantity: 200, averagePrice: 2500.0 }, divEvent);
    expect(res.grossDividendInr).toBe(2000.0);
    expect(res.tdsWithheldInr).toBe(200.0); // 10% TDS
    expect(res.netCashCreditedInr).toBe(1800.0);
    expect(res.ledgerEntries.length).toBe(3);
  });

  it('computes continuous backward-adjusted historical price series', () => {
    const raw = [
      { date: '2024-09-11', close: 1800.0 },
      { date: '2024-09-12', close: 900.0 }, // Ex-bonus 1:1 drop
      { date: '2024-09-13', close: 920.0 },
    ];
    const actions: CorporateActionEvent[] = [
      { id: '1', symbol: 'INFY', type: 'BONUS_ISSUE', exDate: '2024-09-12', recordDate: '2024-09-13', description: 'Bonus 1:1', ratio: 1.0 },
    ];

    const adjusted = computeAdjustedPriceSeries(raw, actions);
    expect(adjusted.length).toBe(3);
    // Backward adjustment factors smooth out the pre-split price
    expect(adjusted[0]!.adjustedClose).toBe(900.0);
    expect(adjusted[1]!.adjustedClose).toBe(900.0);
    expect(adjusted[2]!.adjustedClose).toBe(920.0);
  });

  it('renders CorporateActionsSimulator without crashing', () => {
    render(<CorporateActionsSimulator />);
    expect(screen.getByText(/Indian Market Corporate Actions & Dividend Adjustment Simulator/i)).toBeDefined();
    expect(screen.getByText(/Position Adjustment/i)).toBeDefined();
  });
});

describe('Milestone 36: Quantitative Factor Model & Barra-Style Risk Attribution', () => {
  it('solves multi-variate OLS regression with high R-squared', () => {
    const X = [
      [1.0, 0.01, 0.005, -0.002, 0.008],
      [1.0, -0.02, -0.001, 0.004, -0.010],
      [1.0, 0.015, 0.002, 0.001, 0.005],
      [1.0, -0.005, 0.008, -0.003, 0.002],
      [1.0, 0.022, -0.004, 0.006, 0.014],
      [1.0, 0.008, 0.001, -0.001, 0.003],
      [1.0, -0.012, 0.003, 0.002, -0.007],
    ];
    const Y = [0.015, -0.025, 0.020, -0.002, 0.030, 0.010, -0.015];

    const res = solveMultiVariateOls(X, Y);
    expect(res.coefficients.length).toBe(5);
    expect(res.rSquared).toBeGreaterThan(0.5);
    expect(res.residuals.length).toBe(7);
  });

  it('computes factor attribution and flags style drift warnings', () => {
    const factorSeries = generateSyntheticFactorReturns(40);
    // Create returns with excessive market beta (e.g. 1.45) and high momentum (e.g. 0.75)
    const returns = factorSeries.map(f => f.rf + 1.45 * f.mktRf + 0.75 * f.wml + 0.0005);

    const attr = computeFactorRiskAttribution(returns, factorSeries);
    expect(attr.betaMarket).toBeGreaterThan(1.3);
    expect(attr.betaMomentum).toBeGreaterThan(0.5);
    expect(attr.totalRiskAnnualizedPct).toBeGreaterThan(0);
    expect(attr.styleDriftWarnings.length).toBeGreaterThan(0);

    const mktWarning = attr.styleDriftWarnings.find(w => w.factor === 'MARKET');
    expect(mktWarning).toBeDefined();
    expect(mktWarning?.severity).toBe('HIGH');
  });

  it('renders FactorRiskModelPanel without crashing', () => {
    render(<FactorRiskModelPanel />);
    expect(screen.getByText(/Quantitative Factor Model & Barra-Style Risk Attribution/i)).toBeDefined();
    expect(screen.getByText(/Jensen's Alpha \(Annual\)/i)).toBeDefined();
    expect(screen.getByText(/Information Ratio \(IR\)/i)).toBeDefined();
  });
});
