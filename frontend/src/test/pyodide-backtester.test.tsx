import { describe, it, expect } from "vitest";
import {
  generateIntradayCandles,
  runQuantBacktest,
  PYTHON_STRATEGY_TEMPLATES,
} from "@/lib/pyodide-runner";

describe("Pyodide Quant Backtester & Vector Engine", () => {
  it("generates 375 realistic 1-minute intraday candles with valid OHLC invariants", () => {
    const niftyBars = generateIntradayCandles("NIFTY 50");
    expect(niftyBars.length).toBe(375);

    // Verify time format and OHLC consistency
    expect(niftyBars[0]!.time).toBe("09:15");
    expect(niftyBars[374]!.time).toBe("15:29");

    niftyBars.forEach((b) => {
      expect(b.high).toBeGreaterThanOrEqual(b.low);
      expect(b.high).toBeGreaterThanOrEqual(b.open);
      expect(b.high).toBeGreaterThanOrEqual(b.close);
      expect(b.low).toBeLessThanOrEqual(b.open);
      expect(b.low).toBeLessThanOrEqual(b.close);
      expect(b.volume).toBeGreaterThan(0);
    });

    const bankNiftyBars = generateIntradayCandles("BANK NIFTY");
    expect(bankNiftyBars.length).toBe(375);
    expect(bankNiftyBars[0]!.open).toBeGreaterThan(40000);
  });

  it("provides valid Python strategy templates", () => {
    const keys = Object.keys(PYTHON_STRATEGY_TEMPLATES);
    expect(keys).toContain("dual_ema");
    expect(keys).toContain("bollinger_bands");
    expect(keys).toContain("orb_breakout");
    expect(keys).toContain("vwap_reversion");

    keys.forEach((k) => {
      const template = PYTHON_STRATEGY_TEMPLATES[k]!;
      expect(template.name).toBeDefined();
      expect(template.description).toBeDefined();
      expect(template.code).toContain("def backtest");
    });
  });

  it("executes vectorized Dual EMA backtest and returns quantitative metrics", async () => {
    const dualEmaCode = PYTHON_STRATEGY_TEMPLATES["dual_ema"]!.code;
    const result = await runQuantBacktest(dualEmaCode, "NIFTY 50", "Dual EMA Trend Following");

    expect(result.strategyName).toBe("Dual EMA Trend Following");
    expect(result.symbol).toBe("NIFTY 50");
    expect(result.totalBars).toBe(375);
    expect(result.equityCurve.length).toBe(375);
    expect(result.sharpeRatio).toBeGreaterThan(0);
    expect(result.sortinoRatio).toBeGreaterThan(0);
    expect(result.maxDrawdownPct).toBeGreaterThanOrEqual(0);
    expect(result.winLossExpectancy).toBeDefined();
    expect(result.profitFactor).toBeGreaterThanOrEqual(0);
    expect(result.stdout.length).toBeGreaterThan(0);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it("executes Bollinger Bands mean reversion backtest cleanly", async () => {
    const bbCode = PYTHON_STRATEGY_TEMPLATES["bollinger_bands"]!.code;
    const result = await runQuantBacktest(bbCode, "BANK NIFTY", "Bollinger Bands Mean Reversion");

    expect(result.strategyName).toBe("Bollinger Bands Mean Reversion");
    expect(result.symbol).toBe("BANK NIFTY");
    expect(result.totalBars).toBe(375);
    expect(result.equityCurve.length).toBe(375);
    expect(result.stdout.some((line) => line.includes("Bollinger"))).toBe(true);
  });

  it("executes 15-Minute ORB breakout strategy backtest cleanly", async () => {
    const orbCode = PYTHON_STRATEGY_TEMPLATES["orb_breakout"]!.code;
    const result = await runQuantBacktest(orbCode, "NIFTY 50", "15m ORB Breakout");

    expect(result.strategyName).toBe("15m ORB Breakout");
    expect(result.totalBars).toBe(375);
    expect(result.stdout.some((line) => line.includes("Opening Range"))).toBe(true);
  });
});
