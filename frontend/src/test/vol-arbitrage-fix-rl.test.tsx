// Tests for Milestones 37, 38, and 39
// Real-Time Options IV Surface Arbitrage Scanner, Level-3 FIX Drop-Copy Replay & RL Trading Agent Arena

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  bsCallPrice,
  VolatilitySurfaceInterpolator,
  detectButterflyArbitrage,
  detectCalendarArbitrage,
  runVolatilityArbitrageAnalysis,
  generateMarketOptionQuotes,
  OptionQuote,
} from "../lib/volatility-arbitrage";
import {
  calculateFixChecksum,
  serializeFixMessage,
  computeFixStreamHash,
  Level3BookReconstructor,
  generateInitialFixStream,
  generateNextFixTick,
  generateSebiDropCopyAuditJson,
} from "../lib/fix-level3-stream";
import {
  encodeState,
  decodeState,
  QLearningAgent,
  generateRlMarketData,
} from "../lib/rl-trading-agent";
import { VolatilityArbitrageScanner } from "../components/trading/VolatilityArbitrageScanner";
import { FixLevel3ReplayPanel } from "../components/trading/FixLevel3ReplayPanel";
import { RlTradingAgentArena } from "../components/trading/RlTradingAgentArena";

describe("Milestone 37: Volatility Surface Interpolator & Arbitrage Scanner", () => {
  it("calculates Black-Scholes call prices with proper asymptotic limits", () => {
    const spot = 24200;
    const strikeAtm = 24200;
    const strikeOtm = 24600;
    const t = 30 / 365;
    const r = 0.065;
    const vol = 0.15;

    const callAtm = bsCallPrice(spot, strikeAtm, t, r, vol);
    const callOtm = bsCallPrice(spot, strikeOtm, t, r, vol);

    expect(callAtm).toBeGreaterThan(150);
    expect(callAtm).toBeGreaterThan(callOtm); // Call price monotonically decreases with strike
    expect(bsCallPrice(spot, 25000, 0, r, vol)).toBe(0); // At expiration, OTM call is 0
  });

  it("interpolates implied volatility using thin-plate spline RBF", () => {
    const spot = 24200;
    const interpolator = new VolatilitySurfaceInterpolator(spot);

    const quotes = [
      { strike: 23800, dte: 14, iv: 17.5 },
      { strike: 24000, dte: 14, iv: 15.5 },
      { strike: 24200, dte: 14, iv: 14.5 },
      { strike: 24400, dte: 14, iv: 13.8 },
      { strike: 24600, dte: 14, iv: 13.2 },
    ];

    interpolator.fit(quotes);
    const predAtm = interpolator.predictIV(24200, 14);
    const predOtm = interpolator.predictIV(24500, 14);

    expect(predAtm).toBeGreaterThan(10.0);
    expect(predAtm).toBeLessThan(25.0);
    expect(predOtm).toBeGreaterThan(5.0);
  });

  it("detects butterfly (strike convexity) arbitrage violations", () => {
    const quotes: OptionQuote[] = [
      {
        strike: 24100,
        dte: 7,
        expiryLabel: "7D",
        marketCallPrice: 180.0,
        marketPutPrice: 40.0,
        marketCallIv: 16.0,
        marketPutIv: 16.0,
        volume: 1000,
        openInterest: 5000,
      },
      {
        strike: 24200,
        dte: 7,
        expiryLabel: "7D",
        marketCallPrice: 120.0, // Middle strike artificially high -> Fly cost: 180 + 50 - 2*120 = -10 (negative butterfly!)
        marketPutPrice: 70.0,
        marketCallIv: 18.0,
        marketPutIv: 18.0,
        volume: 2000,
        openInterest: 10000,
      },
      {
        strike: 24300,
        dte: 7,
        expiryLabel: "7D",
        marketCallPrice: 50.0,
        marketPutPrice: 120.0,
        marketCallIv: 15.5,
        marketPutIv: 15.5,
        volume: 1500,
        openInterest: 8000,
      },
    ];

    const violations = detectButterflyArbitrage(quotes, "NIFTY");
    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations[0]!.type).toBe("BUTTERFLY_ARBITRAGE");
    expect(violations[0]!.marketCost).toBeLessThan(0); // Net credit
    expect(violations[0]!.guaranteedProfit).toBeGreaterThan(0);
    expect(violations[0]!.legs.length).toBe(3);
  });

  it("detects calendar spread maturity inversions", () => {
    const quotes: OptionQuote[] = [
      {
        strike: 24200,
        dte: 7,
        expiryLabel: "7D",
        marketCallPrice: 150.0, // 7D costs more than 14D
        marketPutPrice: 50.0,
        marketCallIv: 18.0,
        marketPutIv: 18.0,
        volume: 1000,
        openInterest: 5000,
      },
      {
        strike: 24200,
        dte: 14,
        expiryLabel: "14D",
        marketCallPrice: 135.0, // Inversion!
        marketPutPrice: 60.0,
        marketCallIv: 15.0,
        marketPutIv: 15.0,
        volume: 1000,
        openInterest: 5000,
      },
    ];

    const violations = detectCalendarArbitrage(quotes, "NIFTY");
    expect(violations.length).toBe(1);
    expect(violations[0]!.type).toBe("CALENDAR_ARBITRAGE");
    expect(violations[0]!.guaranteedProfit).toBe(15.0 * 50);
  });

  it("generates comprehensive volatility arbitrage report", () => {
    const quotes = generateMarketOptionQuotes(24200);
    const report = runVolatilityArbitrageAnalysis("NIFTY", 24200, quotes);

    expect(report.symbol).toBe("NIFTY");
    expect(report.quoteCount).toBeGreaterThan(10);
    expect(report.surfaceGrid.length).toBe(report.quoteCount);
    expect(report.surfaceSmoothingRmse).toBeGreaterThan(0);
  });
});

describe("Milestone 38: Level-3 FIX Drop-Copy Replay & Book Reconstructor", () => {
  it("calculates standard 3-digit FIX checksum correctly", () => {
    const sample = "8=FIX.4.4\x019=42\x0135=D\x01";
    const chk = calculateFixChecksum(sample);
    expect(chk).toHaveLength(3);
    expect(Number(chk)).toBeGreaterThanOrEqual(0);
    expect(Number(chk)).toBeLessThan(256);
  });

  it("serializes valid FIX 4.4 strings with header and checksum", () => {
    const raw = serializeFixMessage({
      35: "D",
      34: 1,
      55: "NIFTY",
      54: "1",
      38: 100,
      44: 24200.0,
    });

    expect(raw).toContain("8=FIX.4.4\x01");
    expect(raw).toContain("35=D\x01");
    expect(raw).toContain("10=");
  });

  it("computes deterministic rolling SHA-256 stream hash chain", () => {
    const hash1 = computeFixStreamHash("00000000", 1, "MSG_1");
    const hash2 = computeFixStreamHash(hash1, 2, "MSG_2");
    expect(hash1).toHaveLength(32);
    expect(hash2).toHaveLength(32);
    expect(hash1).not.toBe(hash2);
  });

  it("reconstructs matching engine Level-3 / Level-2 order book accurately", () => {
    const recon = new Level3BookReconstructor("NIFTY");
    const initialStream = generateInitialFixStream("NIFTY", 24200.0);

    initialStream.forEach((msg) => recon.applyFixMessage(msg));
    const snapshot = recon.getSnapshot();

    expect(snapshot.symbol).toBe("NIFTY");
    expect(snapshot.bids.length).toBeGreaterThan(0);
    expect(snapshot.asks.length).toBeGreaterThan(0);
    expect(snapshot.spread).toBeGreaterThanOrEqual(0);
    expect(snapshot.midPrice).toBeGreaterThan(24000);
  });

  it("exports SEBI Form TR-8 Drop-Copy audit certificate", () => {
    const stream = generateInitialFixStream("NIFTY", 24200.0);
    const cert = generateSebiDropCopyAuditJson(stream, "NIFTY");

    expect(cert.sebiForm).toBe("SEBI Schedule V Form TR-8");
    expect(cert.totalMessagesProcessed).toBe(stream.length);
    expect(cert.complianceStatus).toBe("VERIFIED_AUDITABLE");
    expect(cert.finalStreamHashSha256).toHaveLength(32);
  });
});

describe("Milestone 39: Reinforcement Learning (RL) Trading Agent Arena", () => {
  it("encodes and decodes discrete state space [0 .. 89]", () => {
    const s1 = encodeState(25, 24200, 24100, 0.015, "LONG"); // Oversold (<30) + Weak Up + High Vol + Long
    expect(s1).toBeGreaterThanOrEqual(0);
    expect(s1).toBeLessThan(90);

    const decoded = decodeState(s1);
    expect(decoded.rsiZone).toBe("OVERSOLD");
    expect(decoded.position).toBe("LONG");
    expect(decoded.volatility).toBe("HIGH_VOL");
  });

  it("enforces Rule 4.3 severe penalty when drawdown breaches 1.5%", () => {
    const agent = new QLearningAgent({}, { drawdownWeight: 3.0 });

    const normalReward = agent.computeReward(0.005, "LONG", "LONG", 0.5); // 0.5% DD <= 1.5% limit
    const breachReward = agent.computeReward(0.005, "LONG", "LONG", 3.0); // 3.0% DD > 1.5% limit (excess 1.5%)

    expect(breachReward).toBeLessThan(normalReward);
    expect(normalReward - breachReward).toBeGreaterThan(5.0); // Significant penalty applied
  });

  it("trains RL agent and evaluates benchmark comparison", () => {
    const trainData = generateRlMarketData(100, 24200);
    const testData = generateRlMarketData(80, 24300);

    const agent = new QLearningAgent({ episodes: 15, learningRate: 0.15 });
    const history = agent.train(trainData);

    expect(history.length).toBe(15);
    expect(history[0]!.episode).toBe(1);

    const evals = agent.evaluate(testData);
    expect(evals.length).toBe(3);
    const agentEval = evals.find((e) => e.modelName === "RL_AGENT");
    expect(agentEval).toBeDefined();
    expect(agentEval!.equityCurve.length).toBe(testData.length - 1);
  });
});

describe("UI Components Smoke Rendering", () => {
  it("renders VolatilityArbitrageScanner component cleanly", () => {
    render(<VolatilityArbitrageScanner />);
    expect(screen.getByText(/IV Surface Interpolator & Volatility Arbitrage Scanner/i)).toBeInTheDocument();
  });

  it("renders FixLevel3ReplayPanel component cleanly", () => {
    render(<FixLevel3ReplayPanel />);
    expect(screen.getByText(/Level-3 FIX Drop-Copy Replay/i)).toBeInTheDocument();
  });

  it("renders RlTradingAgentArena component cleanly", () => {
    render(<RlTradingAgentArena />);
    expect(screen.getByText(/Reinforcement Learning \(RL\) Trading Agent Arena/i)).toBeInTheDocument();
  });
});
