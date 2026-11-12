import { describe, it, expect } from "vitest";
import {
  advanceFifoQueueTick,
  computeLatencyJitter,
  createFifoLimitOrder,
  getCatalystsForPreset,
} from "@/lib/microstructure";

describe("Option 3: Level-3 FIFO Queue Priority & News Catalyst Overlay", () => {
  it("calculates execution latency jitter within the realistic 5ms–50ms bounds", () => {
    const calmJitter = computeLatencyJitter(false, 0.42);
    expect(calmJitter).toBeGreaterThanOrEqual(5);
    expect(calmJitter).toBeLessThanOrEqual(50);

    const volatileJitter = computeLatencyJitter(true, 0.88);
    expect(volatileJitter).toBeGreaterThanOrEqual(20);
    expect(volatileJitter).toBeLessThanOrEqual(50);
  });

  it("queues Level-3 FIFO limit orders and fills them only after preceding depth volume is consumed", () => {
    const order = createFifoLimitOrder({
      symbol: "NIFTY_FUT",
      side: "BUY",
      qty: 50,
      limitPrice: 24400,
      depthAhead: 300,
    });
    expect(order.status).toBe("QUEUED");
    expect(order.queueAhead).toBe(300);

    // Tick 1: Near top-of-book, partial queue reduction
    const tick1 = advanceFifoQueueTick([order], 24405, 100);
    expect(tick1.newlyFilled.length).toBe(0);
    expect(tick1.updated[0]!.queueAhead).toBeLessThan(300);
    expect(tick1.updated[0]!.status).toBe("QUEUED");

    // Tick 2: Aggressive tape cross draining remaining queue
    const tick2 = advanceFifoQueueTick(tick1.updated, 24395, 250);
    expect(tick2.newlyFilled.length).toBe(1);
    expect(tick2.updated[0]!.status).toBe("FILLED");
    expect(tick2.updated[0]!.queueAhead).toBe(0);
  });

  it("masks macro news catalyst headlines and surprise metrics in Blind Practice mode", () => {
    const revealed = getCatalystsForPreset("COVID_CRASH_2020", false);
    expect(revealed.length).toBeGreaterThan(0);
    expect(revealed[0]!.headline).toContain("Lockdown");
    expect(revealed[0]!.surprise).toContain("Circuit");

    const blind = getCatalystsForPreset("COVID_CRASH_2020", true);
    expect(blind[0]!.headline).toContain("Masked in Blind Mode");
    expect(blind[0]!.surprise).toBe("Hidden in Blind Mode");
  });
});
