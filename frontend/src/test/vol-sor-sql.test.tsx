import { describe, it, expect } from "vitest";
import {
  blackScholesPrice,
  invertImpliedVol,
  sabrImpliedVol,
  generateVolatilitySurface,
} from "@/lib/volatility-surface";
import {
  getMultiVenueQuotes,
  executeSmartOrderRouting,
  executeVwapSchedule,
  executeIcebergOrder,
} from "@/lib/smart-order-router";
import {
  executeBrowserSqlQuery,
  createParquetBinary,
  saveBacktestSession,
  deleteCachedSession,
  getCachedBacktestSessions,
  SEEDED_BACKTEST_TRADES,
} from "@/lib/offline-sql-cache";

describe("Milestone 25: 3D Options Volatility Surface & SABR Smile Model", () => {
  it("computes Black-Scholes call/put prices satisfying Put-Call Parity", () => {
    const S = 24500;
    const K = 24500; // ATM
    const T = 28 / 365; // 28 days
    const r = 0.065;
    const sigma = 0.15; // 15%

    const call = blackScholesPrice(S, K, T, r, sigma, true);
    const put = blackScholesPrice(S, K, T, r, sigma, false);

    expect(call).toBeGreaterThan(0);
    expect(put).toBeGreaterThan(0);

    // Put-Call Parity: C - P = S - K * exp(-r * T)
    const parityDiff = (call - put) - (S - K * Math.exp(-r * T));
    expect(Math.abs(parityDiff)).toBeLessThan(1e-4);
  });

  it("inverts Black-Scholes price back to exact Implied Volatility", () => {
    const S = 24500;
    const K = 24800; // OTM Call
    const T = 14 / 365;
    const r = 0.065;
    const targetSigma = 0.165; // 16.5%

    const marketPrice = blackScholesPrice(S, K, T, r, targetSigma, true);
    const solvedSigma = invertImpliedVol(marketPrice, S, K, T, r, true);

    expect(Math.abs(solvedSigma - targetSigma)).toBeLessThan(1e-3);
  });

  it("evaluates Hagan SABR model generating negative equity skew", () => {
    const forward = 24500;
    const T = 28 / 365;
    const params = { alpha: 0.15, beta: 0.7, rho: -0.4, nu: 0.45 };

    const otmPutVol = sabrImpliedVol(forward, 23500, T, params);
    const atmVol = sabrImpliedVol(forward, 24500, T, params);
    const otmCallVol = sabrImpliedVol(forward, 25500, T, params);

    expect(otmPutVol).toBeGreaterThan(0);
    expect(atmVol).toBeGreaterThan(0);
    expect(otmCallVol).toBeGreaterThan(0);
    // Negative rho implies Put Vol > Call Vol (Crash skew)
    expect(otmPutVol).toBeGreaterThan(otmCallVol);
  });

  it("generates multi-tenor volatility surface with term structure regime", () => {
    const surface = generateVolatilitySurface("NIFTY", 24500, 0.065);

    expect(surface.dteList).toEqual([7, 14, 28, 60, 90]);
    expect(surface.strikes.length).toBeGreaterThan(5);
    expect(surface.points.length).toBe(surface.dteList.length * surface.strikes.length);
    expect(surface.atmIv).toBeGreaterThan(5);
    expect(surface.putCallSkewRatio).toBeGreaterThan(1.0);
    expect(["CONTANGO", "BACKWARDATION", "FLAT"]).toContain(surface.termStructureRegime);
  });
});

describe("Milestone 26: Smart Order Routing (SOR) & Execution Slicing", () => {
  it("extracts multi-venue fragmented depth and consolidated NBBO", () => {
    const { nse, bse, nbbo } = getMultiVenueQuotes("NIFTY_FUT", 24500);

    expect(nse.venue).toBe("NSE");
    expect(bse.venue).toBe("BSE");
    expect(nse.latencyMs).toBeLessThan(bse.latencyMs); // NSE is faster
    expect(nbbo.bestBidPrice).toBeGreaterThan(0);
    expect(nbbo.bestAskPrice).toBeGreaterThan(nbbo.bestBidPrice);
    expect(nbbo.spread).toBeGreaterThanOrEqual(0.05);
  });

  it("executes Smart Order Routing with venue allocation and Implementation Shortfall", () => {
    const res = executeSmartOrderRouting(5000, "BUY", 24500, "NIFTY_FUT");

    expect(res.algoType).toBe("SOR");
    expect(res.parentQty).toBe(5000);
    expect(res.clips.length).toBe(2);
    expect(res.venueBreakdown.nseQty + res.venueBreakdown.bseQty).toBe(5000);
    expect(res.avgExecutionPrice).toBeGreaterThanOrEqual(24500);
    expect(res.implementationShortfallBps).toBeDefined();
    expect(res.sorSavingsVsSingleVenue).toBeGreaterThan(0);
  });

  it("schedules VWAP order clips matching the intraday U-shaped volume curve", () => {
    const res = executeVwapSchedule(10000, "BUY", 24500);

    expect(res.algoType).toBe("VWAP");
    expect(res.clips.length).toBe(7);
    const totalFilled = res.clips.reduce((s, c) => s + c.qty, 0);
    expect(totalFilled).toBe(10000);
    expect(res.clips[0]!.qty).toBeGreaterThan(res.clips[3]!.qty); // Open surge > lunch trough
  });

  it("slices Iceberg parent order into concealed visible clips", () => {
    const res = executeIcebergOrder(3000, 500, "BUY", 24500);

    expect(res.algoType).toBe("ICEBERG");
    expect(res.clips.length).toBe(6); // 3000 / 500
    res.clips.forEach((clip) => {
      expect(clip.qty).toBeLessThanOrEqual(500);
    });
  });
});

describe("Milestone 27: In-Browser Relational SQL Engine & Parquet Export", () => {
  it("executes relational SQL query with GROUP BY, aggregations, and sorting", () => {
    const query = "SELECT symbol, COUNT(*), SUM(pnl), AVG(pnl) FROM trades GROUP BY symbol ORDER BY SUM(pnl) DESC";
    const result = executeBrowserSqlQuery(query, SEEDED_BACKTEST_TRADES);

    expect(result.error).toBeUndefined();
    expect(result.columns).toEqual(["symbol", "COUNT(*)", "SUM(pnl)", "AVG(pnl)"]);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);

    // Verify descending order of SUM(pnl)
    const firstRowSum = Number(result.rows[0]![2]);
    const lastRowSum = Number(result.rows[result.rows.length - 1]![2]);
    expect(firstRowSum).toBeGreaterThanOrEqual(lastRowSum);
  });

  it("executes SQL WHERE filtering for Rule 4.3 loss compliance auditing", () => {
    const query = "SELECT trade_id, symbol, pnl, rule_43_compliant FROM trades WHERE pnl < 0";
    const result = executeBrowserSqlQuery(query, SEEDED_BACKTEST_TRADES);

    expect(result.error).toBeUndefined();
    expect(result.rows.length).toBeGreaterThan(0);
    result.rows.forEach((row) => {
      const pnl = Number(row[2]);
      expect(pnl).toBeLessThan(0);
    });
  });

  it("generates valid Apache Parquet binary file with PAR1 header and footer magic", () => {
    const buffer = createParquetBinary(SEEDED_BACKTEST_TRADES);

    expect(buffer.length).toBeGreaterThan(50);
    // Header magic: 'PAR1'
    expect(buffer[0]).toBe(0x50); // P
    expect(buffer[1]).toBe(0x41); // A
    expect(buffer[2]).toBe(0x52); // R
    expect(buffer[3]).toBe(0x31); // 1

    // Footer magic: 'PAR1'
    const len = buffer.length;
    expect(buffer[len - 4]).toBe(0x50);
    expect(buffer[len - 3]).toBe(0x41);
    expect(buffer[len - 2]).toBe(0x52);
    expect(buffer[len - 1]).toBe(0x31);
  });

  it("manages session cache snapshot persistence", () => {
    const initialCount = getCachedBacktestSessions().length;
    const session = saveBacktestSession({
      name: "Test Evolved Dual EMA",
      symbol: "NIFTY_FUT",
      fastEma: 12,
      slowEma: 26,
      sharpe: 2.05,
      calmar: 3.10,
      totalPnl: 145000,
      winRate: 66.7,
    });

    expect(session.cacheId).toMatch(/^CACHE-/);
    const afterAdd = getCachedBacktestSessions();
    expect(afterAdd.length).toBe(initialCount + 1);

    deleteCachedSession(session.cacheId);
    const afterDelete = getCachedBacktestSessions();
    expect(afterDelete.length).toBe(initialCount);
  });
});
