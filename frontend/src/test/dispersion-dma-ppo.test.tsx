import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

// Mock resize observer for Recharts
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// 1. Dispersion Engine Imports
import {
  calculateAtmStraddleMetrics,
  calculateImpliedCorrelation,
  buildDispersionState,
  runDispersionSimulation,
  DEFAULT_NIFTY_CONSTITUENTS,
} from "../lib/options-dispersion";

// 2. DMA Protocols Imports
import {
  encodeItchAddOrder,
  decodeItchAddOrder,
  encodeOuchEnterOrder,
  decodeOuchEnterOrder,
  formatHexDump,
  generateSyntheticDmaStream,
  computeLatencyTelemetry,
  ItchAddOrderMsg,
  OuchEnterOrderMsg,
} from "../lib/dma-protocols";

// 3. PPO Continuous Agent Imports
import {
  ActorNetwork,
  CriticNetwork,
  computeGae,
  trainPpoAgentSimulation,
  PpoTransition,
} from "../lib/ppo-agent";

// 4. UI Components
import { OptionsDispersionPanel } from "../components/trading/OptionsDispersionPanel";
import { DmaProtocolsInspector } from "../components/trading/DmaProtocolsInspector";
import { PpoAgentArena } from "../components/trading/PpoAgentArena";

describe("Milestone 43: Options Dispersion & Correlation Arbitrage Engine", () => {
  it("computes Black-Scholes ATM straddle price, gamma, vega, and theta", () => {
    const metrics = calculateAtmStraddleMetrics(24500, 0.16, 30);
    expect(metrics.straddlePrice).toBeGreaterThan(100);
    expect(metrics.gamma).toBeGreaterThan(0);
    expect(metrics.vega).toBeGreaterThan(0);
    expect(metrics.theta).toBeGreaterThan(0);
  });

  it("extracts implied correlation using the equicorrelation formula and bounds it correctly", () => {
    const rho = calculateImpliedCorrelation(0.165, DEFAULT_NIFTY_CONSTITUENTS);
    expect(rho).toBeGreaterThanOrEqual(0.05);
    expect(rho).toBeLessThanOrEqual(0.95);
  });

  it("builds dispersion state and generates appropriate trade recommendation", () => {
    // Overpriced index options should recommend Long Dispersion
    const stateLong = buildDispersionState(24500, 0.22, 0.35, 0.05);
    expect(stateLong.impliedCorrelation).toBeGreaterThan(stateLong.realizedCorrelation);
    expect(stateLong.tradeRecommendation).toBe("LONG_DISPERSION");

    // Underpriced index options should recommend Short Dispersion
    const stateShort = buildDispersionState(24500, 0.12, 0.65, 0.05);
    expect(stateShort.correlationSpread).toBeLessThan(0);
    expect(stateShort.tradeRecommendation).toBe("SHORT_DISPERSION");
  });

  it("runs multi-day dispersion backtest and checks Rule 4.3 drawdown enforcement", () => {
    const state = buildDispersionState(24500, 0.165, 0.42, 0.08);
    const report = runDispersionSimulation(state, 15, 1000000);
    expect(report.steps.length).toBe(15);
    expect(typeof report.totalPnL).toBe("number");
    expect(typeof report.maxDrawdownPct).toBe("number");
    expect(typeof report.rule43Compliant).toBe("boolean");
    expect(report.gammaRentAttribution).not.toBeNaN();
    expect(report.thetaBleedAttribution).not.toBeNaN();
  });
});

describe("Milestone 44: ITCH 5.0 & OUCH 4.2 DMA Protocols Engine", () => {
  it("encodes and decodes ITCH 5.0 Add Order message ('A') through binary big-endian buffer", () => {
    const origMsg: ItchAddOrderMsg = {
      type: "A",
      stockLocate: 4,
      trackingNumber: 101,
      timestampNs: 34200123456789n,
      orderRefNumber: 99887766n,
      buySell: "B",
      shares: 250,
      symbol: "RELIANCE",
      price: 2980.5,
    };

    const encoded = encodeItchAddOrder(origMsg);
    expect(encoded.length).toBe(38);
    expect(encoded[0]).toBe(0x41); // 'A'

    const decoded = decodeItchAddOrder(encoded);
    expect(decoded.type).toBe("A");
    expect(decoded.stockLocate).toBe(4);
    expect(decoded.trackingNumber).toBe(101);
    expect(decoded.timestampNs).toBe(34200123456789n);
    expect(decoded.orderRefNumber).toBe(99887766n);
    expect(decoded.buySell).toBe("B");
    expect(decoded.shares).toBe(250);
    expect(decoded.symbol).toBe("RELIANCE");
    expect(decoded.price).toBeCloseTo(2980.5, 2);
  });

  it("encodes and decodes OUCH 4.2 Enter Order message ('O')", () => {
    const origOuch: OuchEnterOrderMsg = {
      type: "O",
      orderToken: "ORD12345678901",
      buySell: "S",
      shares: 100,
      symbol: "NIFTY",
      price: 24520.75,
      timeInForce: 99999,
      firm: "MMTR",
    };

    const encoded = encodeOuchEnterOrder(origOuch);
    expect(encoded.length).toBe(48);
    expect(encoded[0]).toBe(0x4f); // 'O'

    const decoded = decodeOuchEnterOrder(encoded);
    expect(decoded.type).toBe("O");
    expect(decoded.orderToken).toBe("ORD12345678901");
    expect(decoded.buySell).toBe("S");
    expect(decoded.shares).toBe(100);
    expect(decoded.symbol).toBe("NIFTY");
    expect(decoded.price).toBeCloseTo(24520.75, 2);
    expect(decoded.firm).toBe("MMTR");
  });

  it("generates hex dump with offsets and ASCII display", () => {
    const bytes = new Uint8Array([0x41, 0x00, 0x01, 0x4e, 0x49, 0x46, 0x54, 0x59]);
    const dump = formatHexDump(bytes);
    expect(dump).toContain("0000");
    expect(dump).toContain("41 00 01 4E 49 46 54 59");
    expect(dump).toContain("|A..NIFTY|");
  });

  it("generates synthetic DMA stream and calculates sub-microsecond latency telemetry", () => {
    const stream = generateSyntheticDmaStream(10);
    expect(stream.length).toBe(20); // 10 ITCH + 10 OUCH

    const telemetry = computeLatencyTelemetry(stream);
    expect(telemetry.sampleCount).toBe(10);
    expect(telemetry.minNs).toBeGreaterThan(0);
    expect(telemetry.p50Ns).toBeGreaterThan(0);
    expect(telemetry.bins.length).toBe(5);
  });
});

describe("Milestone 45: Proximal Policy Optimization (PPO) Continuous Agent", () => {
  it("initializes Actor and Critic networks and performs continuous forward inference", () => {
    const actor = new ActorNetwork(6);
    const critic = new CriticNetwork(6);

    const state = [0.05, 0.2, -0.1, 1.2, 0.4, 0.0];
    const value = critic.forward(state);
    expect(typeof value).toBe("number");

    const { action, logProb, mu, sigma } = actor.sampleAction(state);
    expect(action).toBeGreaterThanOrEqual(-1.0);
    expect(action).toBeLessThanOrEqual(1.0);
    expect(mu).toBeGreaterThanOrEqual(-1.0);
    expect(mu).toBeLessThanOrEqual(1.0);
    expect(sigma).toBeGreaterThan(0);
    expect(typeof logProb).toBe("number");
  });

  it("computes Generalized Advantage Estimation (GAE) across transitions", () => {
    const transitions: PpoTransition[] = [
      {
        state: [0, 0, 0, 1, 0, 0],
        action: 0.5,
        reward: 1.0,
        nextState: [0, 0, 0, 1, 0, 0.5],
        done: false,
        logProb: -0.8,
        value: 0.2,
      },
      {
        state: [0, 0, 0, 1, 0, 0.5],
        action: -0.2,
        reward: 0.5,
        nextState: [0, 0, 0, 1, 0, -0.2],
        done: true,
        logProb: -0.7,
        value: 0.4,
      },
    ];

    computeGae(transitions, 0.99, 0.95);
    expect(transitions[0]!.advantage).toBeDefined();
    expect(transitions[0]!.returnTarget).toBeDefined();
  });

  it("trains lightweight PPO simulation and evaluates against benchmarks", () => {
    const report = trainPpoAgentSimulation(2, 20);
    expect(report.trainingMetrics.length).toBe(2);
    expect(report.equitySeries.length).toBe(30);
    expect(typeof report.ppoFinalEquity).toBe("number");
    expect(typeof report.ppoReturnPct).toBe("number");
    expect(typeof report.ppoRule43Compliant).toBe("boolean");
  });
});

describe("UI Components Mounting Tests", () => {
  it("renders OptionsDispersionPanel correctly", () => {
    const { container } = render(<OptionsDispersionPanel />);
    expect(container).toBeTruthy();
    expect(screen.getByText(/Options Dispersion & Implied Correlation Arbitrage Engine/i)).toBeTruthy();
    expect(screen.getAllByText(/Constituent/i).length).toBeGreaterThan(0);
  });

  it("renders DmaProtocolsInspector correctly", () => {
    const { container } = render(<DmaProtocolsInspector />);
    expect(container).toBeTruthy();
    expect(screen.getByText(/ITCH 5.0 & OUCH 4.2 Direct Market Access/i)).toBeTruthy();
    expect(screen.getByText(/Live DMA Stream Feed/i)).toBeTruthy();
  });

  it("renders PpoAgentArena correctly", () => {
    const { container } = render(<PpoAgentArena />);
    expect(container).toBeTruthy();
    expect(screen.getByText(/Proximal Policy Optimization \(PPO\) Continuous RL Agent Arena/i)).toBeTruthy();
    expect(screen.getByText(/Retrain Continuous PPO Agent/i)).toBeTruthy();
  });
});
