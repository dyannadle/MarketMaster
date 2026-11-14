// Milestone 28: HFT Tick-by-Tick Order Flow Footprint & Volume Profile Engine
// Implements Market By Price (MBP) intra-candle bid/ask clusters, Stacked Imbalances, POC, and Value Area (VAH/VAL)

export interface FootprintLevel {
  price: number;
  bidVolume: number;  // Aggressive sells hitting the bid
  askVolume: number;  // Aggressive buys lifting the ask
  delta: number;      // askVolume - bidVolume
  totalVolume: number;
  isPoc: boolean;     // Level with highest volume in candle
  isAskImbalance: boolean; // askVolume >= threshold * diagonal bid
  isBidImbalance: boolean; // bidVolume >= threshold * diagonal ask
}

export interface FootprintBar {
  barIndex: number;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  levels: FootprintLevel[];
  candleVolume: number;
  candleDelta: number;
  cumDelta: number;
  pocPrice: number;
  vahPrice: number; // Value Area High (70% volume cutoff)
  valPrice: number; // Value Area Low (70% volume cutoff)
  stackedBuyImbalances: number;  // Count of consecutive ask imbalances
  stackedSellImbalances: number; // Count of consecutive bid imbalances
}

export interface VolumeProfileBucket {
  price: number;
  totalVolume: number;
  bidVolume: number;
  askVolume: number;
  delta: number;
  isPoc: boolean;
  isInValueArea: boolean;
  isHvn: boolean; // High Volume Node (magnet)
  isLvn: boolean; // Low Volume Node (rejection)
}

export interface FootprintAnalysisResult {
  symbol: string;
  bars: FootprintBar[];
  overallPoc: number;
  overallVah: number;
  overallVal: number;
  totalVolume: number;
  netDelta: number;
  imbalanceRatio: number; // Default 3x (300%) or 4x (400%)
  volumeProfile: VolumeProfileBucket[];
}

// 1. Generate Realistic High-Fidelity Intra-Candle Footprint Microstructure
export function generateFootprintBars(
  symbol: string = "NIFTY_FUT",
  basePrice: number = 24500,
  numBars: number = 8,
  imbalanceRatio: number = 3.0
): FootprintAnalysisResult {
  const bars: FootprintBar[] = [];
  let currentPrice = basePrice;
  let runningCumDelta = 0;
  const tickSize = 5; // Nifty tick cluster size (5 pts per footprint row)

  const now = new Date();

  for (let b = 0; b < numBars; b++) {
    const barTime = new Date(now.getTime() - (numBars - b) * 5 * 60 * 1000);
    const timeStr = barTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    // Candle OHLC
    const priceDrift = (Math.sin(b * 1.1) + (b % 2 === 0 ? 0.8 : -0.4)) * 25;
    const open = Math.round((currentPrice + priceDrift) / tickSize) * tickSize;
    const close = Math.round((open + (Math.cos(b * 0.9) * 35)) / tickSize) * tickSize;
    const high = Math.max(open, close) + Math.round((Math.abs(Math.sin(b * 1.7)) * 20) / tickSize) * tickSize;
    const low = Math.min(open, close) - Math.round((Math.abs(Math.cos(b * 1.3)) * 20) / tickSize) * tickSize;
    currentPrice = close;

    // Generate price levels between low and high
    const levels: FootprintLevel[] = [];
    let barVolume = 0;
    let barDelta = 0;

    for (let p = low; p <= high; p += tickSize) {
      // Deterministic pseudo-random volume distribution: bell curve centered near close/midpoint
      const mid = (open + close) / 2;
      const distFromMid = Math.abs(p - mid) / (high - low || 1);
      const intensity = Math.max(0.15, 1 - distFromMid);

      const baseLevelVol = Math.round((120 + Math.sin(p + b) * 80 + intensity * 350));
      const buyBias = close >= open ? 0.58 : 0.42;

      // Intra-candle aggressive volumes
      let askVol = Math.round(baseLevelVol * buyBias * (1 + Math.sin(p * 0.2) * 0.35));
      let bidVol = Math.round(baseLevelVol * (1 - buyBias) * (1 + Math.cos(p * 0.2) * 0.35));

      // Occasional extreme institutional sweep producing stacked imbalances
      const minOC = Math.min(open, close);
      const maxOC = Math.max(open, close);
      if (b === 3 && p >= minOC && p <= maxOC) {
        askVol = Math.round(bidVol * 4.2); // 4.2x aggressive buying imbalance
      } else if (b === 6 && p >= minOC && p <= maxOC) {
        bidVol = Math.round(askVol * 4.0); // 4.0x aggressive selling imbalance
      }

      const delta = askVol - bidVol;
      barVolume += (askVol + bidVol);
      barDelta += delta;

      levels.push({
        price: p,
        bidVolume: bidVol,
        askVolume: askVol,
        delta,
        totalVolume: bidVol + askVol,
        isPoc: false,
        isAskImbalance: false,
        isBidImbalance: false,
      });
    }

    // Identify Point of Control (POC)
    let maxLevelVol = -1;
    let pocPrice = open;
    levels.forEach((lvl) => {
      if (lvl.totalVolume > maxLevelVol) {
        maxLevelVol = lvl.totalVolume;
        pocPrice = lvl.price;
      }
    });

    // Check Imbalances (Diagonal Comparison: Ask level N vs Bid level N - 1)
    for (let i = 0; i < levels.length; i++) {
      const curr = levels[i]!;
      if (curr.price === pocPrice) curr.isPoc = true;

      // Ask Imbalance: Ask[i] >= threshold * Bid[i - 1]
      if (i > 0) {
        const diagBid = levels[i - 1]!.bidVolume;
        if (diagBid > 0 && curr.askVolume >= diagBid * imbalanceRatio) {
          curr.isAskImbalance = true;
        }
      }

      // Bid Imbalance: Bid[i] >= threshold * Ask[i + 1]
      if (i < levels.length - 1) {
        const diagAsk = levels[i + 1]!.askVolume;
        if (diagAsk > 0 && curr.bidVolume >= diagAsk * imbalanceRatio) {
          curr.isBidImbalance = true;
        }
      }
    }

    // Value Area Calculation (70% Volume around POC)
    const sortedLevels = [...levels].sort((a, b) => b.totalVolume - a.totalVolume);
    const targetVaVolume = barVolume * 0.70;
    let accumulatedVaVol = 0;
    const vaPrices: number[] = [];

    for (const lvl of sortedLevels) {
      accumulatedVaVol += lvl.totalVolume;
      vaPrices.push(lvl.price);
      if (accumulatedVaVol >= targetVaVolume) break;
    }

    const vahPrice = Math.max(...vaPrices);
    const valPrice = Math.min(...vaPrices);

    // Count stacked imbalances (consecutive imbalance levels)
    let stackedBuy = 0;
    let maxStackedBuy = 0;
    let stackedSell = 0;
    let maxStackedSell = 0;

    levels.forEach((lvl) => {
      if (lvl.isAskImbalance) {
        stackedBuy++;
        maxStackedBuy = Math.max(maxStackedBuy, stackedBuy);
      } else {
        stackedBuy = 0;
      }

      if (lvl.isBidImbalance) {
        stackedSell++;
        maxStackedSell = Math.max(maxStackedSell, stackedSell);
      } else {
        stackedSell = 0;
      }
    });

    runningCumDelta += barDelta;

    bars.push({
      barIndex: b + 1,
      timestamp: timeStr,
      open,
      high,
      low,
      close,
      levels,
      candleVolume: barVolume,
      candleDelta: barDelta,
      cumDelta: runningCumDelta,
      pocPrice,
      vahPrice,
      valPrice,
      stackedBuyImbalances: maxStackedBuy >= 3 ? maxStackedBuy : 0,
      stackedSellImbalances: maxStackedSell >= 3 ? maxStackedSell : 0,
    });
  }

  // Aggregate Session Volume Profile
  const profileMap = new Map<number, { bid: number; ask: number }>();
  let totalSessionVolume = 0;
  let netSessionDelta = 0;

  bars.forEach((bar) => {
    bar.levels.forEach((lvl) => {
      const existing = profileMap.get(lvl.price) || { bid: 0, ask: 0 };
      existing.bid += lvl.bidVolume;
      existing.ask += lvl.askVolume;
      profileMap.set(lvl.price, existing);
      totalSessionVolume += (lvl.bidVolume + lvl.askVolume);
      netSessionDelta += (lvl.askVolume - lvl.bidVolume);
    });
  });

  const volumeProfile: VolumeProfileBucket[] = [];
  let maxProfileVol = -1;
  let overallPoc = basePrice;

  profileMap.forEach((vol, price) => {
    const tot = vol.bid + vol.ask;
    if (tot > maxProfileVol) {
      maxProfileVol = tot;
      overallPoc = price;
    }
  });

  // Value area for entire session
  const sortedProfile = Array.from(profileMap.entries())
    .map(([price, vol]) => ({ price, total: vol.bid + vol.ask, bid: vol.bid, ask: vol.ask }))
    .sort((a, b) => b.total - a.total);

  const va70 = totalSessionVolume * 0.70;
  let cumVa = 0;
  const sessionVaPrices: number[] = [];

  for (const item of sortedProfile) {
    cumVa += item.total;
    sessionVaPrices.push(item.price);
    if (cumVa >= va70) break;
  }

  const overallVah = Math.max(...sessionVaPrices);
  const overallVal = Math.min(...sessionVaPrices);

  // Mean volume for HVN/LVN identification
  const meanVol = totalSessionVolume / (profileMap.size || 1);

  Array.from(profileMap.entries())
    .sort(([p1], [p2]) => p1 - p2)
    .forEach(([price, vol]) => {
      const total = vol.bid + vol.ask;
      volumeProfile.push({
        price,
        totalVolume: total,
        bidVolume: vol.bid,
        askVolume: vol.ask,
        delta: vol.ask - vol.bid,
        isPoc: price === overallPoc,
        isInValueArea: price >= overallVal && price <= overallVah,
        isHvn: total >= meanVol * 1.5,
        isLvn: total <= meanVol * 0.45,
      });
    });

  return {
    symbol,
    bars,
    overallPoc,
    overallVah,
    overallVal,
    totalVolume: totalSessionVolume,
    netDelta: netSessionDelta,
    imbalanceRatio,
    volumeProfile,
  };
}
