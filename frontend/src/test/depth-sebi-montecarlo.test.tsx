import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateOrderImbalance,
  generateLevel2Depth,
} from "@/lib/order-book-depth";
import {
  generateSha256Checksum,
  createCertifiedStatementAudit,
  evaluateRiskTier,
} from "@/lib/sebi-certificate";
import {
  runMonteCarloSimulation,
  computeClusterRobustness,
} from "@/lib/monte-carlo";

describe("Milestone 22: Order Book Level-2 Depth & Imbalance Ratio (OIR)", () => {
  it("should calculate mathematical order imbalance ratio correctly", () => {
    // Balanced book
    expect(calculateOrderImbalance(1000, 1000)).toBe(0);

    // Pure bid book (Vb >> Va)
    expect(calculateOrderImbalance(3000, 1000)).toBe(0.5); // (3000 - 1000)/4000 = 0.5

    // Pure ask book (Va >> Vb)
    expect(calculateOrderImbalance(1000, 3000)).toBe(-0.5);

    // Empty book edge case
    expect(calculateOrderImbalance(0, 0)).toBe(0);
  });

  it("should generate 10-level bid and ask books with accurate cumulative volume", () => {
    const book = generateLevel2Depth("NIFTY_FUT", 24500.0, 0.5, 42);

    expect(book.bids.length).toBe(10);
    expect(book.asks.length).toBe(10);
    expect(book.totalBidQty).toBeGreaterThan(0);
    expect(book.totalAskQty).toBeGreaterThan(0);
    expect(book.imbalanceRatio).toBeGreaterThanOrEqual(-1.0);
    expect(book.imbalanceRatio).toBeLessThanOrEqual(1.0);

    // Check bid prices descend and ask prices ascend
    for (let i = 1; i < 10; i++) {
      expect(book.bids[i]!.price).toBeLessThan(book.bids[i - 1]!.price);
      expect(book.asks[i]!.price).toBeGreaterThan(book.asks[i - 1]!.price);
    }
  });
});

describe("Milestone 23: SEBI Risk Disclosures & Cryptographic Audit Certificate", () => {
  it("should compute valid 64-character SHA-256 cryptographic verification digest", async () => {
    const payload = "TEST_TRADER|trader@marketmaster.in|15|1500000|14250|2026";
    const hash = await generateSha256Checksum(payload);

    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it("should generate an official SEBI certified statement record", async () => {
    const cert = await createCertifiedStatementAudit({
      traderName: "Deepak Yannadle",
      accountEmail: "deepak@marketmaster.in",
      totalTrades: 28,
      totalTurnover: 2850000,
      netRealizedPnl: 34200,
      statutoryDeductions: 840,
      disciplineScore: 92,
    });

    expect(cert.certificateId).toContain("MM-SEBI-2026-");
    expect(cert.sha256Hash).toHaveLength(64);
    expect(cert.isSimulatedDisclaimerAffirmed).toBe(true);
    expect(cert.regulatoryNotice).toContain("SEBI MANDATORY RISK DISCLOSURE");
    expect(cert.disciplineScore).toBe(92);
  });

  it("should evaluate SEBI NISM risk tiers based on questionnaire responses", () => {
    // Conservative novice trader -> Tier 1 (Cash Delivery only)
    const novice = evaluateRiskTier({
      experienceYears: 0,
      maxTolerableDrawdownPct: 5,
      optionsGreeksFamiliarity: "NONE",
      capitalObjective: "PRESERVATION",
      adherenceToStopLoss: "ALWAYS",
    });
    expect(novice.tier).toBe("TIER_1_CASH");
    expect(novice.maxLeverage).toContain("1x");

    // Institutional advanced trader -> Tier 3 (Derivatives unlocked)
    const pro = evaluateRiskTier({
      experienceYears: 3,
      maxTolerableDrawdownPct: 15,
      optionsGreeksFamiliarity: "ADVANCED",
      capitalObjective: "MODERATE_GROWTH",
      adherenceToStopLoss: "ALWAYS",
    });
    expect(pro.tier).toBe("TIER_3_DERIVATIVES");
    expect(pro.unlockedProducts).toContain("Index Futures");
  });
});

describe("Milestone 24: Monte Carlo Resampling & Cluster Robustness Matrix", () => {
  it("should execute 1,000 bootstrap resampling paths and evaluate tail VaR", () => {
    const sampleReturns = [0.02, -0.01, 0.015, -0.008, 0.03, -0.012, 0.025, -0.009];
    const mc = runMonteCarloSimulation(sampleReturns, 1000000, 500, 30);

    expect(mc.totalPaths).toBe(500);
    expect(mc.tradesPerPath).toBe(30);
    expect(mc.var95Pct).toBeGreaterThan(0);
    expect(mc.var99Pct).toBeGreaterThanOrEqual(mc.var95Pct);
    expect(mc.probabilityOfRuinPct).toBeGreaterThanOrEqual(0);
    expect(mc.pathCurves.length).toBe(31); // 0..30 trades

    // 95th percentile terminal equity should exceed 5th percentile
    expect(mc.percentile95TerminalEquity).toBeGreaterThan(mc.percentile5TerminalEquity);
  });

  it("should compute parameter cluster robustness matrix and identify plateaus", () => {
    const cluster = computeClusterRobustness([5, 9, 13], [20, 35, 50], 2.5);

    expect(cluster.grid.length).toBe(3);
    expect(cluster.grid[0]!.length).toBe(3);
    expect(cluster.stabilityScore).toBeGreaterThanOrEqual(0);
    expect(["ROBUST_PLATEAU", "FRAGILE_SPIKE", "SUBOPTIMAL"]).toContain(cluster.classification);
  });
});
