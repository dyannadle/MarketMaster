import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

// Mock resize observer for Recharts
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// 1. VPIN Engine Imports
import {
  classifyTickVolume,
  aggregateVolumeBuckets,
  calculateVpinSeries,
  generateSyntheticTradeTicks,
  generateVpinReport,
} from "../lib/vpin-toxicity";

// 2. SBE Protocol Imports
import {
  encodeSbeNewOrderSingle,
  decodeSbeNewOrderSingle,
  encodeSbeExecutionReport,
  decodeSbeExecutionReport,
  runProtocolBenchmark,
  formatSbeHexDump,
  SBE_XML_SCHEMA_DEFINITION,
} from "../lib/sbe-protocol";

// 3. NSGA-II Portfolio Optimizer Imports
import {
  normalizeToSimplex,
  evaluatePortfolio,
  dominates,
  fastNonDominatedSort,
  assignCrowdingDistances,
  runNsgaPortfolioOptimization,
  DEFAULT_ASSET_UNIVERSE,
} from "../lib/nsga-optimizer";

// 4. UI Components
import { OrderFlowToxicityVpin } from "../components/trading/OrderFlowToxicityVpin";
import { SbeProtocolInspector } from "../components/trading/SbeProtocolInspector";
import { NsgaPortfolioOptimizer } from "../components/trading/NsgaPortfolioOptimizer";

describe("Milestone 46: High-Frequency Order Flow Toxicity & VPIN Engine", () => {
  it("classifies trade ticks into buy and sell volume using BVC", () => {
    const buyResult = classifyTickVolume(24505, 24500, 100);
    expect(buyResult.buyVol).toBeGreaterThan(buyResult.sellVol);

    const sellResult = classifyTickVolume(24495, 24500, 100);
    expect(sellResult.sellVol).toBeGreaterThan(sellResult.buyVol);

    const neutralResult = classifyTickVolume(24500, 24500, 100);
    expect(neutralResult.buyVol).toBe(50);
    expect(neutralResult.sellVol).toBe(50);
  });

  it("aggregates raw trade ticks into constant-volume buckets", () => {
    const ticks = generateSyntheticTradeTicks(400, 24500);
    const buckets = aggregateVolumeBuckets(ticks, 10000);
    expect(buckets.length).toBeGreaterThan(5);
    expect(buckets[0]!.totalVolume).toBe(10000);
    expect(buckets[0]!.volumeImbalance).toBeGreaterThanOrEqual(0);
    expect(buckets[0]!.imbalanceRatio).toBeGreaterThanOrEqual(0);
    expect(buckets[0]!.imbalanceRatio).toBeLessThanOrEqual(1.0);
  });

  it("calculates rolling VPIN and identifies toxicity regimes", () => {
    const ticks = generateSyntheticTradeTicks(500, 24500);
    const buckets = aggregateVolumeBuckets(ticks, 10000);
    const vpinSeries = calculateVpinSeries(buckets, 20, 10000);
    expect(vpinSeries.length).toBe(buckets.length);

    const lastPoint = vpinSeries[vpinSeries.length - 1]!;
    expect(lastPoint.vpin).toBeGreaterThanOrEqual(0);
    expect(lastPoint.vpin).toBeLessThanOrEqual(1.0);
    expect(lastPoint.cdfPercentile).toBeGreaterThanOrEqual(0);
    expect(lastPoint.cdfPercentile).toBeLessThanOrEqual(100);
    expect(["LOW", "NORMAL", "ELEVATED", "CRITICAL_FLASH_RISK"]).toContain(lastPoint.toxicityLevel);
  });

  it("generates comprehensive VPIN report with Rule 4.3 stop-loss lock recommendation", () => {
    const report = generateVpinReport("NIFTY_FUT", 10000, 25, 400);
    expect(report.symbol).toBe("NIFTY_FUT");
    expect(report.history.length).toBeGreaterThan(0);
    expect(typeof report.rule43RiskAlert).toBe("boolean");
    expect(report.buckets.length).toBeGreaterThan(0);
  });
});

describe("Milestone 47: Simple Binary Encoding (SBE) Protocol Engine", () => {
  it("encodes and decodes Template 501: NewOrderSingle_SBE with zero-copy constants", () => {
    const origOrder = {
      clOrdId: 1234567890123n,
      securityId: 101,
      price: 24510.25,
      orderQty: 200,
      side: "BUY" as const,
      timeInForce: "IOC" as const,
      orderType: "LIMIT" as const,
      transactTimeNs: 34200123456789n,
      account: 9999,
    };

    const buffer = encodeSbeNewOrderSingle(origOrder);
    expect(buffer.length).toBe(56);

    const decoded = decodeSbeNewOrderSingle(buffer);
    expect(decoded.header.blockLength).toBe(48);
    expect(decoded.header.templateId).toBe(501);
    expect(decoded.header.schemaId).toBe(1);
    expect(decoded.clOrdId).toBe(1234567890123n);
    expect(decoded.securityId).toBe(101);
    expect(decoded.price).toBeCloseTo(24510.25, 2);
    expect(decoded.orderQty).toBe(200);
    expect(decoded.side).toBe("BUY");
    expect(decoded.timeInForce).toBe("IOC");
  });

  it("encodes and decodes Template 502: ExecutionReport_SBE", () => {
    const origExec = {
      orderId: 77777777n,
      clOrdId: 1234567890123n,
      execId: 88888888n,
      securityId: 101,
      transactTimeNs: 34200123460000n,
      lastPx: 24510.25,
      lastQty: 200,
      cumQty: 200,
      side: "BUY" as const,
      ordStatus: "FILLED" as const,
      execType: "TRADE" as const,
    };

    const buffer = encodeSbeExecutionReport(origExec);
    expect(buffer.length).toBe(64);

    const decoded = decodeSbeExecutionReport(buffer);
    expect(decoded.header.blockLength).toBe(56);
    expect(decoded.header.templateId).toBe(502);
    expect(decoded.orderId).toBe(77777777n);
    expect(decoded.lastPx).toBeCloseTo(24510.25, 2);
    expect(decoded.lastQty).toBe(200);
    expect(decoded.ordStatus).toBe("FILLED");
  });

  it("generates formatted SBE hex dumps and XML schema templates", () => {
    const bytes = new Uint8Array([0x30, 0x00, 0xf5, 0x01, 0x01, 0x00, 0x01, 0x00]);
    const dump = formatSbeHexDump(bytes);
    expect(dump).toContain("0000");
    expect(dump).toContain("30 00 F5 01");
    expect(SBE_XML_SCHEMA_DEFINITION).toContain("<sbe:message name=\"NewOrderSingle_SBE\"");
  });

  it("runs multi-protocol wire benchmark comparing SBE against FAST, FIX, and JSON", () => {
    const benchmarks = runProtocolBenchmark();
    expect(benchmarks.length).toBe(4);

    const sbe = benchmarks.find((b) => b.protocol === "SBE")!;
    expect(sbe.zeroCopyCapable).toBe(true);
    expect(sbe.memoryAllocations).toBe(0);
    expect(sbe.decodeLatencyNs).toBeLessThan(10); // < 10ns
  });
});

describe("Milestone 48: Evolutionary Multi-Objective Portfolio Optimizer (NSGA-II)", () => {
  it("normalizes arbitrary weight vectors onto the probability simplex", () => {
    const raw = [0.4, 0.6, 0.2, 0.8];
    const simplex = normalizeToSimplex(raw);
    const sum = simplex.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
    simplex.forEach((w) => expect(w).toBeGreaterThanOrEqual(0));
  });

  it("evaluates expected return, volatility, and Cornish-Fisher CVaR_95", () => {
    const weights = [0.3, 0.2, 0.2, 0.15, 0.15];
    const metrics = evaluatePortfolio(weights, DEFAULT_ASSET_UNIVERSE);
    expect(metrics.expReturn).toBeGreaterThan(0.05);
    expect(metrics.vol).toBeGreaterThan(0.05);
    expect(metrics.cvar95).toBeGreaterThan(metrics.vol);
    expect(metrics.sharpe).toBeGreaterThan(0);
  });

  it("checks Pareto dominance relationships correctly", () => {
    const candA = {
      id: "A",
      weights: [0.5, 0.5],
      expectedReturnPct: 15.0,
      volatilityPct: 12.0,
      cvar95Pct: 20.0,
      sharpeRatio: 1.25,
      rank: 1,
      crowdingDistance: 0,
      rule43Compliant: true,
    };

    const candB = {
      id: "B",
      weights: [0.5, 0.5],
      expectedReturnPct: 12.0,
      volatilityPct: 14.0,
      cvar95Pct: 24.0,
      sharpeRatio: 0.85,
      rank: 1,
      crowdingDistance: 0,
      rule43Compliant: true,
    };

    expect(dominates(candA, candB)).toBe(true);
    expect(dominates(candB, candA)).toBe(false);
  });

  it("runs full NSGA-II optimization and extracts Pareto frontier recommendations", () => {
    const report = runNsgaPortfolioOptimization(20, 5, DEFAULT_ASSET_UNIVERSE);
    expect(report.paretoFront.length).toBeGreaterThan(0);
    expect(report.maxSharpePortfolio).toBeDefined();
    expect(report.minVolPortfolio).toBeDefined();
    expect(report.minCvarPortfolio).toBeDefined();
    expect(report.maxSharpePortfolio.sharpeRatio).toBeGreaterThanOrEqual(report.minVolPortfolio.sharpeRatio);
  });
});

describe("UI Components Mounting Tests", () => {
  it("renders OrderFlowToxicityVpin correctly", () => {
    const { container } = render(<OrderFlowToxicityVpin symbol="NIFTY_FUT" />);
    expect(container).toBeTruthy();
    expect(screen.getByText(/High-Frequency Order Flow Toxicity & VPIN Monitor/i)).toBeTruthy();
    expect(screen.getByText(/Current VPIN/i)).toBeTruthy();
  });

  it("renders SbeProtocolInspector correctly", () => {
    const { container } = render(<SbeProtocolInspector />);
    expect(container).toBeTruthy();
    expect(screen.getByText(/Simple Binary Encoding \(SBE\) Protocol Inspector/i)).toBeTruthy();
    expect(screen.getByText(/Zero-Copy In-Place/i)).toBeTruthy();
  });

  it("renders NsgaPortfolioOptimizer correctly", () => {
    const { container } = render(<NsgaPortfolioOptimizer />);
    expect(container).toBeTruthy();
    expect(screen.getByText(/Evolutionary Multi-Objective Portfolio Optimizer \(NSGA-II\)/i)).toBeTruthy();
    expect(screen.getAllByText(/Max Sharpe/i).length).toBeGreaterThan(0);
  });
});
