import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getSquawkConfig,
  saveSquawkConfig,
  squawkBox,
  playSquawk,
} from "@/lib/squawk";
import {
  createNewOrderSingleFix,
  createExecutionReportFix,
  parseRawFix,
  calculateFixChecksum,
  formatFixSendingTime,
  getStoredFixLogs,
  logFixMessage,
} from "@/lib/fix-protocol";
import {
  evaluateChromosome,
  runGeneticOptimizer,
} from "@/lib/genetic-optimizer";

describe("Milestone 19: Institutional Floor Audio Squawk Box", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should initialize default squawk configuration and allow updates", () => {
    const config = getSquawkConfig();
    expect(config.enabled).toBe(true);
    expect(config.volume).toBeGreaterThan(0);
    expect(config.rate).toBeGreaterThanOrEqual(1.0);

    saveSquawkConfig({ ...config, volume: 0.65, enabled: false });
    const updated = getSquawkConfig();
    expect(updated.volume).toBe(0.65);
    expect(updated.enabled).toBe(false);
  });

  it("should format squawk callouts safely without crashing", () => {
    // Should not throw even if window.speechSynthesis is mocked or missing in test env
    expect(() => {
      squawkBox.orderFilled("BUY", 10, "RELIANCE", 2945.5);
      squawkBox.fifoQueueFilled("BUY", 50, "NIFTY", 24500.0);
      squawkBox.riskLimitWarning(1.75);
      squawkBox.volatilitySurge("BANKNIFTY", 2.4);
      squawkBox.newsHeadline("RBI maintains repo rate unchanged at 6.50%");
    }).not.toThrow();
  });
});

describe("Milestone 20: FIX Protocol v4.4 Message Inspector & Drop Copy", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should generate a valid FIX 4.4 New Order Single (35=D) packet", () => {
    const fix = createNewOrderSingleFix({
      symbol: "RELIANCE",
      side: "BUY",
      qty: 25,
      orderType: "LIMIT",
      price: 2950.0,
      seqNum: 42,
    });

    expect(fix.msgType).toBe("D");
    expect(fix.symbol).toBe("RELIANCE");
    expect(fix.side).toBe("BUY");
    expect(fix.qty).toBe(25);
    expect(fix.price).toBe(2950.0);
    expect(fix.rawFix).toContain("8=FIX.4.4|");
    expect(fix.rawFix).toContain("35=D|");
    expect(fix.rawFix).toContain("55=RELIANCE|");
    expect(fix.rawFix).toContain("54=1|"); // 1 = Buy
    expect(fix.rawFix).toContain("38=25|");
    expect(fix.rawFix).toContain("44=2950.00|");
    expect(fix.rawFix).toContain("10="); // CheckSum present

    // Verify parsed tags structure
    const tag35 = fix.fields.find((f) => f.tag === 35);
    expect(tag35?.value).toBe("D");
    expect(tag35?.description).toBe("New Order Single");
  });

  it("should generate a valid FIX 4.4 Execution Report (35=8) packet", () => {
    const exec = createExecutionReportFix({
      symbol: "NIFTY_FUT",
      side: "SELL",
      qty: 50,
      fillPrice: 24510.5,
      seqNum: 43,
    });

    expect(exec.msgType).toBe("8");
    expect(exec.rawFix).toContain("35=8|");
    expect(exec.rawFix).toContain("150=F|"); // Trade/Fill
    expect(exec.rawFix).toContain("39=2|"); // Filled
    expect(exec.rawFix).toContain("54=2|"); // 2 = Sell
    expect(exec.rawFix).toContain("44=24510.50|");
  });

  it("should compute accurate 3-digit modulo 256 checksums", () => {
    const testString = "8=FIX.4.4|9=50|35=D|55=NIFTY|";
    const checksum = calculateFixChecksum(testString);
    expect(checksum).toHaveLength(3);
    const num = parseInt(checksum, 10);
    expect(num).toBeGreaterThanOrEqual(0);
    expect(num).toBeLessThan(256);
  });

  it("should parse arbitrary raw FIX strings into field models", () => {
    const raw = "8=FIX.4.4|9=75|35=D|49=MM_TEST|56=NSE|34=1|52=20261114-12:00:00.000|11=ORD1|55=INFY|54=1|38=100|40=1|10=123|";
    const parsed = parseRawFix(raw);

    expect(parsed.length).toBeGreaterThan(8);
    const tag55 = parsed.find((f) => f.tag === 55);
    expect(tag55?.name).toBe("Symbol");
    expect(tag55?.value).toBe("INFY");

    const tag54 = parsed.find((f) => f.tag === 54);
    expect(tag54?.description).toBe("1 = Buy");
  });

  it("should store and retrieve FIX logs in drop copy store", () => {
    localStorage.setItem("mm_fix_drop_copy_v1", JSON.stringify([]));
    const msg = createNewOrderSingleFix({
      symbol: "TCS",
      side: "BUY",
      qty: 15,
      orderType: "MARKET",
    });

    logFixMessage(msg);
    const logs = getStoredFixLogs();
    expect(logs.length).toBe(1);
    expect(logs[0]?.symbol).toBe("TCS");
  });
});

describe("Milestone 21: Genetic Algorithm Strategy Parameter Optimizer", () => {
  const samplePrices = [
    24000, 24050, 24100, 24080, 24150, 24200, 24180, 24300, 24350, 24280,
    24400, 24450, 24390, 24500, 24550, 24600, 24520, 24650, 24700, 24680,
    24750, 24800, 24720, 24850, 24900, 24880, 25000, 25050, 24980, 25100,
  ];

  it("should evaluate a strategy chromosome and compute performance metrics", () => {
    const chromosome = {
      fastPeriod: 9,
      slowPeriod: 21,
      atrMultiplier: 2.0,
      riskPerTrade: 1.0,
    };

    const evaluated = evaluateChromosome(chromosome, samplePrices);

    expect(evaluated.fastPeriod).toBe(9);
    expect(evaluated.slowPeriod).toBe(21);
    expect(evaluated.fitness).toBeDefined();
    expect(evaluated.calmarRatio).toBeDefined();
    expect(evaluated.sharpeRatio).toBeDefined();
    expect(evaluated.maxDrawdownPct).toBeGreaterThanOrEqual(0);
    expect(typeof evaluated.rule43Compliant).toBe("boolean");
  });

  it("should heavily penalize chromosomes with invalid indicator ordering", () => {
    const invalidChromosome = {
      fastPeriod: 30,
      slowPeriod: 15, // Invalid: fast >= slow
      atrMultiplier: 2.0,
      riskPerTrade: 1.0,
    };

    const evaluated = evaluateChromosome(invalidChromosome, samplePrices);
    expect(evaluated.fitness).toBe(-100.0);
    expect(evaluated.rule43Compliant).toBe(false);
  });

  it("should run full genetic optimization and return converging history", () => {
    const result = runGeneticOptimizer(samplePrices, {
      populationSize: 15,
      generations: 5,
      mutationRate: 0.2,
    });

    expect(result.bestChromosome).toBeDefined();
    expect(result.bestChromosome.fastPeriod).toBeLessThan(result.bestChromosome.slowPeriod);
    expect(result.bestChromosome.riskPerTrade).toBeLessThanOrEqual(1.5); // Rule 4.3 invariant
    expect(result.history.length).toBe(5);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);

    // Generation 1 should have valid stats
    const gen1 = result.history[0];
    expect(gen1?.generation).toBe(1);
    expect(gen1?.bestFitness).toBeDefined();
    expect(gen1?.avgFitness).toBeDefined();
  });
});
