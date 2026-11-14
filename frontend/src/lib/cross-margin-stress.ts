// Milestone 17: Multi-Asset Cross-Margin & Portfolio Stress Testing Engine
// Implements SEBI PRAN/SPAN-style margin relief and institutional RMS scenario stress testing

export interface PositionSummary {
  symbol: string;
  qty: number;
  avg: number;
  ltp: number;
  assetClass?: "EQUITY" | "FUTURE" | "OPTION_CE" | "OPTION_PE";
  strike?: number;
  expiry?: string;
  beta?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

export interface CrossMarginResult {
  unhedgedMargin: number;
  crossMarginRequired: number;
  marginRelief: number;
  reliefPercentage: number;
  marginUtilization: number;
  isMarginDeficient: boolean;
  shortfallAmount: number;
  hedgeBreakdown: {
    category: string;
    description: string;
    reliefAmount: number;
  }[];
}

export interface MarketShock {
  name: string;
  description: string;
  equityShockPct: number; // e.g. -1.8 for -1.8%
  vixShiftPts: number; // e.g. +3.5
  rateShiftBps: number; // e.g. +50 for +50 bps
}

export interface StressSimulationResult {
  scenarioName: string;
  baselineEquity: number;
  stressedEquity: number;
  mtmImpact: number;
  mtmImpactPct: number;
  stressedMarginRequired: number;
  isMarginCallTriggered: boolean;
  marginShortfall: number;
  rule43Breached: boolean; // Daily drawdown > 1.50%
  rule43Threshold: number; // 1.5% of baseline capital
  portfolioGreeks: {
    netDelta: number; // ₹ per 1% market move
    netGamma: number; // change in Delta per 1% move
    netTheta: number; // ₹ decay per day
    netVega: number; // ₹ per 1 pt VIX shift
  };
}

export const PRESET_STRESS_SCENARIOS: MarketShock[] = [
  {
    name: "RBI Surprise Repo Hike (+50 bps)",
    description: "Monetary tightening: Rates +50 bps, Equities -1.8%, India VIX +3.5 pts.",
    equityShockPct: -1.8,
    vixShiftPts: 3.5,
    rateShiftBps: 50,
  },
  {
    name: "RBI Surprise Repo Cut (-50 bps)",
    description: "Monetary easing: Rates -50 bps, Equities +1.5%, India VIX -1.5 pts.",
    equityShockPct: 1.5,
    vixShiftPts: -1.5,
    rateShiftBps: -50,
  },
  {
    name: "Black Swan Overnight Gap (-3.5%)",
    description: "Geopolitical shock: -3.5% gap down, India VIX spikes +18.0 pts.",
    equityShockPct: -3.5,
    vixShiftPts: 18.0,
    rateShiftBps: 15,
  },
  {
    name: "FII Short Squeeze (+2.5%)",
    description: "Aggressive short squeeze: +2.5% gap up, India VIX compresses -2.5 pts.",
    equityShockPct: 2.5,
    vixShiftPts: -2.5,
    rateShiftBps: -10,
  },
];

/**
 * Calculates SEBI PRAN / SPAN-style cross-margin relief across Equities, Futures and Options
 */
export function calculateCrossMargin(
  positions: PositionSummary[],
  availableCash: number
): CrossMarginResult {
  if (!positions || positions.length === 0) {
    return {
      unhedgedMargin: 0,
      crossMarginRequired: 0,
      marginRelief: 0,
      reliefPercentage: 0,
      marginUtilization: 0,
      isMarginDeficient: false,
      shortfallAmount: 0,
      hedgeBreakdown: [],
    };
  }

  let unhedgedMargin = 0;
  let totalEquityExposure = 0;
  let totalFuturesExposure = 0;
  let optionsMaxLossMargin = 0;

  const hedgeBreakdown: { category: string; description: string; reliefAmount: number }[] = [];

  // Categorize positions
  positions.forEach((p) => {
    const value = Math.abs(p.qty * p.ltp);
    const assetClass = p.assetClass || (p.symbol.includes("FUT") ? "FUTURE" : p.symbol.includes("CE") ? "OPTION_CE" : p.symbol.includes("PE") ? "OPTION_PE" : "EQUITY");

    if (assetClass === "EQUITY") {
      // Standard SEBI equity delivery margin is 20% (VaR 12.5% + ELM 7.5%)
      const margin = value * 0.20;
      unhedgedMargin += margin;
      totalEquityExposure += (p.qty > 0 ? value : -value);
    } else if (assetClass === "FUTURE") {
      // Standard futures initial margin is 22%
      const margin = value * 0.22;
      unhedgedMargin += margin;
      totalFuturesExposure += (p.qty > 0 ? value : -value);
    } else {
      // Options
      const margin = p.qty < 0 ? value * 0.25 : Math.abs(p.qty * p.avg); // Short options require ~25% span, long is premium paid
      unhedgedMargin += margin;
      optionsMaxLossMargin += margin;
    }
  });

  // Calculate Cross-Margin Relief:
  // 1. Cash Equity + Opposite Futures position (Cash-Futures hedge)
  let hedgedFuturesRelief = 0;
  if (totalEquityExposure > 0 && totalFuturesExposure < 0) {
    const hedgedValue = Math.min(totalEquityExposure, Math.abs(totalFuturesExposure));
    // SEBI PRAN provides up to 75% margin relief on the hedged portion of futures
    hedgedFuturesRelief = hedgedValue * 0.22 * 0.75;
    hedgeBreakdown.push({
      category: "Cash-Futures Cross Hedge",
      description: `Hedged ₹${Math.round(hedgedValue).toLocaleString("en-IN")} equity against short futures.`,
      reliefAmount: hedgedFuturesRelief,
    });
  } else if (totalEquityExposure < 0 && totalFuturesExposure > 0) {
    const hedgedValue = Math.min(Math.abs(totalEquityExposure), totalFuturesExposure);
    hedgedFuturesRelief = hedgedValue * 0.22 * 0.70;
    hedgeBreakdown.push({
      category: "Short Cash-Long Futures Spread",
      description: `Hedged ₹${Math.round(hedgedValue).toLocaleString("en-IN")} short cash against long futures.`,
      reliefAmount: hedgedFuturesRelief,
    });
  }

  // 2. Options Hedging Relief (Collar / Married Put / Bull Spread)
  let optionsHedgeRelief = 0;
  const puts = positions.filter((p) => p.symbol.includes("PE") && p.qty > 0);
  if (totalEquityExposure > 0 && puts.length > 0) {
    // Protective Put / Married Put limits tail-risk
    optionsHedgeRelief = totalEquityExposure * 0.20 * 0.40; // 40% relief on equity VaR
    hedgeBreakdown.push({
      category: "Protective Put / Tail Risk Hedge",
      description: "Downside risk bounded by long index put option coverage.",
      reliefAmount: optionsHedgeRelief,
    });
  }

  const totalRelief = hedgedFuturesRelief + optionsHedgeRelief;
  const crossMarginRequired = Math.max(unhedgedMargin * 0.25, unhedgedMargin - totalRelief);
  const reliefPercentage = unhedgedMargin > 0 ? (totalRelief / unhedgedMargin) * 100 : 0;
  const totalCapital = availableCash + positions.reduce((s, p) => s + (p.qty * p.ltp), 0);
  const marginUtilization = totalCapital > 0 ? (crossMarginRequired / totalCapital) * 100 : 0;
  const isMarginDeficient = crossMarginRequired > availableCash;
  const shortfallAmount = isMarginDeficient ? crossMarginRequired - availableCash : 0;

  return {
    unhedgedMargin,
    crossMarginRequired,
    marginRelief: totalRelief,
    reliefPercentage,
    marginUtilization,
    isMarginDeficient,
    shortfallAmount,
    hedgeBreakdown,
  };
}

/**
 * Simulates institutional macro scenario shock on portfolio P&L and Greeks
 */
export function simulatePortfolioStress(
  positions: PositionSummary[],
  availableCash: number,
  shock: MarketShock
): StressSimulationResult {
  const baselineHoldings = positions.reduce((s, p) => s + (p.qty * p.ltp), 0);
  const baselineEquity = availableCash + baselineHoldings;

  let stressedHoldings = 0;
  let netDelta = 0;
  let netGamma = 0;
  let netTheta = 0;
  let netVega = 0;

  positions.forEach((p) => {
    const beta = p.beta ?? (p.symbol.includes("BANK") ? 1.3 : p.symbol.includes("IT") ? 0.9 : 1.0);
    // Shock scaling based on beta
    const assetShockPct = (shock.equityShockPct * beta) / 100;
    const stressedLtp = Math.max(0.05, p.ltp * (1 + assetShockPct));
    
    // Greek approximations if not supplied
    const positionValue = p.qty * p.ltp;
    const delta = p.delta ?? (p.symbol.includes("PE") ? -0.5 : p.symbol.includes("CE") ? 0.5 : 1.0);
    const gamma = p.gamma ?? 0.002;
    const theta = p.theta ?? -0.05;
    const vega = p.vega ?? (Math.abs(positionValue) * 0.001);

    // Vega P&L impact: vega * vixShiftPts * qty
    const vegaImpact = (vega * shock.vixShiftPts * (p.qty > 0 ? 1 : -1));
    const finalAssetPrice = stressedLtp + (vegaImpact / Math.max(1, Math.abs(p.qty)));

    stressedHoldings += (p.qty * finalAssetPrice);

    netDelta += delta * p.qty * (p.ltp / 100);
    netGamma += gamma * p.qty;
    netTheta += theta * p.qty;
    netVega += vega * p.qty;
  });

  const stressedEquity = availableCash + stressedHoldings;
  const mtmImpact = stressedEquity - baselineEquity;
  const mtmImpactPct = baselineEquity > 0 ? (mtmImpact / baselineEquity) * 100 : 0;

  // Under market stress, exchange volatility shifts raise initial margin by 15-40%
  const volMultiplier = 1 + (Math.max(0, shock.vixShiftPts) * 0.02);
  const stressedMarginRequired = positions.reduce((s, p) => s + Math.abs(p.qty * p.ltp * 0.20), 0) * volMultiplier;
  const isMarginCallTriggered = stressedEquity < stressedMarginRequired * 0.5;
  const marginShortfall = isMarginCallTriggered ? (stressedMarginRequired * 0.5) - stressedEquity : 0;

  // Rule 4.3 Capital Risk Gate: Maximum allowed daily drawdown is 1.50%
  const rule43Threshold = baselineEquity * 0.015;
  const rule43Breached = Math.abs(Math.min(0, mtmImpact)) > rule43Threshold;

  return {
    scenarioName: shock.name,
    baselineEquity,
    stressedEquity,
    mtmImpact,
    mtmImpactPct,
    stressedMarginRequired,
    isMarginCallTriggered,
    marginShortfall,
    rule43Breached,
    rule43Threshold,
    portfolioGreeks: {
      netDelta,
      netGamma,
      netTheta,
      netVega,
    },
  };
}
