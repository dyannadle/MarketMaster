/**
 * Institutional Market Microstructure Replay & Tape Reading Engine
 * Milestone 34: Time & Sales Velocity, Aggressive Maker/Taker Profiling & Gamified Microstructure Drills
 */

export interface TapePrint {
  id: string;
  timestamp: number; // epoch ms
  timeStr: string;
  price: number;
  quantity: number;
  side: 'BUY' | 'SELL';
  isBlockTrade: boolean;
  valueInr: number;
  bidPrice: number;
  askPrice: number;
}

export interface TapeVelocityMetrics {
  currentTps: number; // Trades Per Second (1s rolling window)
  baselineTps: number; // 30s baseline average
  velocityRatio: number; // currentTps / baselineTps
  isBursting: boolean; // velocityRatio > 2.5
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  buyRatio: number; // buyVolume / totalVolume
  blockTradeCount: number;
  detectedIcebergs: {
    price: number;
    side: 'BUY_ICEBERG' | 'SELL_ICEBERG';
    absorbedVolume: number;
    hitCount: number;
    timestamp: number;
  }[];
}

export interface TapeDrillScenario {
  id: string;
  title: string;
  description: string;
  targetSymbol: string;
  correctAction: 'BUY_BREAKOUT' | 'BUY_REVERSAL' | 'SELL_BREAKDOWN';
  explanation: string;
  prints: TapePrint[];
}

/**
 * Formats epoch timestamp into HH:MM:SS.mmm
 */
export function formatTapeTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  const ms = d.getMilliseconds().toString().padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

/**
 * Generates synthetic realistic Time & Sales stream for a symbol
 */
export function generateSyntheticTapeStream(
  basePrice = 2450.0,
  tickCount = 100,
  startTs = Date.now() - 60000
): TapePrint[] {
  const prints: TapePrint[] = [];
  let currentPrice = basePrice;
  let currentTs = startTs;

  for (let i = 0; i < tickCount; i++) {
    const isBurst = i >= 35 && i <= 55;
    const intervalMs = isBurst ? Math.floor(20 + Math.random() * 60) : Math.floor(200 + Math.random() * 800);
    currentTs += intervalMs;

    // Random walk with burst drift
    const drift = isBurst ? 0.25 : (Math.random() - 0.5) * 0.15;
    currentPrice = Math.round((currentPrice + drift) * 20) / 20;

    const spread = 0.05;
    const bidPrice = Math.round((currentPrice - spread / 2) * 20) / 20;
    const askPrice = Math.round((currentPrice + spread / 2) * 20) / 20;

    const isBuy = isBurst ? Math.random() < 0.8 : Math.random() < 0.5;
    const side = isBuy ? 'BUY' : 'SELL';
    const execPrice = isBuy ? askPrice : bidPrice;

    // Normal trade vs Block Trade
    const isBlock = Math.random() < 0.08 || (isBurst && i % 4 === 0);
    const quantity = isBlock ? Math.floor(1500 + Math.random() * 3500) : Math.floor(25 + Math.random() * 250);
    const valueInr = quantity * execPrice;

    prints.push({
      id: `TAPE-${i + 1}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: currentTs,
      timeStr: formatTapeTime(currentTs),
      price: execPrice,
      quantity,
      side,
      isBlockTrade: isBlock,
      valueInr,
      bidPrice,
      askPrice,
    });
  }

  return prints;
}

/**
 * Computes real-time tape velocity, aggressive maker/taker volumes, and resting iceberg patterns
 */
export function computeTapeVelocityMetrics(prints: TapePrint[]): TapeVelocityMetrics {
  if (prints.length === 0) {
    return {
      currentTps: 0,
      baselineTps: 1.0,
      velocityRatio: 0,
      isBursting: false,
      totalVolume: 0,
      buyVolume: 0,
      sellVolume: 0,
      buyRatio: 0.5,
      blockTradeCount: 0,
      detectedIcebergs: [],
    };
  }

  const latestTs = prints[prints.length - 1]!.timestamp;
  const window1sTs = latestTs - 1000;
  const window30sTs = latestTs - 30000;

  // 1s window trades
  const prints1s = prints.filter(p => p.timestamp >= window1sTs);
  const currentTps = prints1s.length;

  // 30s window trades
  const prints30s = prints.filter(p => p.timestamp >= window30sTs);
  const baselineTps = Math.max(0.5, prints30s.length / 30);
  const velocityRatio = Number((currentTps / baselineTps).toFixed(2));
  const isBursting = velocityRatio >= 2.5;

  let totalVolume = 0;
  let buyVolume = 0;
  let sellVolume = 0;
  let blockTradeCount = 0;

  for (const p of prints) {
    totalVolume += p.quantity;
    if (p.side === 'BUY') buyVolume += p.quantity;
    else sellVolume += p.quantity;
    if (p.isBlockTrade) blockTradeCount++;
  }

  const buyRatio = totalVolume > 0 ? Number((buyVolume / totalVolume).toFixed(2)) : 0.5;

  // Resting Iceberg Absorption Detector:
  // Detects >= 3 consecutive aggressive market orders absorbed at the exact same price level with >= 1,500 total volume
  const detectedIcebergs: TapeVelocityMetrics['detectedIcebergs'] = [];
  let streakPrice = 0;
  let streakSide: 'BUY' | 'SELL' = 'BUY';
  let streakVol = 0;
  let streakHits = 0;

  for (let i = 0; i < prints.length; i++) {
    const p = prints[i]!;
    if (p.price === streakPrice && p.side === streakSide) {
      streakVol += p.quantity;
      streakHits++;
      if (streakHits >= 3 && streakVol >= 1500) {
        detectedIcebergs.push({
          price: streakPrice,
          side: streakSide === 'SELL' ? 'BUY_ICEBERG' : 'SELL_ICEBERG', // Passive liquidity absorbing aggressive orders
          absorbedVolume: streakVol,
          hitCount: streakHits,
          timestamp: p.timestamp,
        });
      }
    } else {
      streakPrice = p.price;
      streakSide = p.side;
      streakVol = p.quantity;
      streakHits = 1;
    }
  }

  return {
    currentTps,
    baselineTps: Number(baselineTps.toFixed(2)),
    velocityRatio,
    isBursting,
    totalVolume,
    buyVolume,
    sellVolume,
    buyRatio,
    blockTradeCount,
    detectedIcebergs,
  };
}

/**
 * Pre-curated Gamified Tape Reading Practice Drills
 */
export const TAPE_DRILL_SCENARIOS: TapeDrillScenario[] = [
  {
    id: 'DRILL-1-ICEBERG',
    title: 'Institutional Buy Iceberg Absorption',
    description: 'Heavy market sell prints cascade into ₹2450.00 without dropping price. Observe the passive resting institutional liquidity absorbing market sellers.',
    targetSymbol: 'RELIANCE',
    correctAction: 'BUY_REVERSAL',
    explanation: 'Over 5,000 shares of aggressive selling hit ₹2450.00 across 6 prints with 0 downward slippage. This signifies an institutional resting buy iceberg. The seller order flow is exhausted, leading to an immediate spring reversal upwards.',
    prints: [
      { id: 'D1-1', timestamp: 1000, timeStr: '09:30:00.100', price: 2450.25, quantity: 200, side: 'SELL', isBlockTrade: false, valueInr: 490050, bidPrice: 2450.25, askPrice: 2450.50 },
      { id: 'D1-2', timestamp: 1200, timeStr: '09:30:00.300', price: 2450.00, quantity: 500, side: 'SELL', isBlockTrade: false, valueInr: 1225000, bidPrice: 2450.00, askPrice: 2450.25 },
      { id: 'D1-3', timestamp: 1350, timeStr: '09:30:00.450', price: 2450.00, quantity: 1500, side: 'SELL', isBlockTrade: true, valueInr: 3675000, bidPrice: 2450.00, askPrice: 2450.25 },
      { id: 'D1-4', timestamp: 1450, timeStr: '09:30:00.550', price: 2450.00, quantity: 2000, side: 'SELL', isBlockTrade: true, valueInr: 4900000, bidPrice: 2450.00, askPrice: 2450.25 },
      { id: 'D1-5', timestamp: 1550, timeStr: '09:30:00.650', price: 2450.00, quantity: 1200, side: 'SELL', isBlockTrade: true, valueInr: 2940000, bidPrice: 2450.00, askPrice: 2450.25 },
      { id: 'D1-6', timestamp: 2000, timeStr: '09:30:01.100', price: 2450.50, quantity: 300, side: 'BUY', isBlockTrade: false, valueInr: 735150, bidPrice: 2450.25, askPrice: 2450.50 },
      { id: 'D1-7', timestamp: 2200, timeStr: '09:30:01.300', price: 2451.00, quantity: 800, side: 'BUY', isBlockTrade: false, valueInr: 1960800, bidPrice: 2450.75, askPrice: 2451.00 },
    ],
  },
  {
    id: 'DRILL-2-MOMENTUM',
    title: 'High-Velocity Breakout Sweep',
    description: 'Rapid sequence of green block prints clearing ask liquidity at accelerating trades per second.',
    targetSymbol: 'NIFTY50',
    correctAction: 'BUY_BREAKOUT',
    explanation: 'Tape velocity accelerates to 18 trades/second with 90% buy volume aggression and block prints lifting every consecutive ask level. Entering long on momentum aligns with institutional market sweeps.',
    prints: [
      { id: 'D2-1', timestamp: 1000, timeStr: '10:15:00.100', price: 24100.00, quantity: 150, side: 'BUY', isBlockTrade: false, valueInr: 3615000, bidPrice: 24099.50, askPrice: 24100.00 },
      { id: 'D2-2', timestamp: 1050, timeStr: '10:15:00.150', price: 24101.00, quantity: 500, side: 'BUY', isBlockTrade: false, valueInr: 12050500, bidPrice: 24100.50, askPrice: 24101.00 },
      { id: 'D2-3', timestamp: 1080, timeStr: '10:15:00.180', price: 24102.50, quantity: 2000, side: 'BUY', isBlockTrade: true, valueInr: 48205000, bidPrice: 24102.00, askPrice: 24102.50 },
      { id: 'D2-4', timestamp: 1110, timeStr: '10:15:00.210', price: 24104.00, quantity: 3500, side: 'BUY', isBlockTrade: true, valueInr: 84364000, bidPrice: 24103.50, askPrice: 24104.00 },
      { id: 'D2-5', timestamp: 1140, timeStr: '10:15:00.240', price: 24106.00, quantity: 1500, side: 'BUY', isBlockTrade: true, valueInr: 36159000, bidPrice: 24105.50, askPrice: 24106.00 },
    ],
  },
  {
    id: 'DRILL-3-STOPHUNT',
    title: 'Predatory Liquidity Vacuum / Breakdown',
    description: 'Thin bids suddenly vanish as aggressive institutional sell blocks punch through critical round-number support.',
    targetSymbol: 'BANKNIFTY',
    correctAction: 'SELL_BREAKDOWN',
    explanation: 'Bid queue drained from 500 units to 0 within 120ms followed by heavy aggressive sell execution across multiple ticks with no passive buying response. A classic breakdown into a liquidity vacuum.',
    prints: [
      { id: 'D3-1', timestamp: 1000, timeStr: '14:45:00.000', price: 51200.00, quantity: 300, side: 'SELL', isBlockTrade: false, valueInr: 15360000, bidPrice: 51200.00, askPrice: 51202.00 },
      { id: 'D3-2', timestamp: 1040, timeStr: '10:45:00.040', price: 51195.00, quantity: 1200, side: 'SELL', isBlockTrade: true, valueInr: 61434000, bidPrice: 51195.00, askPrice: 51198.00 },
      { id: 'D3-3', timestamp: 1070, timeStr: '10:45:00.070', price: 51185.00, quantity: 2500, side: 'SELL', isBlockTrade: true, valueInr: 127962500, bidPrice: 51185.00, askPrice: 51190.00 },
      { id: 'D3-4', timestamp: 1100, timeStr: '10:45:00.100', price: 51170.00, quantity: 1800, side: 'SELL', isBlockTrade: true, valueInr: 92106000, bidPrice: 51170.00, askPrice: 51175.00 },
    ],
  },
];
