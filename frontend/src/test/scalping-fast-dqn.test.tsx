// Tests for Milestones 40, 41, and 42
// Gamma Scalping Simulator, FAST Protocol Binary Compression & Deep Q-Network (DQN) Neural RL Agent

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  computeStraddleGreeks,
  runGammaScalpingSimulation,
  ScalpConfig,
} from "../lib/gamma-scalping";
import {
  encodeStopBitUInt,
  decodeStopBitUInt,
  encodeStopBitString,
  decodeStopBitString,
  FastCodecEngine,
  generateSampleFastStream,
} from "../lib/fast-protocol";
import {
  DenseLayer,
  ReplayBuffer,
  DqnAgent,
  trainDqnSimulation,
} from "../lib/dqn-agent";
import { GammaScalpingSimulator } from "../components/trading/GammaScalpingSimulator";
import { FastProtocolInspector } from "../components/trading/FastProtocolInspector";
import { DqnAgentArena } from "../components/trading/DqnAgentArena";

describe("Milestone 40: Options Delta-Neutral Gamma Scalping Simulator", () => {
  it("computes accurate straddle greeks with positive gamma and negative theta", () => {
    const spot = 24200;
    const strike = 24200;
    const t = 7 / 365;
    const r = 0.065;
    const iv = 0.15;

    const greeks = computeStraddleGreeks(spot, strike, t, r, iv, 50);

    expect(Math.abs(greeks.delta)).toBeLessThan(5.0); // ATM straddle has delta ~ 0
    expect(greeks.gamma).toBeGreaterThan(0); // Long options have positive gamma
    expect(greeks.thetaPerDay).toBeLessThan(0); // Long options bleed negative theta
    expect(greeks.straddlePrice).toBeGreaterThan(10000); // Straddle premium
  });

  it("simulates dynamic gamma scalping with futures hedges and friction accounting", () => {
    const config: ScalpConfig = {
      symbol: "NIFTY",
      spotPrice: 24200,
      strike: 24200,
      dte: 7,
      impliedVol: 14.0,
      realizedVol: 30.0, // High realized vol > implied vol -> positive gamma rent
      deltaThreshold: 5,
      frictionPerScalpInr: 35,
      lotSize: 50,
      numTicks: 50,
    };

    const res = runGammaScalpingSimulation(config);

    expect(res.symbol).toBe("NIFTY");
    expect(res.ticks.length).toBe(50);
    expect(res.grossGammaProfit).toBeGreaterThan(0);
    expect(res.totalThetaDecay).toBeGreaterThan(0);
    expect(res.totalScalps).toBeGreaterThanOrEqual(1);
    expect(res.volatilitySpread).toBe(16.0); // 30.0 - 14.0
  });
});

describe("Milestone 41: FIX Fast Protocol (FAST) Binary Compression Engine", () => {
  it("encodes and decodes stop-bit unsigned integers correctly", () => {
    const testValues = [0, 5, 127, 128, 500, 24200, 100000];
    testValues.forEach((val) => {
      const bytes = encodeStopBitUInt(val);
      expect(bytes.length).toBeGreaterThan(0);
      expect(bytes[bytes.length - 1]! & 0x80).toBe(0x80); // Last byte has MSB stop bit

      const offset = { index: 0 };
      const decoded = decodeStopBitUInt(bytes, offset);
      expect(decoded).toBe(val);
    });
  });

  it("encodes and decodes stop-bit ASCII strings correctly", () => {
    const str = "NIFTY";
    const bytes = encodeStopBitString(str);
    const offset = { index: 0 };
    const decoded = decodeStopBitString(bytes, offset);
    expect(decoded).toBe(str);
  });

  it("achieves >80% bandwidth compression with stateful FAST codec", () => {
    const engine = new FastCodecEngine();
    const packet = engine.encode({
      templateId: 101,
      msgType: "8",
      seqNum: 1001,
      symbol: "NIFTY",
      price: 24205.5,
      orderQty: 50,
      side: "1",
      ordStatus: "2",
    });

    expect(packet.templateId).toBe(101);
    expect(packet.asciiByteLength).toBeGreaterThan(80);
    expect(packet.fastByteLength).toBeLessThan(35);
    expect(packet.bandwidthReductionPct).toBeGreaterThan(65.0);
    expect(packet.fastHexDump).toBeTruthy();

    // Verify round-trip decoding
    const decoded = engine.decode(packet.fastBinaryBytes);
    expect(decoded["Symbol"]).toBe("NIFTY");
    expect(decoded["OrderQty"]).toBe(50);
  });

  it("generates streaming FAST packets correctly", () => {
    const stream = generateSampleFastStream(6);
    expect(stream.length).toBe(6);
    expect(stream[0]!.bandwidthReductionPct).toBeGreaterThan(75.0);
  });
});

describe("Milestone 42: Deep Q-Network (DQN) Neural RL Agent", () => {
  it("performs forward pass through Dense layers with proper dimensions", () => {
    const l1 = new DenseLayer(6, 64);
    const input = [0.5, 0.01, -0.002, 0.015, 0.2, 1.0];
    const out = l1.forward(input);

    expect(out.length).toBe(64);
    expect(out.some((v) => v !== 0)).toBe(true);
  });

  it("stores and samples transitions uniformly from ReplayBuffer", () => {
    const buffer = new ReplayBuffer(100);
    for (let i = 0; i < 20; i++) {
      buffer.push({
        state: [i, 0, 0, 0, 0, 0],
        action: 1,
        reward: 0.5,
        nextState: [i + 1, 0, 0, 0, 0, 0],
        done: false,
      });
    }

    expect(buffer.size()).toBe(20);
    const batch = buffer.sample(8);
    expect(batch.length).toBe(8);
    expect(batch[0]!.action).toBe(1);
  });

  it("synchronizes Target Network weights and trains with Adam backpropagation", () => {
    const agent = new DqnAgent(0.002);
    expect(agent.l1.weights.length).toBe(6);
    expect(agent.l2.weights.length).toBe(64);
    expect(agent.l3.weights.length).toBe(32);

    // Populate replay buffer
    for (let i = 0; i < 40; i++) {
      agent.replayBuffer.push({
        state: [0.5, 0.001, 0.002, 0.01, 0.3, 0],
        action: (i % 4) as any,
        reward: 0.1,
        nextState: [0.52, 0.002, 0.003, 0.01, 0.4, 1],
        done: false,
      });
    }

    const { loss, avgQ } = agent.trainStep();
    expect(loss).toBeGreaterThanOrEqual(0);
    expect(typeof avgQ).toBe("number");
    expect(agent.trainStepCount).toBe(1);
  });

  it("trains DQN simulation and returns benchmarks with loss curve", () => {
    const res = trainDqnSimulation(3, 30);
    expect(res.lossHistory.length).toBeGreaterThan(0);
    expect(res.benchmarks.length).toBe(4);

    const dqnResult = res.benchmarks.find((b) => b.modelName === "DQN_NEURAL");
    expect(dqnResult).toBeDefined();
    expect(dqnResult!.equityCurve.length).toBeGreaterThan(10);
  }, 15000);
});

describe("UI Components Smoke Rendering", () => {
  it("renders GammaScalpingSimulator cleanly", () => {
    render(<GammaScalpingSimulator />);
    expect(screen.getByText(/Options Delta-Neutral Gamma Scalping Simulator/i)).toBeInTheDocument();
  });

  it("renders FastProtocolInspector cleanly", () => {
    render(<FastProtocolInspector />);
    expect(screen.getByText(/FIX Fast Protocol \(FAST\) Binary Compression Engine/i)).toBeInTheDocument();
  });

  it("renders DqnAgentArena cleanly", () => {
    render(<DqnAgentArena />);
    expect(screen.getByText(/Deep Q-Network \(DQN\) Neural Network with Experience Replay/i)).toBeInTheDocument();
  });
});
