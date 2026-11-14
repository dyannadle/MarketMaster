// Milestone 22: Level-2 Order Book Depth, Imbalance Ratio & Liquidity Sweeps
// Implements order imbalance metrics OIR = (Vb - Va) / (Vb + Va) and depth heatmap simulation

export interface DepthLevel {
  price: number;
  qty: number;
  orders: number;
  cumulativeQty: number;
  percentage: number; // For visual bar width
}

export interface Level2OrderBook {
  symbol: string;
  timestamp: number;
  bids: DepthLevel[];
  asks: DepthLevel[];
  totalBidQty: number;
  totalAskQty: number;
  imbalanceRatio: number; // -1.0 (pure ask/sell) to +1.0 (pure bid/buy)
  imbalanceTone: "BULLISH_ABSORPTION" | "BEARISH_WALL" | "BALANCED";
  institutionalSweepDetected: boolean;
  sweepMessage?: string | undefined;
}

/**
 * Calculates Order Imbalance Ratio: (Vb - Va) / (Vb + Va)
 */
export function calculateOrderImbalance(totalBidQty: number, totalAskQty: number): number {
  const sum = totalBidQty + totalAskQty;
  if (sum === 0) return 0;
  return Math.round(((totalBidQty - totalAskQty) / sum) * 100) / 100;
}

/**
 * Generates high-fidelity 10-level Level-2 depth book around mid price
 */
export function generateLevel2Depth(
  symbol: string,
  midPrice: number,
  spread = 0.5,
  seed = Date.now()
): Level2OrderBook {
  const bids: DepthLevel[] = [];
  const asks: DepthLevel[] = [];

  let cumBid = 0;
  let cumAsk = 0;

  // Tick size: 0.05 for NSE equities/indices
  const tickSize = midPrice > 10000 ? 0.5 : 0.05;

  // Pseudo-random volume variation based on U-shaped book liquidity
  for (let i = 0; i < 10; i++) {
    const levelStep = (i + 1) * tickSize;
    const bidPrice = Math.round((midPrice - (spread / 2) - levelStep) * 100) / 100;
    const askPrice = Math.round((midPrice + (spread / 2) + levelStep) * 100) / 100;

    // Institutional wall injected randomly at depth 3 or 7
    const isBidWall = (i === 3 || i === 7) && (seed % 3 === 0);
    const isAskWall = (i === 2 || i === 6) && (seed % 4 === 0);

    const baseLot = symbol.includes("NIFTY") ? 50 : 25;
    const bidMultiplier = isBidWall ? 12 : Math.max(1, Math.floor(Math.abs(Math.sin(seed + i * 2)) * 6) + 1);
    const askMultiplier = isAskWall ? 14 : Math.max(1, Math.floor(Math.abs(Math.cos(seed + i * 3)) * 6) + 1);

    const bidQty = bidMultiplier * baseLot;
    const askQty = askMultiplier * baseLot;

    cumBid += bidQty;
    cumAsk += askQty;

    bids.push({
      price: bidPrice,
      qty: bidQty,
      orders: Math.max(1, Math.floor(bidQty / baseLot)),
      cumulativeQty: cumBid,
      percentage: 0,
    });

    asks.push({
      price: askPrice,
      qty: askQty,
      orders: Math.max(1, Math.floor(askQty / baseLot)),
      cumulativeQty: cumAsk,
      percentage: 0,
    });
  }

  // Normalize percentages
  const maxCum = Math.max(cumBid, cumAsk) || 1;
  bids.forEach((b) => (b.percentage = Math.round((b.cumulativeQty / maxCum) * 100)));
  asks.forEach((a) => (a.percentage = Math.round((a.cumulativeQty / maxCum) * 100)));

  const imbalanceRatio = calculateOrderImbalance(cumBid, cumAsk);

  let imbalanceTone: "BULLISH_ABSORPTION" | "BEARISH_WALL" | "BALANCED" = "BALANCED";
  let institutionalSweepDetected = false;
  let sweepMessage: string | undefined;

  if (imbalanceRatio >= 0.35) {
    imbalanceTone = "BULLISH_ABSORPTION";
    institutionalSweepDetected = true;
    sweepMessage = `Predatory Buy Absorption: Bid book outweighing asks by ${Math.round((imbalanceRatio + 1) * 50)}%. Institutional bids stacking at ₹${bids[0]?.price.toFixed(2)}.`;
  } else if (imbalanceRatio <= -0.35) {
    imbalanceTone = "BEARISH_WALL";
    institutionalSweepDetected = true;
    sweepMessage = `Predatory Ask Wall: Sell depth dominating bids with OIR ${imbalanceRatio.toFixed(2)}. Resistance stacking at ₹${asks[0]?.price.toFixed(2)}.`;
  }

  return {
    symbol,
    timestamp: Date.now(),
    bids,
    asks,
    totalBidQty: cumBid,
    totalAskQty: cumAsk,
    imbalanceRatio,
    imbalanceTone,
    institutionalSweepDetected,
    sweepMessage,
  };
}
