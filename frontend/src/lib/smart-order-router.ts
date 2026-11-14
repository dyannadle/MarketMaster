// Milestone 26: Smart Order Routing (SOR) & Institutional Execution Algorithmic Engine
// Implements Multi-Venue Liquidity Fragmentation (NSE vs BSE), VWAP/TWAP, Iceberg Orders, and Implementation Shortfall

export type ExchangeVenue = "NSE" | "BSE";

export interface VenueQuote {
  venue: ExchangeVenue;
  symbol: string;
  bidPrice: number;
  bidQty: number;
  askPrice: number;
  askQty: number;
  latencyMs: number; // Simulated exchange gateway network latency
  marketSharePct: number;
}

export interface NBBOQuote {
  symbol: string;
  bestBidPrice: number;
  bestBidQty: number;
  bestBidVenue: ExchangeVenue;
  bestAskPrice: number;
  bestAskQty: number;
  bestAskVenue: ExchangeVenue;
  spread: number;
  hasArbitrageCross: boolean; // True if Best Bid >= Best Ask across venues
  arbitrageProfitPerShare: number;
}

export interface ChildOrderClip {
  clipIndex: number;
  timeLabel: string;
  targetVenue: ExchangeVenue;
  qty: number;
  price: number;
  status: "FILLED" | "PENDING";
  latencyMs: number;
  cumulativeFilled: number;
  effectiveSlippageBps: number;
}

export interface ExecutionScheduleResult {
  algoType: "SOR" | "VWAP" | "TWAP" | "ICEBERG";
  parentQty: number;
  side: "BUY" | "SELL";
  arrivalPrice: number;
  avgExecutionPrice: number;
  totalTradedValue: number;
  implementationShortfallBps: number; // Basis points deviation from arrival price
  slippageCost: number; // ₹ monetary impact
  exchangeFees: number; // STT, exchange fees, GST
  sorSavingsVsSingleVenue: number; // ₹ saved by smart splitting across NSE & BSE
  venueBreakdown: {
    nseQty: number;
    nsePct: number;
    bseQty: number;
    bsePct: number;
  };
  clips: ChildOrderClip[];
}

// 1. Generate Realistic Fragmented Multi-Venue Depth (NSE & BSE)
export function getMultiVenueQuotes(symbol: string = "NIFTY_FUT", baseSpot: number = 24500): {
  nse: VenueQuote;
  bse: VenueQuote;
  nbbo: NBBOQuote;
} {
  // NSE typically higher liquidity, tighter queue latency (~2.1 ms)
  const nseBid = baseSpot - 0.05;
  const nseAsk = baseSpot + 0.05;

  // BSE slightly lower liquidity, occasionally offers fractional tick disparity, latency (~4.6 ms)
  const bseOffset = (Math.sin(baseSpot * 0.1) * 0.1);
  const bseBid = Number((baseSpot - 0.05 + bseOffset).toFixed(2));
  const bseAsk = Number((baseSpot + 0.05 + bseOffset).toFixed(2));

  const nse: VenueQuote = {
    venue: "NSE",
    symbol,
    bidPrice: nseBid,
    bidQty: 2450,
    askPrice: nseAsk,
    askQty: 2800,
    latencyMs: 2.1,
    marketSharePct: 74,
  };

  const bse: VenueQuote = {
    venue: "BSE",
    symbol,
    bidPrice: bseBid,
    bidQty: 950,
    askPrice: bseAsk,
    askQty: 1100,
    latencyMs: 4.6,
    marketSharePct: 26,
  };

  // Compute NBBO (National Best Bid and Offer)
  const bestBidVenue = nse.bidPrice >= bse.bidPrice ? "NSE" : "BSE";
  const bestBidPrice = Math.max(nse.bidPrice, bse.bidPrice);
  const bestBidQty = bestBidVenue === "NSE" ? nse.bidQty : bse.bidQty;

  const bestAskVenue = nse.askPrice <= bse.askPrice ? "NSE" : "BSE";
  const bestAskPrice = Math.min(nse.askPrice, bse.askPrice);
  const bestAskQty = bestAskVenue === "NSE" ? nse.askQty : bse.askQty;

  const spread = Number((bestAskPrice - bestBidPrice).toFixed(2));
  const hasArbitrageCross = bestBidPrice >= bestAskPrice;
  const arbitrageProfitPerShare = hasArbitrageCross ? Number((bestBidPrice - bestAskPrice).toFixed(2)) : 0;

  const nbbo: NBBOQuote = {
    symbol,
    bestBidPrice,
    bestBidQty,
    bestBidVenue,
    bestAskPrice,
    bestAskQty,
    bestAskVenue,
    spread,
    hasArbitrageCross,
    arbitrageProfitPerShare,
  };

  return { nse, bse, nbbo };
}

// 2. Intraday U-Shaped Volume Curve Profile for Indian Markets
// Standard 7 trading slices from 09:15 to 15:30
export const INTRADAY_VWAP_WEIGHTS = [
  { time: "09:15-10:00", weight: 0.22, name: "Market Open Surge" },
  { time: "10:00-11:00", weight: 0.15, name: "Morning Momentum" },
  { time: "11:00-12:00", weight: 0.11, name: "Midday Settling" },
  { time: "12:00-13:00", weight: 0.08, name: "European Open / Lunch Trough" },
  { time: "13:00-14:00", weight: 0.12, name: "Afternoon Buildup" },
  { time: "14:00-15:00", weight: 0.16, name: "Pre-Close Repositioning" },
  { time: "15:00-15:30", weight: 0.16, name: "Closing Auction Call" },
];

// 3. Multi-Venue Smart Order Routing (SOR) Algorithm
export function executeSmartOrderRouting(
  parentQty: number = 5000,
  side: "BUY" | "SELL" = "BUY",
  arrivalPrice: number = 24500,
  symbol: string = "NIFTY_FUT"
): ExecutionScheduleResult {
  const { nse, bse } = getMultiVenueQuotes(symbol, arrivalPrice);
  const clips: ChildOrderClip[] = [];

  // Optimal Split: Weight by available top-of-book depth and price superiority
  const nseBookQty = side === "BUY" ? nse.askQty : nse.bidQty;
  const bseBookQty = side === "BUY" ? bse.askQty : bse.bidQty;
  const totalAvailable = nseBookQty + bseBookQty;

  const nseRatio = totalAvailable > 0 ? nseBookQty / totalAvailable : 0.7;
  const nseTargetQty = Math.round(parentQty * nseRatio);
  const bseTargetQty = parentQty - nseTargetQty;

  // Clip 1: Best Price venue first
  const nseBestPrice = side === "BUY" ? nse.askPrice : nse.bidPrice;
  const bseBestPrice = side === "BUY" ? bse.askPrice : bse.bidPrice;

  // Simulate market impact per clip: 0.02 tick per 1000 shares
  const nseImpact = (nseTargetQty / 1000) * 0.03 * (side === "BUY" ? 1 : -1);
  const bseImpact = (bseTargetQty / 1000) * 0.04 * (side === "BUY" ? 1 : -1);

  const nseExecPrice = Number((nseBestPrice + nseImpact).toFixed(2));
  const bseExecPrice = Number((bseBestPrice + bseImpact).toFixed(2));

  clips.push({
    clipIndex: 1,
    timeLabel: "T+2.1ms (Primary)",
    targetVenue: "NSE",
    qty: nseTargetQty,
    price: nseExecPrice,
    status: "FILLED",
    latencyMs: nse.latencyMs,
    cumulativeFilled: nseTargetQty,
    effectiveSlippageBps: Number((Math.abs(nseExecPrice - arrivalPrice) / arrivalPrice * 10000).toFixed(1)),
  });

  clips.push({
    clipIndex: 2,
    timeLabel: "T+4.6ms (Secondary)",
    targetVenue: "BSE",
    qty: bseTargetQty,
    price: bseExecPrice,
    status: "FILLED",
    latencyMs: bse.latencyMs,
    cumulativeFilled: parentQty,
    effectiveSlippageBps: Number((Math.abs(bseExecPrice - arrivalPrice) / arrivalPrice * 10000).toFixed(1)),
  });

  const totalTradedValue = nseTargetQty * nseExecPrice + bseTargetQty * bseExecPrice;
  const avgExecutionPrice = Number((totalTradedValue / parentQty).toFixed(2));

  // Single venue penalty: If routed 100% to single venue, higher impact
  const singleVenuePrice = arrivalPrice + (parentQty / 1000) * 0.07 * (side === "BUY" ? 1 : -1);
  const sorSavingsVsSingleVenue = Math.max(0, Math.round(Math.abs(singleVenuePrice - avgExecutionPrice) * parentQty));

  // Implementation Shortfall: bps deviation
  const sideMultiplier = side === "BUY" ? 1 : -1;
  const isBps = Number((sideMultiplier * ((avgExecutionPrice - arrivalPrice) / arrivalPrice) * 10000).toFixed(2));
  const slippageCost = Math.round(Math.abs(avgExecutionPrice - arrivalPrice) * parentQty);
  const exchangeFees = Math.round(totalTradedValue * 0.00025); // ~0.025% regulatory fees

  return {
    algoType: "SOR",
    parentQty,
    side,
    arrivalPrice,
    avgExecutionPrice,
    totalTradedValue,
    implementationShortfallBps: isBps,
    slippageCost,
    exchangeFees,
    sorSavingsVsSingleVenue,
    venueBreakdown: {
      nseQty: nseTargetQty,
      nsePct: Number((nseRatio * 100).toFixed(1)),
      bseQty: bseTargetQty,
      bsePct: Number(((1 - nseRatio) * 100).toFixed(1)),
    },
    clips,
  };
}

// 4. Volume-Weighted Average Price (VWAP) Slicing Engine
export function executeVwapSchedule(
  parentQty: number = 10000,
  side: "BUY" | "SELL" = "BUY",
  arrivalPrice: number = 24500
): ExecutionScheduleResult {
  const clips: ChildOrderClip[] = [];
  let cumFilled = 0;
  let totalTradedValue = 0;

  INTRADAY_VWAP_WEIGHTS.forEach((interval, idx) => {
    const clipQty = Math.round(parentQty * interval.weight);
    cumFilled += clipQty;

    // Small intraday mean-reverting price drift
    const priceDrift = Math.sin(idx * 0.8) * 1.5 + (clipQty / 1000) * 0.04 * (side === "BUY" ? 1 : -1);
    const clipPrice = Number((arrivalPrice + priceDrift).toFixed(2));
    totalTradedValue += clipQty * clipPrice;

    clips.push({
      clipIndex: idx + 1,
      timeLabel: interval.time,
      targetVenue: idx % 3 === 0 ? "BSE" : "NSE",
      qty: clipQty,
      price: clipPrice,
      status: "FILLED",
      latencyMs: idx % 3 === 0 ? 4.6 : 2.1,
      cumulativeFilled: cumFilled,
      effectiveSlippageBps: Number((Math.abs(clipPrice - arrivalPrice) / arrivalPrice * 10000).toFixed(1)),
    });
  });

  const avgExecutionPrice = Number((totalTradedValue / parentQty).toFixed(2));
  const sideMultiplier = side === "BUY" ? 1 : -1;
  const isBps = Number((sideMultiplier * ((avgExecutionPrice - arrivalPrice) / arrivalPrice) * 10000).toFixed(2));

  return {
    algoType: "VWAP",
    parentQty,
    side,
    arrivalPrice,
    avgExecutionPrice,
    totalTradedValue,
    implementationShortfallBps: isBps,
    slippageCost: Math.round(Math.abs(avgExecutionPrice - arrivalPrice) * parentQty),
    exchangeFees: Math.round(totalTradedValue * 0.00025),
    sorSavingsVsSingleVenue: Math.round(parentQty * 1.8),
    venueBreakdown: {
      nseQty: Math.round(parentQty * 0.72),
      nsePct: 72,
      bseQty: Math.round(parentQty * 0.28),
      bsePct: 28,
    },
    clips,
  };
}

// 5. Iceberg Order Execution Engine
export function executeIcebergOrder(
  totalQty: number = 8000,
  visibleClipQty: number = 500,
  side: "BUY" | "SELL" = "BUY",
  arrivalPrice: number = 24500
): ExecutionScheduleResult {
  const clips: ChildOrderClip[] = [];
  const numClips = Math.ceil(totalQty / visibleClipQty);
  let cumFilled = 0;
  let totalTradedValue = 0;

  for (let i = 1; i <= numClips; i++) {
    const clipQty = Math.min(visibleClipQty, totalQty - cumFilled);
    cumFilled += clipQty;

    // Small transient impact on each visible clip
    const microImpact = (i * 0.08) * (side === "BUY" ? 1 : -1);
    const clipPrice = Number((arrivalPrice + microImpact).toFixed(2));
    totalTradedValue += clipQty * clipPrice;

    clips.push({
      clipIndex: i,
      timeLabel: `Clip #${i} (Vis: ${clipQty})`,
      targetVenue: i % 4 === 0 ? "BSE" : "NSE",
      qty: clipQty,
      price: clipPrice,
      status: "FILLED",
      latencyMs: 2.1,
      cumulativeFilled: cumFilled,
      effectiveSlippageBps: Number((Math.abs(clipPrice - arrivalPrice) / arrivalPrice * 10000).toFixed(1)),
    });
  }

  const avgExecutionPrice = Number((totalTradedValue / totalQty).toFixed(2));
  const sideMultiplier = side === "BUY" ? 1 : -1;
  const isBps = Number((sideMultiplier * ((avgExecutionPrice - arrivalPrice) / arrivalPrice) * 10000).toFixed(2));

  return {
    algoType: "ICEBERG",
    parentQty: totalQty,
    side,
    arrivalPrice,
    avgExecutionPrice,
    totalTradedValue,
    implementationShortfallBps: isBps,
    slippageCost: Math.round(Math.abs(avgExecutionPrice - arrivalPrice) * totalQty),
    exchangeFees: Math.round(totalTradedValue * 0.00025),
    sorSavingsVsSingleVenue: Math.round(totalQty * 2.2), // Concealment alpha
    venueBreakdown: {
      nseQty: Math.round(totalQty * 0.75),
      nsePct: 75,
      bseQty: Math.round(totalQty * 0.25),
      bsePct: 25,
    },
    clips,
  };
}
