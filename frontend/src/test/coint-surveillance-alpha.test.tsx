import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  computeCorrelationMatrix,
  computeCointegrationPair,
  computeDiversificationBenefit,
  MULTI_ASSET_BENCHMARK_SERIES,
} from '../lib/correlation-cointegration';
import { CorrelationCointegrationPanel } from '../components/trading/CorrelationCointegrationPanel';
import {
  computeFixChecksum,
  parseFixMessage,
  reconstructOrderLifecycle,
  scanTradeSurveillance,
  generateRegulatoryAuditCertificate,
  SAMPLE_FIX_DROP_COPY_STREAM,
} from '../lib/fix-surveillance';
import { FixSurveillancePanel } from '../components/trading/FixSurveillancePanel';
import {
  generateRandomTree,
  getNodeStats,
  alphaToString,
  exportToPolarsPython,
  evaluateAlphaTree,
  scoreAlphaIndividual,
  evolveAlphaGeneration,
  generateSyntheticMarketBars,
  DEFAULT_EVOLUTION_CONFIG,
  AlphaNode,
} from '../lib/symbolic-alpha';
import { SymbolicAlphaDiscoverer } from '../components/trading/SymbolicAlphaDiscoverer';

describe('Milestone 31: Correlation & Cointegration Analytics', () => {
  it('computes symmetric correlation matrix with 1.0 along the main diagonal', () => {
    const matrix = computeCorrelationMatrix(MULTI_ASSET_BENCHMARK_SERIES);
    expect(matrix.symbols.length).toBe(MULTI_ASSET_BENCHMARK_SERIES.length);
    expect(matrix.pearsonMatrix.length).toBe(MULTI_ASSET_BENCHMARK_SERIES.length);

    for (let i = 0; i < matrix.symbols.length; i++) {
      expect(matrix.pearsonMatrix[i]![i]).toBe(1.0);
      for (let j = 0; j < matrix.symbols.length; j++) {
        expect(matrix.pearsonMatrix[i]![j]).toBeCloseTo(matrix.pearsonMatrix[j]![i]!, 5);
        expect(matrix.pearsonMatrix[i]![j]!).toBeGreaterThanOrEqual(-1.0);
        expect(matrix.pearsonMatrix[i]![j]!).toBeLessThanOrEqual(1.0);
      }
    }
  });

  it('solves Engle-Granger OLS hedge ratio and computes rolling z-scores', () => {
    const res = computeCointegrationPair('HDFCBANK', 'ICICIBANK');
    expect(res.assetA).toBe('HDFCBANK');
    expect(res.assetB).toBe('ICICIBANK');
    expect(res.hedgeRatio).toBeGreaterThan(0);
    expect(res.spreadHistory.length).toBeGreaterThan(10);
    expect(res.tStatistic).toBeLessThan(0);
    expect(typeof res.isCointegrated).toBe('boolean');
  });

  it('computes Markowitz Diversification Benefit Ratio', () => {
    const dbr = computeDiversificationBenefit();
    expect(dbr.diversificationRatio).toBeGreaterThan(1.0);
    expect(dbr.optimalMarkowitzWeights.length).toBe(MULTI_ASSET_BENCHMARK_SERIES.length);
    const sumWeights = dbr.optimalMarkowitzWeights.reduce((sum, w) => sum + w.weightPct, 0);
    expect(sumWeights).toBe(100);
  });

  it('renders CorrelationCointegrationPanel without crashing', () => {
    render(<CorrelationCointegrationPanel />);
    expect(screen.getByText(/Cross-Asset Correlation & Cointegration Matrix/i)).toBeDefined();
    expect(screen.getByText(/Diversification Ratio/i)).toBeDefined();
  });
});

describe('Milestone 32: FIX 4.4 Drop Copy & Trade Surveillance Engine', () => {
  it('calculates FIX standard checksum and parses raw tag-value strings', () => {
    const raw = '8=FIX.4.4|35=D|49=CLIENT|56=BROKER|11=ORD1|55=RELIANCE|54=1|38=100|44=2500.00|60=20261114-09:30:00.000|1=ACC1|10=000|';
    const checksum = computeFixChecksum(raw);
    expect(checksum.length).toBe(3);

    const parsed = parseFixMessage(raw);
    expect(parsed.msgType).toBe('D');
    expect(parsed.msgTypeName).toBe('NewOrderSingle');
    expect(parsed.symbol).toBe('RELIANCE');
    expect(parsed.side).toBe('1');
    expect(parsed.orderQty).toBe(100);
    expect(parsed.price).toBe(2500);
    expect(parsed.account).toBe('ACC1');
  });

  it('reconstructs order lifecycles from execution reports', () => {
    const messages = SAMPLE_FIX_DROP_COPY_STREAM.map(line => parseFixMessage(line));
    const { orders } = reconstructOrderLifecycle(messages);
    expect(orders.length).toBeGreaterThan(0);

    const relianceOrder = orders.find(o => o.symbol === 'RELIANCE');
    expect(relianceOrder).toBeDefined();
    expect(relianceOrder?.cumQty).toBe(500);
    expect(relianceOrder?.status).toBe('FILLED');
  });

  it('detects SEBI Schedule V violations: wash trades, spoofing, and circular trading', () => {
    const messages = SAMPLE_FIX_DROP_COPY_STREAM.map(line => parseFixMessage(line));
    const { orders } = reconstructOrderLifecycle(messages);
    const violations = scanTradeSurveillance(messages, orders);

    expect(violations.length).toBeGreaterThan(0);
    const wash = violations.find(v => v.type === 'WASH_TRADE');
    const spoof = violations.find(v => v.type === 'SPOOFING_LAYERING');

    expect(wash).toBeDefined();
    expect(wash?.severity).toBe('CRITICAL');
    expect(spoof).toBeDefined();
    expect(spoof?.severity).toBe('HIGH');
  });

  it('generates cryptographic regulatory audit certificate with SHA-256 hash', async () => {
    const messages = SAMPLE_FIX_DROP_COPY_STREAM.map(line => parseFixMessage(line));
    const { orders } = reconstructOrderLifecycle(messages);
    const violations = scanTradeSurveillance(messages, orders);

    const cert = await generateRegulatoryAuditCertificate(messages, orders, violations);
    expect(cert.certificateId).toContain('SEBI-AUDIT-');
    expect(cert.checksumSha256.length).toBeGreaterThan(10);
    expect(cert.regulatoryJurisdiction).toBe('SEBI (Securities and Exchange Board of India)');
  });

  it('renders FixSurveillancePanel without crashing', () => {
    render(<FixSurveillancePanel />);
    expect(screen.getByText(/Institutional FIX 4.4 Drop Copy & Trade Surveillance/i)).toBeDefined();
    expect(screen.getByText(/Total FIX Messages/i)).toBeDefined();
  });
});

describe('Milestone 33: Genetic Programming Alpha Formula Discoverer', () => {
  it('generates AST expression trees and computes node count and depth', () => {
    const tree: AlphaNode = {
      type: 'binary',
      op: 'sub',
      left: { type: 'feature', name: 'close' },
      right: { type: 'ts', op: 'ts_mean', window: 10, child: { type: 'feature', name: 'close' } },
    };

    const stats = getNodeStats(tree);
    expect(stats.count).toBe(4);
    expect(stats.depth).toBe(3);

    const formula = alphaToString(tree);
    expect(formula).toBe('(close - ts_mean(close, 10))');
  });

  it('exports AST expression tree directly to vectorized Polars Python code', () => {
    const tree: AlphaNode = {
      type: 'binary',
      op: 'sub',
      left: { type: 'feature', name: 'close' },
      right: { type: 'ts', op: 'ts_mean', window: 5, child: { type: 'feature', name: 'close' } },
    };

    const code = exportToPolarsPython(tree);
    expect(code).toContain('import polars as pl');
    expect(code).toContain('def compute_alpha(df: pl.DataFrame)');
    expect(code).toContain('rolling_mean(window_size=5)');
  });

  it('evaluates alpha expression across market bars and scores fitness with parsimony penalty', () => {
    const bars = generateSyntheticMarketBars(100, 12);
    const tree = generateRandomTree(3, 1, 'grow');
    const signal = evaluateAlphaTree(tree, bars);
    expect(signal.length).toBe(100);

    const individual = scoreAlphaIndividual(tree, bars, DEFAULT_EVOLUTION_CONFIG);
    expect(individual.id.startsWith('ALPHA-')).toBe(true);
    expect(typeof individual.ic).toBe('number');
    expect(typeof individual.sharpe).toBe('number');
    expect(typeof individual.fitness).toBe('number');
  });

  it('evolves population across generations with elitism', () => {
    const bars = generateSyntheticMarketBars(80, 7);
    const config = { ...DEFAULT_EVOLUTION_CONFIG, populationSize: 10, generations: 2 };
    const pop = [
      scoreAlphaIndividual(generateRandomTree(3, 1, 'grow'), bars, config),
      scoreAlphaIndividual(generateRandomTree(3, 1, 'grow'), bars, config),
      scoreAlphaIndividual(generateRandomTree(3, 1, 'grow'), bars, config),
      scoreAlphaIndividual(generateRandomTree(3, 1, 'grow'), bars, config),
    ];

    const nextGen = evolveAlphaGeneration(pop, bars, config);
    expect(nextGen.length).toBe(10);
    // Highest fitness is first
    expect(nextGen[0]!.fitness).toBeGreaterThanOrEqual(nextGen[1]!.fitness);
  });

  it('renders SymbolicAlphaDiscoverer without crashing', () => {
    render(<SymbolicAlphaDiscoverer />);
    expect(screen.getByText(/Genetic Programming Symbolic Alpha Discoverer/i)).toBeDefined();
    expect(screen.getByText(/Best Information Coeff/i)).toBeDefined();
  });
});
