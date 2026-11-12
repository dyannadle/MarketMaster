/**
 * Market Microstructure Engine:
 * 1. Level-3 FIFO Queue Priority for Limit Orders
 * 2. Realistic Execution Latency Jitter (5ms–50ms)
 * 3. Historical Macro News Catalyst Overlay (with Blind Mode masking)
 */

export interface FifoLimitOrder {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  limitPrice: number;
  initialQueueAhead: number;
  queueAhead: number;
  status: "QUEUED" | "FILLED" | "CANCELLED";
  createdAt: number;
  latencyJitterMs: number;
}

export interface NewsCatalystPin {
  id: string;
  barIndex: number;
  category: "RBI" | "CPI" | "GDP" | "EARNINGS" | "GLOBAL";
  impact: "HIGH" | "MEDIUM";
  headline: string;
  maskedHeadline: string;
  surprise: string;
}

/**
 * Generates realistic microstructure network/matching jitter between 5ms and 50ms.
 * Volatile macro catalyst windows elevate jitter into the 22ms–50ms band.
 */
export function computeLatencyJitter(isVolatileEvent: boolean = false, seed?: number): number {
  const r = seed !== undefined ? Math.abs(Math.sin(seed)) : Math.random();
  if (isVolatileEvent) {
    return Math.round(22 + r * 28); // 22ms - 50ms
  }
  return Math.round(5 + r * 14); // 5ms - 19ms
}

/**
 * Creates a resting Limit Order placed at the back of the Level-3 FIFO queue.
 */
export function createFifoLimitOrder(params: {
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  limitPrice: number;
  depthAhead?: number;
  isVolatileEvent?: boolean;
}): FifoLimitOrder {
  const initialQueueAhead =
    params.depthAhead !== undefined
      ? Math.max(50, params.depthAhead)
      : Math.round(150 + Math.random() * 450);

  return {
    id: `fifo-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    symbol: params.symbol,
    side: params.side,
    qty: params.qty,
    limitPrice: params.limitPrice,
    initialQueueAhead,
    queueAhead: initialQueueAhead,
    status: "QUEUED",
    createdAt: Date.now(),
    latencyJitterMs: computeLatencyJitter(params.isVolatileEvent),
  };
}

/**
 * Simulates one market tick consuming resting contracts in the Level-3 FIFO queue.
 * Orders only transition to FILLED once preceding queueAhead reaches 0 (or price crosses cleanly).
 */
export function advanceFifoQueueTick(
  orders: FifoLimitOrder[],
  currentLtp: number,
  tickVolume: number = 120
): { updated: FifoLimitOrder[]; newlyFilled: FifoLimitOrder[] } {
  const newlyFilled: FifoLimitOrder[] = [];

  const updated = orders.map((order) => {
    if (order.status !== "QUEUED") return order;

    const priceDistancePct = Math.abs(currentLtp - order.limitPrice) / (order.limitPrice || 1);
    const isBuyCrossed = order.side === "BUY" && currentLtp <= order.limitPrice;
    const isSellCrossed = order.side === "SELL" && currentLtp >= order.limitPrice;

    let consumed = 0;
    if (isBuyCrossed || isSellCrossed) {
      // Aggressive tape cross drains queue rapidly
      consumed = tickVolume * 2.5;
    } else if (priceDistancePct < 0.0025) {
      // Near top-of-book: partial queue consumption
      consumed = Math.round(tickVolume * 0.65);
    }

    if (consumed <= 0) return order;

    const nextQueue = Math.max(0, Math.round(order.queueAhead - consumed));
    if (nextQueue === 0) {
      const filledOrder: FifoLimitOrder = {
        ...order,
        queueAhead: 0,
        status: "FILLED",
      };
      newlyFilled.push(filledOrder);
      return filledOrder;
    }

    return {
      ...order,
      queueAhead: nextQueue,
    };
  });

  return { updated, newlyFilled };
}

/**
 * Historical macroeconomic & earnings catalyst pins for replay timelines.
 * Automatically masks identifying labels and dates when Blind Mode is active.
 */
const PRESET_CATALYSTS: Record<string, Omit<NewsCatalystPin, "maskedHeadline">[]> = {
  COVID_CRASH_2020: [
    {
      id: "cat-covid-1",
      barIndex: 35,
      category: "GLOBAL",
      impact: "HIGH",
      headline: "Nationwide Lockdown & Circuit Breaker Halt Alert",
      surprise: "10% Lower Circuit",
    },
    {
      id: "cat-covid-2",
      barIndex: 72,
      category: "RBI",
      impact: "HIGH",
      headline: "Emergency Liquidity Window & Repo Cut Speculation",
      surprise: "Liquidity Injection",
    },
  ],
  ELECTION_DAY_2024: [
    {
      id: "cat-elec-1",
      barIndex: 38,
      category: "GLOBAL",
      impact: "HIGH",
      headline: "Early Counting Trends Show Tighter Coalition Margin",
      surprise: "India VIX +38%",
    },
    {
      id: "cat-elec-2",
      barIndex: 82,
      category: "GDP",
      impact: "MEDIUM",
      headline: "Institutional Value Desk Absorption & Short Covering",
      surprise: "+600 pt Rebound",
    },
  ],
  RBI_RATE_HIKE_2022: [
    {
      id: "cat-rbi-1",
      barIndex: 36,
      category: "RBI",
      impact: "HIGH",
      headline: "RBI Off-Cycle MPC: +40 bps Repo Rate Hike",
      surprise: "4.00% → 4.40%",
    },
    {
      id: "cat-rbi-2",
      barIndex: 68,
      category: "CPI",
      impact: "HIGH",
      headline: "CRR Hike +50 bps Draining ₹87,000 Cr Liquidity",
      surprise: "Hawkish Guidance",
    },
  ],
};

const DEFAULT_CATALYSTS: Omit<NewsCatalystPin, "maskedHeadline">[] = [
  {
    id: "cat-def-1",
    barIndex: 38,
    category: "CPI",
    impact: "HIGH",
    headline: "India CPI Inflation Print Surprise (+35 bps above consensus)",
    surprise: "Hawkish Spike",
  },
  {
    id: "cat-def-2",
    barIndex: 74,
    category: "GDP",
    impact: "MEDIUM",
    headline: "Quarterly GDP & Core Sector Output Release",
    surprise: "7.8% YoY Beat",
  },
];

export function getCatalystsForPreset(
  presetId: string,
  isBlindMode: boolean
): NewsCatalystPin[] {
  const source = PRESET_CATALYSTS[presetId] || DEFAULT_CATALYSTS;
  return source.map((c, idx) => ({
    ...c,
    maskedHeadline: `Macro Catalyst #${idx + 1} (Masked in Blind Mode)`,
    headline: isBlindMode ? `Macro Catalyst #${idx + 1} (Masked in Blind Mode)` : c.headline,
    surprise: isBlindMode ? "Hidden in Blind Mode" : c.surprise,
  }));
}
