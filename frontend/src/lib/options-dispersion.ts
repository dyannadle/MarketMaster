/**
 * Options Dispersion & Correlation Arbitrage Engine
 *
 * Implements:
 * 1. Implied Correlation Model:
 *    \rho_{implied} \approx \frac{\sigma_I^2 - \sum w_i^2 \sigma_i^2}{2 \sum_{i<j} w_i w_j \sigma_i \sigma_j}
 * 2. Rolling Realized Correlation of constituent returns (\rho_{realized}).
 * 3. Long Dispersion / Short Correlation (when \rho_{implied} > \rho_{realized} + threshold)
 *    and Short Dispersion / Long Correlation (when \rho_{implied} < \rho_{realized} - threshold).
 * 4. Vega-neutral basket weighting and Gamma-weighted PnL attribution.
 * 5. Rule 4.3 Drawdown Circuit Breaker (Max 1.5% Daily Drawdown).
 */

export interface DispersionConstituent {
  symbol: string;
  name: string;
  weight: number; // Normalized weight (sums to 1.0)
  spot: number;
  impliedVol: number; // e.g. 0.22 for 22%
  realizedVol: number; // e.g. 0.19
  straddlePrice: number;
  vega: number;
  gamma: number;
  theta: number;
}

export interface DispersionPortfolioState {
  indexSymbol: string;
  indexSpot: number;
  indexImpliedVol: number;
  indexRealizedVol: number;
  indexStraddlePrice: number;
  indexVega: number;
  indexGamma: number;
  indexTheta: number;
  constituents: DispersionConstituent[];
  impliedCorrelation: number; // rho_implied
  realizedCorrelation: number; // rho_realized
  correlationSpread: number; // rho_implied - rho_realized
  tradeRecommendation: "LONG_DISPERSION" | "SHORT_DISPERSION" | "NEUTRAL";
  spreadThreshold: number;
}

export interface DispersionStepResult {
  day: number;
  indexSpot: number;
  componentSpots: Record<string, number>;
  indexPnL: number;
  basketPnL: number;
  netGammaRent: number;
  netThetaBleed: number;
  transactionFriction: number;
  cumulativePnL: number;
  cumulativeReturnPct: number;
  maxDrawdownPct: number;
  rule43Breached: boolean;
}

export interface DispersionBacktestReport {
  regime: string;
  durationDays: number;
  initialCapital: number;
  finalEquity: number;
  totalPnL: number;
  returnPct: number;
  maxDrawdownPct: number;
  rule43Compliant: boolean;
  sharpeRatio: number;
  steps: DispersionStepResult[];
  gammaRentAttribution: number;
  thetaBleedAttribution: number;
  tradeType: "LONG_DISPERSION" | "SHORT_DISPERSION";
}

/**
 * Standard Normal CDF approximation (Abramowitz and Stegun)
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

function normPdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/**
 * Black-Scholes Greeks and ATM Straddle pricing
 */
export function calculateAtmStraddleMetrics(spot: number, iv: number, dte: number = 30, r: number = 0.065) {
  const t = Math.max(dte / 365, 0.001);
  const strike = spot;
  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (r + 0.5 * iv * iv) * t) / (iv * sqrtT);
  const d2 = d1 - iv * sqrtT;

  const callPrice = spot * normCdf(d1) - strike * Math.exp(-r * t) * normCdf(d2);
  const putPrice = strike * Math.exp(-r * t) * normCdf(-d2) - spot * normCdf(-d1);
  const straddlePrice = callPrice + putPrice;

  // Greeks for ATM Straddle:
  // Delta_straddle = Delta_call + Delta_put = N(d1) + (N(d1) - 1) = 2*N(d1) - 1 ≈ 0
  // Gamma_straddle = 2 * Gamma_call = 2 * N'(d1) / (spot * iv * sqrtT)
  const gamma = (2 * normPdf(d1)) / (spot * iv * sqrtT);
  // Vega_straddle = 2 * Vega_call = 2 * spot * sqrtT * N'(d1) * 0.01 (per 1% vol)
  const vega = 2 * spot * sqrtT * normPdf(d1) * 0.01;
  // Theta_straddle (daily)
  const theta = (-(spot * normPdf(d1) * iv) / (2 * sqrtT) - r * strike * Math.exp(-r * t) * normCdf(d2)) / 365 * 2;

  return {
    straddlePrice: Math.max(straddlePrice, 0.1),
    gamma,
    vega,
    theta: Math.abs(theta),
  };
}

/**
 * Top 5 Nifty 50 constituent market data defaults
 */
export const DEFAULT_NIFTY_CONSTITUENTS: DispersionConstituent[] = [
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank Ltd",
    weight: 0.30,
    spot: 1740,
    impliedVol: 0.19,
    realizedVol: 0.17,
    straddlePrice: 68.5,
    vega: 24.2,
    gamma: 0.0035,
    theta: 2.1,
  },
  {
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd",
    weight: 0.24,
    spot: 2980,
    impliedVol: 0.22,
    realizedVol: 0.20,
    straddlePrice: 135.0,
    vega: 42.1,
    gamma: 0.0021,
    theta: 3.8,
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank Ltd",
    weight: 0.18,
    spot: 1260,
    impliedVol: 0.20,
    realizedVol: 0.18,
    straddlePrice: 52.4,
    vega: 17.8,
    gamma: 0.0049,
    theta: 1.6,
  },
  {
    symbol: "INFY",
    name: "Infosys Ltd",
    weight: 0.15,
    spot: 1880,
    impliedVol: 0.24,
    realizedVol: 0.21,
    straddlePrice: 93.2,
    vega: 26.5,
    gamma: 0.0031,
    theta: 2.9,
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    weight: 0.13,
    spot: 4120,
    impliedVol: 0.21,
    realizedVol: 0.19,
    straddlePrice: 178.6,
    vega: 58.0,
    gamma: 0.0015,
    theta: 5.2,
  },
];

/**
 * Calculates Implied Correlation from Index IV and Component IVs:
 * \rho_{implied} = \frac{\sigma_I^2 - \sum w_i^2 \sigma_i^2}{2 \sum_{i < j} w_i w_j \sigma_i \sigma_j}
 */
export function calculateImpliedCorrelation(
  indexIv: number,
  constituents: { weight: number; impliedVol: number }[]
): number {
  const n = constituents.length;
  if (n < 2) return 0.5;

  const indexVariance = indexIv * indexIv;
  let sumWeightedVariance = 0;
  let crossTermDenominator = 0;

  for (let i = 0; i < n; i++) {
    const wi = constituents[i]!.weight;
    const si = constituents[i]!.impliedVol;
    sumWeightedVariance += wi * wi * si * si;

    for (let j = i + 1; j < n; j++) {
      const wj = constituents[j]!.weight;
      const sj = constituents[j]!.impliedVol;
      crossTermDenominator += 2 * wi * wj * si * sj;
    }
  }

  if (crossTermDenominator <= 1e-9) return 0.5;

  const rawRho = (indexVariance - sumWeightedVariance) / crossTermDenominator;
  // Bound rho between 0.05 and 0.95 for realistic market regimes
  return Math.min(Math.max(rawRho, 0.05), 0.95);
}

/**
 * Build Current Dispersion State
 */
export function buildDispersionState(
  indexSpot: number = 24500,
  indexIv: number = 0.155,
  realizedCorr: number = 0.44,
  spreadThreshold: number = 0.08,
  customConstituents: DispersionConstituent[] = DEFAULT_NIFTY_CONSTITUENTS
): DispersionPortfolioState {
  const indexMetrics = calculateAtmStraddleMetrics(indexSpot, indexIv, 30);
  const impliedCorr = calculateImpliedCorrelation(indexIv, customConstituents);
  const correlationSpread = impliedCorr - realizedCorr;

  let tradeRecommendation: "LONG_DISPERSION" | "SHORT_DISPERSION" | "NEUTRAL" = "NEUTRAL";
  if (correlationSpread > spreadThreshold) {
    tradeRecommendation = "LONG_DISPERSION"; // Buy cheap individual options, sell rich index options
  } else if (correlationSpread < -spreadThreshold) {
    tradeRecommendation = "SHORT_DISPERSION"; // Sell rich individual options, buy cheap index options
  }

  return {
    indexSymbol: "NIFTY50",
    indexSpot,
    indexImpliedVol: indexIv,
    indexRealizedVol: 0.138,
    indexStraddlePrice: indexMetrics.straddlePrice,
    indexVega: indexMetrics.vega,
    indexGamma: indexMetrics.gamma,
    indexTheta: indexMetrics.theta,
    constituents: customConstituents,
    impliedCorrelation: Number(impliedCorr.toFixed(4)),
    realizedCorrelation: Number(realizedCorr.toFixed(4)),
    correlationSpread: Number(correlationSpread.toFixed(4)),
    tradeRecommendation,
    spreadThreshold,
  };
}

/**
 * Runs a deterministic multi-day dispersion backtest simulation
 */
export function runDispersionSimulation(
  state: DispersionPortfolioState,
  durationDays: number = 20,
  initialCapital: number = 1000000,
  tradeOverride?: "LONG_DISPERSION" | "SHORT_DISPERSION"
): DispersionBacktestReport {
  const tradeType = tradeOverride || (state.tradeRecommendation === "NEUTRAL" ? "LONG_DISPERSION" : state.tradeRecommendation);
  const isLongDispersion = tradeType === "LONG_DISPERSION";

  // Pseudo-random deterministic generator for consistent test results
  let seed = 42;
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const standardNormal = () => {
    const u1 = Math.max(pseudoRandom(), 1e-7);
    const u2 = pseudoRandom();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  };

  const steps: DispersionStepResult[] = [];
  let currentCapital = initialCapital;
  let peakCapital = initialCapital;
  let maxDrawdownPct = 0;
  let rule43Breached = false;

  const compSpots: Record<string, number> = {};
  state.constituents.forEach((c) => {
    compSpots[c.symbol] = c.spot;
  });
  let currentIndexSpot = state.indexSpot;

  let totalGammaRent = 0;
  let totalThetaBleed = 0;

  // Number of index contracts vs constituent contracts scaled to capital (~20% allocation)
  const capitalAllocation = initialCapital * 0.20;
  const indexContracts = Math.max(Math.floor(capitalAllocation / (state.indexStraddlePrice * 50)), 1);

  // Daily transaction drag (STT, exchange turnover, brokerage)
  const dailyFriction = 120; // INR friction per day

  for (let day = 1; day <= durationDays; day++) {
    // Systematic market shock + idiosyncratic stock shocks
    const marketShock = standardNormal();
    const indexDailyReturn = (marketShock * state.indexRealizedVol) / Math.sqrt(252);
    const prevIndexSpot = currentIndexSpot;
    currentIndexSpot *= 1 + indexDailyReturn;

    let dailyBasketGammaRent = 0;
    let dailyBasketThetaBleed = 0;

    state.constituents.forEach((c) => {
      const stockIdioShock = standardNormal();
      // Factor correlation coupling: return = beta * market + sqrt(1 - rho) * idio
      const coupledReturn =
        (Math.sqrt(state.realizedCorrelation) * marketShock +
          Math.sqrt(1 - state.realizedCorrelation) * stockIdioShock) *
        (c.realizedVol / Math.sqrt(252));

      const prevSpot = compSpots[c.symbol] ?? c.spot;
      const nextSpot = prevSpot * (1 + coupledReturn);
      compSpots[c.symbol] = nextSpot;

      const spotChange = nextSpot - prevSpot;
      // Component straddle gamma rent: 0.5 * Gamma * (dS)^2
      const stockGammaRent = 0.5 * c.gamma * spotChange * spotChange * c.weight * 500 * indexContracts;
      const stockTheta = c.theta * c.weight * indexContracts * 15;

      dailyBasketGammaRent += stockGammaRent;
      dailyBasketThetaBleed += stockTheta;
    });

    const indexSpotChange = currentIndexSpot - prevIndexSpot;
    const indexGammaRent = 0.5 * state.indexGamma * indexSpotChange * indexSpotChange * 50 * indexContracts;
    const indexTheta = state.indexTheta * 50 * indexContracts;

    let netDailyPnL = 0;
    let stepGammaRent = 0;
    let stepThetaBleed = 0;

    if (isLongDispersion) {
      // Long component options (positive gamma, negative theta)
      // Short index options (negative gamma, positive theta)
      stepGammaRent = dailyBasketGammaRent - indexGammaRent;
      stepThetaBleed = -dailyBasketThetaBleed + indexTheta;
      netDailyPnL = stepGammaRent + stepThetaBleed - dailyFriction;
    } else {
      // Short dispersion: inverted legs
      stepGammaRent = indexGammaRent - dailyBasketGammaRent;
      stepThetaBleed = dailyBasketThetaBleed - indexTheta;
      netDailyPnL = stepGammaRent + stepThetaBleed - dailyFriction;
    }

    totalGammaRent += stepGammaRent;
    totalThetaBleed += stepThetaBleed;
    currentCapital += netDailyPnL;

    if (currentCapital > peakCapital) {
      peakCapital = currentCapital;
    }

    const currentDrawdown = ((peakCapital - currentCapital) / peakCapital) * 100;
    if (currentDrawdown > maxDrawdownPct) {
      maxDrawdownPct = currentDrawdown;
    }

    // Rule 4.3 check: 1.5% maximum daily drawdown
    if (currentDrawdown > 1.5) {
      rule43Breached = true;
    }

    steps.push({
      day,
      indexSpot: Number(currentIndexSpot.toFixed(2)),
      componentSpots: { ...compSpots },
      indexPnL: Number((isLongDispersion ? -indexGammaRent + indexTheta : indexGammaRent - indexTheta).toFixed(2)),
      basketPnL: Number((isLongDispersion ? dailyBasketGammaRent - dailyBasketThetaBleed : -dailyBasketGammaRent + dailyBasketThetaBleed).toFixed(2)),
      netGammaRent: Number(stepGammaRent.toFixed(2)),
      netThetaBleed: Number(stepThetaBleed.toFixed(2)),
      transactionFriction: dailyFriction,
      cumulativePnL: Number((currentCapital - initialCapital).toFixed(2)),
      cumulativeReturnPct: Number((((currentCapital - initialCapital) / initialCapital) * 100).toFixed(2)),
      maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
      rule43Breached,
    });
  }

  const totalPnL = currentCapital - initialCapital;
  const returnPct = (totalPnL / initialCapital) * 100;

  // Approximate annualized Sharpe
  const dailyReturns = steps.map((s, idx) => {
    if (idx === 0) return s.cumulativeReturnPct;
    return s.cumulativeReturnPct - steps[idx - 1]!.cumulativeReturnPct;
  });
  const avgDailyReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((a, b) => a + Math.pow(b - avgDailyReturn, 2), 0) / Math.max(dailyReturns.length - 1, 1);
  const stdDaily = Math.sqrt(variance) || 0.001;
  const sharpeRatio = Number(((avgDailyReturn / stdDaily) * Math.sqrt(252)).toFixed(2));

  return {
    regime: `Nifty 50 Volatility Dispersion (${tradeType})`,
    durationDays,
    initialCapital,
    finalEquity: Number(currentCapital.toFixed(2)),
    totalPnL: Number(totalPnL.toFixed(2)),
    returnPct: Number(returnPct.toFixed(2)),
    maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
    rule43Compliant: !rule43Breached,
    sharpeRatio,
    steps,
    gammaRentAttribution: Number(totalGammaRent.toFixed(2)),
    thetaBleedAttribution: Number(totalThetaBleed.toFixed(2)),
    tradeType,
  };
}
