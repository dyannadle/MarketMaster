/**
 * High-Frequency Order Flow Toxicity & VPIN Engine
 *
 * Implements:
 * 1. Volume-Synchronized Probability of Toxicity (VPIN) (Easley, López de Prado, O'Hara 2012):
 *    - Ticks aggregated into constant volume buckets (V = 10,000 shares/contracts).
 *    - Bulk Volume Classification (BVC) or tick rule to determine buyer vs seller volume.
 *    - Rolling calculation over N = 50 buckets:
 *      VPIN = \frac{\sum_{\tau=1}^N |V_\tau^B - V_\tau^S|}{N \times V}
 * 2. Real-Time Toxicity CDF & Flash Crash Early-Warning Trigger:
 *    - Calculates empirical CDF of historical VPIN.
 *    - Triggers warning when VPIN > 95th percentile (informed institutional sweep).
 * 3. Automated Rule 4.3 Stop-Loss Protection Lock:
 *    - Flags high toxicity and tightens trailing stops to safeguard virtual capital.
 */

export interface TradeTick {
  timestamp: number; // Milliseconds
  price: number;
  volume: number;
  side?: "BUY" | "SELL";
}

export interface VolumeBucket {
  bucketIndex: number;
  startTime: number;
  endTime: number;
  startPrice: number;
  endPrice: number;
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  volumeImbalance: number; // |V_B - V_S|
  imbalanceRatio: number; // |V_B - V_S| / V
}

export interface VpinPoint {
  bucketIndex: number;
  timestamp: number;
  vpin: number; // Value in [0, 1]
  vpinPct: number; // Value in %
  cdfPercentile: number; // Percentile rank in [0, 100]
  toxicityLevel: "LOW" | "NORMAL" | "ELEVATED" | "CRITICAL_FLASH_RISK";
  endPrice: number;
  rule43LockRecommended: boolean;
}

export interface VpinReport {
  symbol: string;
  bucketSize: number; // V (e.g. 10000)
  rollingBuckets: number; // N (e.g. 50)
  totalTicksProcessed: number;
  totalBucketsCreated: number;
  currentVpin: number;
  currentCdfPercentile: number;
  toxicityLevel: "LOW" | "NORMAL" | "ELEVATED" | "CRITICAL_FLASH_RISK";
  rule43RiskAlert: boolean;
  history: VpinPoint[];
  buckets: VolumeBucket[];
  recentImbalanceRatio: number;
}

/**
 * Standard Normal CDF approximation (Abramowitz & Stegun)
 */
function normCdf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * absX);
  const erf = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return 0.5 * (1.0 + sign * erf);
}

/**
 * Classify tick volume into Buy vs Sell using Bulk Volume Classification (BVC)
 * or Tick Rule fallback
 */
export function classifyTickVolume(
  price: number,
  prevPrice: number,
  volume: number,
  sigmaPrice: number = 2.5
): { buyVol: number; sellVol: number } {
  if (price === prevPrice) {
    return { buyVol: volume * 0.5, sellVol: volume * 0.5 };
  }

  const deltaP = price - prevPrice;
  const zScore = deltaP / Math.max(sigmaPrice, 0.05);
  // BVC probability using standard normal distribution
  const buyProb = Math.min(Math.max(normCdf(zScore), 0.02), 0.98);

  const buyVol = volume * buyProb;
  const sellVol = volume * (1 - buyProb);
  return { buyVol, sellVol };
}

/**
 * Synchronizes sequential trade ticks into constant-volume buckets of size V
 */
export function aggregateVolumeBuckets(
  ticks: TradeTick[],
  bucketSize: number = 10000
): VolumeBucket[] {
  const buckets: VolumeBucket[] = [];
  if (ticks.length === 0) return buckets;

  let currentBucketIndex = 1;
  let accumulatedVol = 0;
  let currentBuyVol = 0;
  let currentSellVol = 0;
  let startTime = ticks[0]!.timestamp;
  let startPrice = ticks[0]!.price;

  let prevPrice = ticks[0]!.price;

  for (let i = 0; i < ticks.length; i++) {
    const tick = ticks[i]!;
    const { buyVol, sellVol } = classifyTickVolume(tick.price, prevPrice, tick.volume);
    prevPrice = tick.price;

    let remainingTickVol = tick.volume;
    let tickBuyVol = buyVol;
    let tickSellVol = sellVol;

    while (remainingTickVol > 0) {
      const spaceInBucket = bucketSize - accumulatedVol;

      if (remainingTickVol <= spaceInBucket) {
        // Fits completely in current bucket
        accumulatedVol += remainingTickVol;
        currentBuyVol += tickBuyVol;
        currentSellVol += tickSellVol;
        remainingTickVol = 0;
      } else {
        // Bucket fills up; split the tick
        const fraction = spaceInBucket / remainingTickVol;
        accumulatedVol += spaceInBucket;
        currentBuyVol += tickBuyVol * fraction;
        currentSellVol += tickSellVol * fraction;

        const imbalance = Math.abs(currentBuyVol - currentSellVol);
        buckets.push({
          bucketIndex: currentBucketIndex++,
          startTime,
          endTime: tick.timestamp,
          startPrice,
          endPrice: tick.price,
          totalVolume: bucketSize,
          buyVolume: Number(currentBuyVol.toFixed(1)),
          sellVolume: Number(currentSellVol.toFixed(1)),
          volumeImbalance: Number(imbalance.toFixed(1)),
          imbalanceRatio: Number((imbalance / bucketSize).toFixed(4)),
        });

        // Reset for next bucket
        remainingTickVol -= spaceInBucket;
        tickBuyVol -= tickBuyVol * fraction;
        tickSellVol -= tickSellVol * fraction;
        accumulatedVol = 0;
        currentBuyVol = 0;
        currentSellVol = 0;
        startTime = tick.timestamp;
        startPrice = tick.price;
      }
    }
  }

  // Push partial bucket if non-empty
  if (accumulatedVol > 0) {
    const imbalance = Math.abs(currentBuyVol - currentSellVol);
    buckets.push({
      bucketIndex: currentBucketIndex,
      startTime,
      endTime: ticks[ticks.length - 1]!.timestamp,
      startPrice,
      endPrice: ticks[ticks.length - 1]!.price,
      totalVolume: accumulatedVol,
      buyVolume: Number(currentBuyVol.toFixed(1)),
      sellVolume: Number(currentSellVol.toFixed(1)),
      volumeImbalance: Number(imbalance.toFixed(1)),
      imbalanceRatio: Number((imbalance / Math.max(accumulatedVol, 1)).toFixed(4)),
    });
  }

  return buckets;
}

/**
 * Calculates rolling VPIN metric over N constant-volume buckets:
 * VPIN = \frac{\sum_{\tau=1}^N |V_\tau^B - V_\tau^S|}{N \times V}
 */
export function calculateVpinSeries(
  buckets: VolumeBucket[],
  rollingN: number = 30,
  bucketSize: number = 10000
): VpinPoint[] {
  const points: VpinPoint[] = [];
  if (buckets.length < 5) return points;

  // Collect historical VPIN values to compute rolling empirical CDF
  const allVpins: number[] = [];

  for (let i = 0; i < buckets.length; i++) {
    const startIdx = Math.max(0, i - rollingN + 1);
    const window = buckets.slice(startIdx, i + 1);

    const sumImbalance = window.reduce((s, b) => s + b.volumeImbalance, 0);
    const totalPossibleVolume = window.length * bucketSize;
    const rawVpin = sumImbalance / totalPossibleVolume;
    const vpinClamped = Math.min(Math.max(rawVpin, 0.0), 1.0);
    allVpins.push(vpinClamped);

    // Compute empirical CDF percentile: % of historical observations <= current
    const sorted = [...allVpins].sort((a, b) => a - b);
    const rank = sorted.findIndex((v) => v >= vpinClamped);
    const cdfPercentile = Number(((rank / sorted.length) * 100).toFixed(1));

    let toxicityLevel: "LOW" | "NORMAL" | "ELEVATED" | "CRITICAL_FLASH_RISK" = "NORMAL";
    let rule43LockRecommended = false;

    if (cdfPercentile >= 95 || vpinClamped >= 0.52) {
      toxicityLevel = "CRITICAL_FLASH_RISK";
      rule43LockRecommended = true; // Tighten stop-losses, avoid toxic sweeps
    } else if (cdfPercentile >= 80 || vpinClamped >= 0.40) {
      toxicityLevel = "ELEVATED";
      rule43LockRecommended = true;
    } else if (cdfPercentile <= 25) {
      toxicityLevel = "LOW";
    }

    const currentBucket = buckets[i]!;
    points.push({
      bucketIndex: currentBucket.bucketIndex,
      timestamp: currentBucket.endTime,
      vpin: Number(vpinClamped.toFixed(4)),
      vpinPct: Number((vpinClamped * 100).toFixed(1)),
      cdfPercentile,
      toxicityLevel,
      endPrice: currentBucket.endPrice,
      rule43LockRecommended,
    });
  }

  return points;
}

/**
 * Generates synthetic high-frequency trade tape with predatory institutional informed sweeps
 */
export function generateSyntheticTradeTicks(tickCount: number = 800, basePrice: number = 24500): TradeTick[] {
  const ticks: TradeTick[] = [];
  let price = basePrice;
  let timestamp = Date.now() - tickCount * 120; // 120ms tick intervals

  let seed = 777;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  for (let i = 0; i < tickCount; i++) {
    timestamp += Math.floor(rnd() * 80 + 40);

    // Inject sudden predatory informed toxicity sweeps every 180 ticks
    const isToxicSweep = (i >= 220 && i <= 290) || (i >= 520 && i <= 590);
    let delta = (rnd() - 0.495) * 3.5;
    let vol = Math.floor(rnd() * 800 + 100);

    if (isToxicSweep) {
      // Aggressive directional institutional selling: large size + persistent downward drift
      delta = -Math.abs(delta) - 1.8;
      vol = Math.floor(rnd() * 2500 + 1500);
    }

    price += delta;
    ticks.push({
      timestamp,
      price: Number(price.toFixed(2)),
      volume: vol,
      side: delta >= 0 ? "BUY" : "SELL",
    });
  }

  return ticks;
}

/**
 * Generates comprehensive VPIN analysis report
 */
export function generateVpinReport(
  symbol: string = "NIFTY_FUT",
  bucketSize: number = 10000,
  rollingN: number = 30,
  tickCount: number = 800
): VpinReport {
  const ticks = generateSyntheticTradeTicks(tickCount, 24500);
  const buckets = aggregateVolumeBuckets(ticks, bucketSize);
  const history = calculateVpinSeries(buckets, rollingN, bucketSize);

  const latestPoint = history[history.length - 1] || {
    vpin: 0.28,
    cdfPercentile: 50,
    toxicityLevel: "NORMAL" as const,
    rule43LockRecommended: false,
  };

  const recentBucket = buckets[buckets.length - 1];
  const recentImbalanceRatio = recentBucket ? recentBucket.imbalanceRatio : 0.25;

  return {
    symbol,
    bucketSize,
    rollingBuckets: rollingN,
    totalTicksProcessed: ticks.length,
    totalBucketsCreated: buckets.length,
    currentVpin: latestPoint.vpin,
    currentCdfPercentile: latestPoint.cdfPercentile,
    toxicityLevel: latestPoint.toxicityLevel,
    rule43RiskAlert: latestPoint.rule43LockRecommended,
    history,
    buckets: buckets.slice(-20), // Last 20 buckets for table display
    recentImbalanceRatio,
  };
}
