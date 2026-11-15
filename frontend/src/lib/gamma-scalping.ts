// Milestone 40: Options Delta-Neutral Gamma Scalping Simulator
// Models long straddle/strangle delta rebalancing, theta decay vs gamma PnL race, and micro-futures hedging.

import { cdfNormal, pdfNormal, blackScholesPrice } from "./volatility-surface";

export interface OptionLeg {
  type: "CALL" | "PUT";
  strike: number;
  dte: number;
  qty: number; // positive for long
  iv: number;  // in percent (e.g. 15.0)
  entryPrice: number;
}

export interface GammaScalpTick {
  tickIndex: number;
  timeLabel: string;
  spotPrice: number;
  portfolioDelta: number; // Net Delta before rebalance
  deltaTolerance: number;
  actionTaken: "NONE" | "SELL_FUTURES" | "BUY_FUTURES";
  hedgeQty: number; // number of futures contracts traded
  hedgePrice: number;
  postHedgeDelta: number; // Delta after scalp (approx 0)
  cumulativeGammaPnl: number;
  cumulativeThetaBleed: number;
  cumulativeFrictionCost: number; // brokerage + taxes
  netPnl: number;
  realizedVolPercent: number;
  impliedVolPercent: number;
}

export interface GammaScalpSimulationResult {
  symbol: string;
  underlyingSpot: number;
  straddleStrike: number;
  initialStraddleCost: number;
  totalScalps: number;
  grossGammaProfit: number;
  totalThetaDecay: number;
  totalTransactionFriction: number;
  netGammaRent: number;
  maxDrawdownPct: number;
  rule43Compliant: boolean; // Drawdown <= 1.5%
  ticks: GammaScalpTick[];
  volatilitySpread: number; // Realized Vol - Implied Vol
}

export interface ScalpConfig {
  symbol: string;
  spotPrice: number;
  strike: number;
  dte: number;
  impliedVol: number; // e.g. 15.0 (%)
  realizedVol: number; // e.g. 22.0 (%)
  deltaThreshold: number; // e.g. 25 (delta tolerance before trigger)
  frictionPerScalpInr: number; // e.g. 40 (brokerage + turnover tax)
  lotSize: number; // e.g. 50 (Nifty)
  numTicks: number; // e.g. 40
}

// 1. Analytical Black-Scholes Greeks: Delta and Gamma
export function computeStraddleGreeks(
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
  lotSize: number = 50
): { delta: number; gamma: number; thetaPerDay: number; straddlePrice: number } {
  if (T <= 0.0001 || sigma <= 0.0001) {
    return { delta: 0, gamma: 0, thetaPerDay: 0, straddlePrice: Math.abs(S - K) };
  }

  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
  const d2 = d1 - sigma * sqrtT;

  const nd1 = cdfNormal(d1);
  const npd1 = pdfNormal(d1);

  // Call Delta = N(d1), Put Delta = N(d1) - 1
  // Net Straddle Delta = N(d1) + (N(d1) - 1) = 2*N(d1) - 1
  const netDeltaPerUnit = 2.0 * nd1 - 1.0;
  const netDelta = netDeltaPerUnit * lotSize;

  // Gamma is identical for Call and Put: pdf(d1) / (S * sigma * sqrt(T))
  // Combined Straddle Gamma = 2 * Gamma_single
  const singleGamma = npd1 / (S * sigma * sqrtT);
  const combinedGamma = 2.0 * singleGamma * lotSize;

  // Theta (Annualized to daily decay):
  // Call Theta: -S*pdf(d1)*sigma/(2*sqrt(T)) - r*K*exp(-rT)*N(d2)
  // Put Theta: -S*pdf(d1)*sigma/(2*sqrt(T)) + r*K*exp(-rT)*N(-d2)
  const commonTerm = (-S * npd1 * sigma) / (2.0 * sqrtT);
  const straddleAnnualTheta = 2.0 * commonTerm - r * K * Math.exp(-r * T) * (cdfNormal(d2) - cdfNormal(-d2));
  const dailyTheta = (straddleAnnualTheta / 365.0) * lotSize; // negative value

  const callPx = blackScholesPrice(S, K, T, r, sigma, true);
  const putPx = blackScholesPrice(S, K, T, r, sigma, false);
  const straddlePrice = (callPx + putPx) * lotSize;

  return {
    delta: Math.round(netDelta * 100) / 100,
    gamma: Math.round(combinedGamma * 1000) / 1000,
    thetaPerDay: Math.round(dailyTheta * 10) / 10,
    straddlePrice: Math.round(straddlePrice),
  };
}

// 2. Simulate Multi-Tick Gamma Scalping Replay
export function runGammaScalpingSimulation(config: ScalpConfig): GammaScalpSimulationResult {
  const {
    symbol,
    spotPrice,
    strike,
    dte,
    impliedVol,
    realizedVol,
    deltaThreshold,
    frictionPerScalpInr,
    lotSize,
    numTicks,
  } = config;

  const r = 0.065;
  const tYear = Math.max(dte / 365.0, 0.005);
  const sigmaIV = impliedVol / 100.0;
  const sigmaRV = realizedVol / 100.0;

  const initialGreeks = computeStraddleGreeks(spotPrice, strike, tYear, r, sigmaIV, lotSize);
  const initialCost = initialGreeks.straddlePrice;

  let currentSpot = spotPrice;
  let cumGammaPnl = 0;
  let cumThetaBleed = 0;
  let cumFriction = 0;
  let totalScalps = 0;
  let peakPnl = 0;
  let maxDrawdownInr = 0;

  const ticks: GammaScalpTick[] = [];
  const dtTick = (1.0 / 375.0); // 1 tick represents ~1 minute of trading day (375 trading minutes)

  // Daily theta decay per tick
  const dailyTheta = Math.abs(initialGreeks.thetaPerDay);
  const thetaPerTick = dailyTheta / 375.0;

  let hedgePosition = 0; // cumulative futures hedges held

  for (let i = 0; i < numTicks; i++) {
    // Generate spot price fluctuation driven by realized volatility
    const randShock = (Math.random() - 0.49) * 2.0; // [-1, 1]
    const spotStep = currentSpot * (sigmaRV / Math.sqrt(252 * 375)) * randShock * 2.5;
    const prevSpot = currentSpot;
    currentSpot = Math.round((currentSpot + spotStep) * 10) / 10;

    // Time elapsed in years
    const currentT = Math.max(tYear - (i * dtTick) / 365.0, 0.001);
    const greeks = computeStraddleGreeks(currentSpot, strike, currentT, r, sigmaIV, lotSize);

    // Option Delta + Futures Hedge Delta
    const netDeltaBefore = greeks.delta + hedgePosition;

    // Gamma PnL for this step: 0.5 * Gamma * (DeltaS)^2
    const dS = currentSpot - prevSpot;
    const stepGammaPnl = 0.5 * greeks.gamma * (dS * dS);
    cumGammaPnl += stepGammaPnl;

    // Theta bleed for this step
    cumThetaBleed += thetaPerTick;

    // Check if Delta exceeds tolerance threshold
    let actionTaken: "NONE" | "SELL_FUTURES" | "BUY_FUTURES" = "NONE";
    let hedgeQty = 0;
    let postDelta = netDeltaBefore;

    if (Math.abs(netDeltaBefore) >= deltaThreshold) {
      totalScalps++;
      cumFriction += frictionPerScalpInr;

      if (netDeltaBefore > 0) {
        // Long delta -> Sell futures to flatten
        actionTaken = "SELL_FUTURES";
        hedgeQty = Math.round(netDeltaBefore);
        hedgePosition -= hedgeQty;
      } else {
        // Short delta -> Buy futures to flatten
        actionTaken = "BUY_FUTURES";
        hedgeQty = Math.round(Math.abs(netDeltaBefore));
        hedgePosition += hedgeQty;
      }
      postDelta = greeks.delta + hedgePosition;
    }

    const netPnl = Math.round(cumGammaPnl - cumThetaBleed - cumFriction);
    if (netPnl > peakPnl) peakPnl = netPnl;
    const dd = peakPnl - netPnl;
    if (dd > maxDrawdownInr) maxDrawdownInr = dd;

    const hh = String(9 + Math.floor(i / 60)).padStart(2, "0");
    const mm = String(15 + (i % 60)).padStart(2, "0");

    ticks.push({
      tickIndex: i + 1,
      timeLabel: `${hh}:${mm}`,
      spotPrice: currentSpot,
      portfolioDelta: Math.round(netDeltaBefore * 10) / 10,
      deltaTolerance: deltaThreshold,
      actionTaken,
      hedgeQty,
      hedgePrice: currentSpot,
      postHedgeDelta: Math.round(postDelta * 10) / 10,
      cumulativeGammaPnl: Math.round(cumGammaPnl),
      cumulativeThetaBleed: Math.round(cumThetaBleed),
      cumulativeFrictionCost: Math.round(cumFriction),
      netPnl,
      realizedVolPercent: realizedVol,
      impliedVolPercent: impliedVol,
    });
  }

  const maxDrawdownPct = initialCost > 0 ? (maxDrawdownInr / initialCost) * 100.0 : 0;
  const netGammaRent = Math.round(cumGammaPnl - cumThetaBleed - cumFriction);

  return {
    symbol,
    underlyingSpot: spotPrice,
    straddleStrike: strike,
    initialStraddleCost: initialCost,
    totalScalps,
    grossGammaProfit: Math.round(cumGammaPnl),
    totalThetaDecay: Math.round(cumThetaBleed),
    totalTransactionFriction: Math.round(cumFriction),
    netGammaRent,
    maxDrawdownPct: Math.round(maxDrawdownPct * 10) / 10,
    rule43Compliant: maxDrawdownPct <= 1.5,
    ticks,
    volatilitySpread: Math.round((realizedVol - impliedVol) * 10) / 10,
  };
}
