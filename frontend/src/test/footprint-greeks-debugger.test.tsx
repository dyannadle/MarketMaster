import { describe, it, expect } from "vitest";
import {
  generateFootprintBars,
} from "@/lib/order-flow-footprint";
import {
  computePortfolioGreeks,
  solveHedgingPlan,
  SAMPLE_OPTIONS_PORTFOLIO,
} from "@/lib/greeks-hedging";
import {
  generateBacktestDebuggerFrames,
} from "@/lib/backtest-debugger";

describe("Milestone 28: HFT Tick-by-Tick Order Flow Footprint & Volume Profile", () => {
  it("generates intra-candle bid/ask levels and cumulative delta", () => {
    const result = generateFootprintBars("NIFTY_FUT", 24500, 7, 3.0);

    expect(result.symbol).toBe("NIFTY_FUT");
    expect(result.bars.length).toBe(7);
    expect(result.totalVolume).toBeGreaterThan(0);
    expect(result.volumeProfile.length).toBeGreaterThan(0);

    // Verify bar OHLC and levels
    result.bars.forEach((bar) => {
      expect(bar.high).toBeGreaterThanOrEqual(bar.low);
      expect(bar.levels.length).toBeGreaterThan(0);
      expect(bar.pocPrice).toBeGreaterThanOrEqual(bar.low);
      expect(bar.pocPrice).toBeLessThanOrEqual(bar.high);
      expect(bar.vahPrice).toBeGreaterThanOrEqual(bar.valPrice);
    });
  });

  it("calculates Point of Control (POC) and 70% Value Area correctly", () => {
    const result = generateFootprintBars("NIFTY_FUT", 24500, 7, 3.0);

    expect(result.overallPoc).toBeGreaterThan(0);
    expect(result.overallVah).toBeGreaterThanOrEqual(result.overallVal);

    // The POC level in volume profile should have the highest total volume
    const pocBucket = result.volumeProfile.find((p) => p.isPoc);
    expect(pocBucket).toBeDefined();
    result.volumeProfile.forEach((bucket) => {
      expect(pocBucket!.totalVolume).toBeGreaterThanOrEqual(bucket.totalVolume);
    });
  });

  it("detects stacked buy and sell imbalances at 3x or 4x threshold", () => {
    const result = generateFootprintBars("NIFTY_FUT", 24500, 7, 3.0);
    const hasImbalanceBar = result.bars.some(
      (b) => b.stackedBuyImbalances >= 3 || b.stackedSellImbalances >= 3
    );
    expect(hasImbalanceBar).toBe(true);
  });
});

describe("Milestone 29: Multi-Leg Option Greeks Hedging & Dynamic Rebalancer", () => {
  it("aggregates portfolio Net Delta, Gamma, Theta, and Vega across multi-leg positions", () => {
    const greeks = computePortfolioGreeks(SAMPLE_OPTIONS_PORTFOLIO, 50);

    expect(greeks.netDelta).toBeDefined();
    expect(greeks.netGamma).toBeDefined();
    expect(greeks.netTheta).toBeDefined();
    expect(greeks.netVega).toBeDefined();
    expect(greeks.unhedgedDailyVar).toBeGreaterThan(0);

    // Verify tolerance corridor breach flag
    const expectedBreach = Math.abs(greeks.netDelta) > 50;
    expect(greeks.isRebalanceRequired).toBe(expectedBreach);
  });

  it("solves Delta-neutrality rebalancing plan bringing residual Delta near zero", () => {
    const plan = solveHedgingPlan(SAMPLE_OPTIONS_PORTFOLIO, "DELTA_ONLY", 25, 24500);

    expect(plan.mode).toBe("DELTA_ONLY");
    expect(plan.recommendations.length).toBeGreaterThan(0);
    expect(Math.abs(plan.projectedGreeks.postHedgeDelta)).toBeLessThanOrEqual(25); // within 1 lot
    expect(plan.hedgingEfficiencyPct).toBeGreaterThan(55);
    expect(plan.totalHedgingCost).toBeGreaterThan(0);
    expect(plan.basisDragBps).toBeDefined();
  });

  it("solves dual Delta-Gamma neutrality using options and futures", () => {
    const plan = solveHedgingPlan(SAMPLE_OPTIONS_PORTFOLIO, "DELTA_GAMMA", 25, 24500);

    expect(plan.mode).toBe("DELTA_GAMMA");
    expect(plan.recommendations.length).toBeGreaterThanOrEqual(1);
    expect(Math.abs(plan.projectedGreeks.postHedgeDelta)).toBeLessThanOrEqual(25);
    expect(Math.abs(plan.projectedGreeks.postHedgeGamma)).toBeLessThan(
      Math.abs(plan.baselineGreeks.netGamma) + 0.05
    );
    expect(plan.hedgingEfficiencyPct).toBeGreaterThan(70);
  });
});

describe("Milestone 30: Real-Time Backtest Visual Debugger & Step-Through Player", () => {
  it("generates deterministic candle-by-candle playback frames with indicator states", () => {
    const debuggerData = generateBacktestDebuggerFrames("Dual_EMA_Crossover", "NIFTY_FUT", 30, 9, 21);

    expect(debuggerData.totalFrames).toBe(30);
    expect(debuggerData.frames.length).toBe(30);

    debuggerData.frames.forEach((frame) => {
      expect(frame.frameIndex).toBeGreaterThan(0);
      expect(frame.indicators.fastEma).toBeGreaterThan(0);
      expect(frame.indicators.slowEma).toBeGreaterThan(0);
      expect(frame.indicators.trailingStop).toBeGreaterThan(0);
      expect(frame.equity).toBeGreaterThan(0);
      expect(frame.signalReason.length).toBeGreaterThan(10);
    });
  });

  it("triggers Long Entry and trails stop-loss upward throughout trade", () => {
    const debuggerData = generateBacktestDebuggerFrames("Dual_EMA_Crossover", "NIFTY_FUT", 30, 9, 21);

    const entryFrame = debuggerData.frames.find((f) => f.signalState === "LONG_ENTRY");
    expect(entryFrame).toBeDefined();
    expect(entryFrame!.annotation?.type).toBe("ENTRY");
    expect(entryFrame!.activePosition?.side).toBe("BUY");

    // In a later in-trade frame, trailing stop should be higher than initial entry stop
    const inTradeFrames = debuggerData.frames.filter((f) => f.signalState === "IN_TRADE");
    if (inTradeFrames.length > 2) {
      const laterFrame = inTradeFrames[inTradeFrames.length - 1]!;
      expect(laterFrame.indicators.trailingStop).toBeGreaterThanOrEqual(
        entryFrame!.indicators.trailingStop
      );
    }
  });
});
