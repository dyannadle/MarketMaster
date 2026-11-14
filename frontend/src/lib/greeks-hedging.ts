// Milestone 29: Multi-Leg Option Greeks Hedging & Dynamic Delta-Neutral Rebalancer
// Implements automated Delta-Gamma neutrality solver, corridor monitoring (|Delta| > 50), and hedging cost efficiency

export interface PositionGreeks {
  symbol: string;
  assetType: "EQUITY" | "FUTURES" | "CALL" | "PUT";
  qty: number;
  strike?: number | undefined;
  expiry?: string | undefined;
  ltp: number;
  delta: number; // per unit
  gamma: number; // per unit
  theta: number; // per unit
  vega: number;  // per unit
}

export interface PortfolioGreeksSummary {
  netDelta: number;
  netGamma: number;
  netTheta: number;
  netVega: number;
  toleranceCorridor: number; // e.g. 50 delta units
  isRebalanceRequired: boolean;
  unhedgedDailyVar: number; // ₹ at risk for a 1.5% market move
}

export interface HedgeOrderRecommendation {
  action: "BUY" | "SELL";
  instrument: string;
  assetType: "FUTURES" | "CALL" | "PUT";
  qty: number;
  lots: number;
  estimatedPrice: number;
  deltaContribution: number;
  gammaContribution: number;
  estimatedSlippage: number;
  exchangeTaxes: number;
  totalCost: number;
}

export interface GreeksHedgingPlan {
  mode: "DELTA_ONLY" | "DELTA_GAMMA";
  baselineGreeks: PortfolioGreeksSummary;
  projectedGreeks: {
    postHedgeDelta: number;
    postHedgeGamma: number;
    postHedgeTheta: number;
    postHedgeVega: number;
  };
  recommendations: HedgeOrderRecommendation[];
  unhedgedRisk: number;       // ₹ unhedged 1-day 99% VaR
  residualRisk: number;       // ₹ post-hedge residual variance
  hedgingEfficiencyPct: number; // % risk eliminated
  totalHedgingCost: number;   // ₹ fees + slippage
  basisDragBps: number;       // bps of capital cost
}

export const SAMPLE_OPTIONS_PORTFOLIO: PositionGreeks[] = [
  { symbol: "NIFTY_24500_CE", assetType: "CALL", qty: 250, strike: 24500, expiry: "28D", ltp: 240.0, delta: 0.52, gamma: 0.0012, theta: -14.5, vega: 18.2 },
  { symbol: "NIFTY_24600_CE", assetType: "CALL", qty: -500, strike: 24600, expiry: "28D", ltp: 180.0, delta: -0.42, gamma: -0.0011, theta: 26.0, vega: -32.0 },
  { symbol: "NIFTY_24400_PE", assetType: "PUT", qty: 250, strike: 24400, expiry: "28D", ltp: 195.0, delta: -0.45, gamma: 0.0011, theta: -12.0, vega: 16.5 },
  { symbol: "NIFTY_FUT", assetType: "FUTURES", qty: 100, ltp: 24520.0, delta: 1.0, gamma: 0.0, theta: 0.0, vega: 0.0 },
];

// 1. Calculate Aggregated Portfolio Greeks
export function computePortfolioGreeks(
  positions: PositionGreeks[] = SAMPLE_OPTIONS_PORTFOLIO,
  toleranceCorridor: number = 50
): PortfolioGreeksSummary {
  let netDelta = 0;
  let netGamma = 0;
  let netTheta = 0;
  let netVega = 0;

  positions.forEach((pos) => {
    netDelta += pos.qty * pos.delta;
    netGamma += pos.qty * pos.gamma;
    netTheta += pos.qty * pos.theta;
    netVega += pos.qty * pos.vega;
  });

  netDelta = Number(netDelta.toFixed(2));
  netGamma = Number(netGamma.toFixed(4));
  netTheta = Number(netTheta.toFixed(2));
  netVega = Number(netVega.toFixed(2));

  // Daily VaR proxy for a 1.5% adverse market move
  const spot = 24500;
  const move150Bps = spot * 0.015;
  const unhedgedDailyVar = Math.round(Math.abs(netDelta * move150Bps) + 0.5 * Math.abs(netGamma * move150Bps * move150Bps));

  return {
    netDelta,
    netGamma,
    netTheta,
    netVega,
    toleranceCorridor,
    isRebalanceRequired: Math.abs(netDelta) > toleranceCorridor,
    unhedgedDailyVar,
  };
}

// 2. Solve Delta and Delta-Gamma Neutrality
export function solveHedgingPlan(
  positions: PositionGreeks[] = SAMPLE_OPTIONS_PORTFOLIO,
  mode: "DELTA_ONLY" | "DELTA_GAMMA" = "DELTA_ONLY",
  lotSize: number = 25,
  underlyingPrice: number = 24500
): GreeksHedgingPlan {
  const baseline = computePortfolioGreeks(positions);
  const recommendations: HedgeOrderRecommendation[] = [];

  let postDelta = baseline.netDelta;
  let postGamma = baseline.netGamma;
  let postTheta = baseline.netTheta;
  let postVega = baseline.netVega;

  if (mode === "DELTA_ONLY") {
    // Neutralize Delta using Nifty Futures (Delta = 1.0, Gamma = 0)
    // Target Delta = 0
    const deltaToHedge = -baseline.netDelta;
    const requiredLots = Math.round(deltaToHedge / lotSize);
    const hedgeQty = requiredLots * lotSize;

    if (hedgeQty !== 0) {
      const action = hedgeQty > 0 ? "BUY" : "SELL";
      const absQty = Math.abs(hedgeQty);
      const estPrice = underlyingPrice + (action === "BUY" ? 0.5 : -0.5);
      const slippage = Math.round(absQty * 0.5);
      const taxes = Math.round(absQty * estPrice * 0.00015);

      recommendations.push({
        action,
        instrument: "NIFTY_FUT",
        assetType: "FUTURES",
        qty: absQty,
        lots: Math.abs(requiredLots),
        estimatedPrice: estPrice,
        deltaContribution: hedgeQty, // hedgeQty * 1.0
        gammaContribution: 0,
        estimatedSlippage: slippage,
        exchangeTaxes: taxes,
        totalCost: slippage + taxes,
      });

      postDelta = Number((baseline.netDelta + hedgeQty).toFixed(2));
    }
  } else {
    // Dual Delta-Gamma Neutralizer (using ATM Options + Futures)
    // ATM Option: Delta = 0.50, Gamma = 0.0012, Theta = -15, Vega = 18
    const atmGamma = 0.0012;
    const atmDelta = 0.50;

    // 1. First neutralize Gamma via ATM Options: Qty_opt * atmGamma = -netGamma
    const optDeltaToHedgeGamma = -baseline.netGamma / atmGamma;
    const optLots = Math.round(optDeltaToHedgeGamma / lotSize);
    const optQty = optLots * lotSize;

    if (optQty !== 0) {
      const action = optQty > 0 ? "BUY" : "SELL";
      const absQty = Math.abs(optQty);
      const estPrice = 220.0;
      const slippage = Math.round(absQty * 0.8);
      const taxes = Math.round(absQty * estPrice * 0.0006);

      recommendations.push({
        action,
        instrument: `NIFTY_${underlyingPrice}_CE`,
        assetType: "CALL",
        qty: absQty,
        lots: Math.abs(optLots),
        estimatedPrice: estPrice,
        deltaContribution: Number((optQty * atmDelta).toFixed(2)),
        gammaContribution: Number((optQty * atmGamma).toFixed(4)),
        estimatedSlippage: slippage,
        exchangeTaxes: taxes,
        totalCost: slippage + taxes,
      });

      postGamma = Number((baseline.netGamma + optQty * atmGamma).toFixed(4));
      postTheta = Number((baseline.netTheta + optQty * -15).toFixed(2));
      postVega = Number((baseline.netVega + optQty * 18).toFixed(2));
    }

    // 2. Remaining Delta neutralized via Futures
    const remainingDelta = -(baseline.netDelta + optQty * atmDelta);
    const futLots = Math.round(remainingDelta / lotSize);
    const futQty = futLots * lotSize;

    if (futQty !== 0) {
      const action = futQty > 0 ? "BUY" : "SELL";
      const absQty = Math.abs(futQty);
      const estPrice = underlyingPrice + (action === "BUY" ? 0.5 : -0.5);
      const slippage = Math.round(absQty * 0.5);
      const taxes = Math.round(absQty * estPrice * 0.00015);

      recommendations.push({
        action,
        instrument: "NIFTY_FUT",
        assetType: "FUTURES",
        qty: absQty,
        lots: Math.abs(futLots),
        estimatedPrice: estPrice,
        deltaContribution: futQty,
        gammaContribution: 0,
        estimatedSlippage: slippage,
        exchangeTaxes: taxes,
        totalCost: slippage + taxes,
      });

      postDelta = Number((baseline.netDelta + optQty * atmDelta + futQty).toFixed(2));
    }
  }

  // Cost & Efficiency Metrics
  const totalCost = recommendations.reduce((sum, r) => sum + r.totalCost, 0);
  const spotMove150Bps = underlyingPrice * 0.015;
  const residualRisk = Math.round(
    Math.abs(postDelta * spotMove150Bps) + 0.5 * Math.abs(postGamma * spotMove150Bps * spotMove150Bps)
  );

  const riskReduction = Math.max(0, baseline.unhedgedDailyVar - residualRisk);
  const hedgingEfficiencyPct = baseline.unhedgedDailyVar > 0
    ? Number(((riskReduction / baseline.unhedgedDailyVar) * 100).toFixed(1))
    : 100;

  const capitalBase = 1000000;
  const basisDragBps = Number(((totalCost / capitalBase) * 10000).toFixed(1));

  return {
    mode,
    baselineGreeks: baseline,
    projectedGreeks: {
      postHedgeDelta: postDelta,
      postHedgeGamma: postGamma,
      postHedgeTheta: postTheta,
      postHedgeVega: postVega,
    },
    recommendations,
    unhedgedRisk: baseline.unhedgedDailyVar,
    residualRisk,
    hedgingEfficiencyPct,
    totalHedgingCost: totalCost,
    basisDragBps,
  };
}
