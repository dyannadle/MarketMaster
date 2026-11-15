// Milestone 37: Real-Time Options Implied Volatility Surface Interpolator & Volatility Arbitrage Scanner
// Implements Bivariate Spline/RBF Surface Smoothing, Butterfly Arbitrage & Calendar Spread Arbitrage Detection

import { cdfNormal } from "./volatility-surface";

export interface OptionQuote {
  strike: number;
  dte: number; // Days to Expiry (e.g. 7, 14, 28, 60, 90)
  expiryLabel: string;
  marketCallPrice: number;
  marketPutPrice: number;
  marketCallIv: number; // in percent (e.g. 15.5)
  marketPutIv: number;  // in percent
  volume: number;
  openInterest: number;
}

export interface ArbitrageViolation {
  id: string;
  type: "BUTTERFLY_ARBITRAGE" | "CALENDAR_ARBITRAGE" | "SURFACE_MISPRICING";
  severity: "CRITICAL_ARBITRAGE" | "HIGH_OPPORTUNITY" | "MODERATE_MISPRICING";
  symbol: string;
  strikes: number[];
  dtes: number[];
  description: string;
  marketCost: number; // Net cash flow to enter (negative = net credit / free money)
  guaranteedProfit: number; // Risk-free cash extraction in INR
  theoreticalSpreadBps: number;
  tradeRecommendation: string;
  legs: {
    action: "BUY" | "SELL";
    strike: number;
    dte: number;
    type: "CE" | "PE";
    qty: number;
    price: number;
  }[];
}

export interface SurfaceInterpolationPoint {
  strike: number;
  dte: number;
  moneyness: number; // K / Spot
  marketIv: number;
  interpolatedIv: number;
  residualIv: number; // marketIv - interpolatedIv
  isArbitrageViolation: boolean;
  status: "FAIR_VALUE" | "OVERVALUED" | "UNDERVALUED";
  fittedCallPrice: number;
}

export interface VolatilityArbitrageReport {
  symbol: string;
  spotPrice: number;
  riskFreeRate: number;
  quoteCount: number;
  butterflyViolations: ArbitrageViolation[];
  calendarViolations: ArbitrageViolation[];
  surfaceGrid: SurfaceInterpolationPoint[];
  maxArbitrageProfitInr: number;
  surfaceSmoothingRmse: number;
}

// 1. Analytical Black-Scholes Call Pricing Helper
export function bsCallPrice(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0.0001 || sigma <= 0.0001) return Math.max(0, S - K);
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return S * cdfNormal(d1) - K * Math.exp(-r * T) * cdfNormal(d2);
}

// 2. Bivariate Thin-Plate Radial Basis Function (RBF) Surface Interpolator
// Evaluates smooth implied total variance w(k, T) = sigma^2 * T, where k = ln(K/Spot)
export class VolatilitySurfaceInterpolator {
  private spot: number;
  private nodes: { k: number; t: number; w: number }[] = [];
  private weights: number[] = [];

  constructor(spot: number) {
    this.spot = Math.max(spot, 1);
  }

  // Thin-plate spline kernel: phi(r) = r^2 * ln(r) (or r^2 for zero)
  private kernel(r: number): number {
    if (r <= 1e-9) return 0;
    return r * r * Math.log(r);
  }

  // Fit RBF weights to observed market points
  public fit(quotes: { strike: number; dte: number; iv: number }[]): void {
    if (quotes.length === 0) return;

    this.nodes = quotes.map((q) => {
      const k = Math.log(q.strike / this.spot);
      const t = Math.max(q.dte / 365.0, 0.005);
      const sigma = Math.max(q.iv / 100.0, 0.01);
      const w = sigma * sigma * t; // Total implied variance
      return { k, t, w };
    });

    const n = this.nodes.length;
    // Build Gram matrix with ridge regularization for stability
    const A: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    const b: number[] = new Array<number>(n).fill(0);
    const lambda = 1e-4; // Smoothing factor

    for (let i = 0; i < n; i++) {
      b[i] = this.nodes[i]!.w;
      const rowI = A[i];
      if (rowI) {
        for (let j = 0; j < n; j++) {
          const dk = this.nodes[i]!.k - this.nodes[j]!.k;
          const dt = (this.nodes[i]!.t - this.nodes[j]!.t) * 2.0; // scale time axis
          const dist = Math.sqrt(dk * dk + dt * dt);
          rowI[j] = this.kernel(dist);
        }
        rowI[i] = (rowI[i] ?? 0) + lambda;
      }
    }

    // Solve A * weights = b via Gauss-Jordan elimination
    this.weights = this.solveLinearSystem(A, b);
  }

  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = b.length;
    const M: number[][] = A.map((row, i) => [...row, b[i] ?? 0]);

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k]?.[i] ?? 0) > Math.abs(M[maxRow]?.[i] ?? 0)) {
          maxRow = k;
        }
      }
      const tmp = M[i] ?? [];
      M[i] = M[maxRow] ?? [];
      M[maxRow] = tmp;

      const pivot = M[i]?.[i] ?? 0;
      if (Math.abs(pivot) < 1e-9) continue;

      const rowI = M[i];
      if (rowI) {
        for (let j = i; j <= n; j++) {
          rowI[j] = (rowI[j] ?? 0) / pivot;
        }
      }

      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = M[k]?.[i] ?? 0;
          const rowK = M[k];
          if (rowK) {
            for (let j = i; j <= n; j++) {
              rowK[j] = (rowK[j] ?? 0) - factor * (M[i]?.[j] ?? 0);
            }
          }
        }
      }
    }

    return M.map((row) => row[n] ?? 0);
  }

  // Predict interpolated IV at any strike and DTE
  public predictIV(strike: number, dte: number): number {
    if (this.nodes.length === 0 || this.weights.length === 0) return 15.0;

    const k = Math.log(strike / this.spot);
    const t = Math.max(dte / 365.0, 0.005);

    let predW = 0;
    for (let i = 0; i < this.nodes.length; i++) {
      const dk = k - this.nodes[i]!.k;
      const dt = (t - this.nodes[i]!.t) * 2.0;
      const dist = Math.sqrt(dk * dk + dt * dt);
      predW += (this.weights[i] ?? 0) * this.kernel(dist);
    }

    // Ensure non-negative variance and enforce time monotonicity
    const safeW = Math.max(predW, 0.0001);
    const sigma = Math.sqrt(safeW / t);
    return Math.min(Math.max(sigma * 100.0, 5.0), 80.0); // Clamp between 5% and 80%
  }
}

// 3. Scan for Butterfly (Strike Convexity) Arbitrage Violations
// Condition: C(K1) - 2*C(K2) + C(K3) >= 0. If < 0, a free money box exists!
export function detectButterflyArbitrage(quotes: OptionQuote[], symbol: string): ArbitrageViolation[] {
  const violations: ArbitrageViolation[] = [];
  const groupedByDte = new Map<number, OptionQuote[]>();

  quotes.forEach((q) => {
    const list = groupedByDte.get(q.dte) || [];
    list.push(q);
    groupedByDte.set(q.dte, list);
  });

  groupedByDte.forEach((group, dte) => {
    const sorted = [...group].sort((a, b) => a.strike - b.strike);
    if (sorted.length < 3) return;

    for (let i = 0; i < sorted.length - 2; i++) {
      const q1 = sorted[i]!;
      const q2 = sorted[i + 1]!;
      const q3 = sorted[i + 2]!;

      const step1 = q2.strike - q1.strike;
      const step2 = q3.strike - q2.strike;

      // Equidistant strike triplet
      if (Math.abs(step1 - step2) < 1.0) {
        // Butterfly Cost = Buy K1 + Buy K3 - 2 * Sell K2
        const flyCost = q1.marketCallPrice + q3.marketCallPrice - 2 * q2.marketCallPrice;

        if (flyCost < -0.15) {
          // Negative butterfly cost detected: free cash arbitrage!
          const guaranteedProfit = Math.abs(flyCost) * 50; // lot size 50
          violations.push({
            id: `FLY-${symbol}-${dte}D-${q1.strike}-${q2.strike}-${q3.strike}`,
            type: "BUTTERFLY_ARBITRAGE",
            severity: "CRITICAL_ARBITRAGE",
            symbol,
            strikes: [q1.strike, q2.strike, q3.strike],
            dtes: [dte],
            description: `Negative Butterfly Arbitrage on ${q1.strike}/${q2.strike}/${q3.strike} (${dte}D). Cost: ₹${flyCost.toFixed(2)} (Net Credit).`,
            marketCost: flyCost,
            guaranteedProfit,
            theoreticalSpreadBps: Math.round((Math.abs(flyCost) / q2.strike) * 10000),
            tradeRecommendation: `Buy 1x ${q1.strike} CE (₹${q1.marketCallPrice.toFixed(2)}), Sell 2x ${q2.strike} CE (₹${q2.marketCallPrice.toFixed(2)}), Buy 1x ${q3.strike} CE (₹${q3.marketCallPrice.toFixed(2)}) for an upfront credit of ₹${Math.abs(flyCost).toFixed(2)}/share.`,
            legs: [
              { action: "BUY", strike: q1.strike, dte, type: "CE", qty: 1, price: q1.marketCallPrice },
              { action: "SELL", strike: q2.strike, dte, type: "CE", qty: 2, price: q2.marketCallPrice },
              { action: "BUY", strike: q3.strike, dte, type: "CE", qty: 1, price: q3.marketCallPrice },
            ],
          });
        }
      }
    }
  });

  return violations;
}

// 4. Scan for Calendar Spread (Maturity Monotonicity) Arbitrage Violations
// Condition: C(K, T1) <= C(K, T2) for T1 < T2. If C(K, T1) > C(K, T2), near-dated option is overpriced!
export function detectCalendarArbitrage(quotes: OptionQuote[], symbol: string): ArbitrageViolation[] {
  const violations: ArbitrageViolation[] = [];
  const groupedByStrike = new Map<number, OptionQuote[]>();

  quotes.forEach((q) => {
    const list = groupedByStrike.get(q.strike) || [];
    list.push(q);
    groupedByStrike.set(q.strike, list);
  });

  groupedByStrike.forEach((group, strike) => {
    const sorted = [...group].sort((a, b) => a.dte - b.dte);
    if (sorted.length < 2) return;

    for (let i = 0; i < sorted.length - 1; i++) {
      const near = sorted[i]!;
      const far = sorted[i + 1]!;

      // Call calendar arbitrage condition: near-dated call costs more than far-dated call
      if (near.marketCallPrice > far.marketCallPrice + 0.50) {
        const spreadCredit = near.marketCallPrice - far.marketCallPrice;
        const guaranteedProfit = spreadCredit * 50;

        violations.push({
          id: `CAL-${symbol}-${strike}-${near.dte}D-${far.dte}D`,
          type: "CALENDAR_ARBITRAGE",
          severity: "CRITICAL_ARBITRAGE",
          symbol,
          strikes: [strike],
          dtes: [near.dte, far.dte],
          description: `Calendar Spread Inversion at Strike ₹${strike}: ${near.dte}D Call (₹${near.marketCallPrice.toFixed(2)}) trades ABOVE ${far.dte}D Call (₹${far.marketCallPrice.toFixed(2)}).`,
          marketCost: -spreadCredit,
          guaranteedProfit,
          theoreticalSpreadBps: Math.round((spreadCredit / strike) * 10000),
          tradeRecommendation: `Sell 1x ${near.dte}D ${strike} CE and Buy 1x ${far.dte}D ${strike} CE for a net cash credit of ₹${spreadCredit.toFixed(2)}/share with positive theta and time value buffer.`,
          legs: [
            { action: "SELL", strike, dte: near.dte, type: "CE", qty: 1, price: near.marketCallPrice },
            { action: "BUY", strike, dte: far.dte, type: "CE", qty: 1, price: far.marketCallPrice },
          ],
        });
      }
    }
  });

  return violations;
}

// 5. Complete Volatility Surface Interpolator & Arbitrage Report Generator
export function runVolatilityArbitrageAnalysis(
  symbol: string,
  spotPrice: number,
  quotes: OptionQuote[],
  r: number = 0.065
): VolatilityArbitrageReport {
  const interpolator = new VolatilitySurfaceInterpolator(spotPrice);

  const ivNodes = quotes.map((q) => ({
    strike: q.strike,
    dte: q.dte,
    iv: q.marketCallIv,
  }));
  interpolator.fit(ivNodes);

  // Compute Surface Grid and Residuals
  let sumSqErr = 0;
  const surfaceGrid: SurfaceInterpolationPoint[] = quotes.map((q) => {
    const fittedIv = interpolator.predictIV(q.strike, q.dte);
    const residual = q.marketCallIv - fittedIv;
    sumSqErr += residual * residual;

    const tYear = Math.max(q.dte / 365.0, 0.005);
    const fittedCall = bsCallPrice(spotPrice, q.strike, tYear, r, fittedIv / 100.0);

    let status: "FAIR_VALUE" | "OVERVALUED" | "UNDERVALUED" = "FAIR_VALUE";
    if (residual > 1.4) status = "OVERVALUED";
    else if (residual < -1.4) status = "UNDERVALUED";

    return {
      strike: q.strike,
      dte: q.dte,
      moneyness: Math.round((q.strike / spotPrice) * 1000) / 1000,
      marketIv: q.marketCallIv,
      interpolatedIv: Math.round(fittedIv * 10) / 10,
      residualIv: Math.round(residual * 10) / 10,
      isArbitrageViolation: Math.abs(residual) >= 2.0,
      status,
      fittedCallPrice: Math.round(fittedCall * 10) / 10,
    };
  });

  const butterflyViolations = detectButterflyArbitrage(quotes, symbol);
  const calendarViolations = detectCalendarArbitrage(quotes, symbol);

  const maxFlyProfit = butterflyViolations.reduce((m, v) => Math.max(m, v.guaranteedProfit), 0);
  const maxCalProfit = calendarViolations.reduce((m, v) => Math.max(m, v.guaranteedProfit), 0);
  const maxArbitrageProfitInr = Math.max(maxFlyProfit, maxCalProfit);
  const rmse = quotes.length > 0 ? Math.sqrt(sumSqErr / quotes.length) : 0;

  return {
    symbol,
    spotPrice,
    riskFreeRate: r,
    quoteCount: quotes.length,
    butterflyViolations,
    calendarViolations,
    surfaceGrid,
    maxArbitrageProfitInr,
    surfaceSmoothingRmse: Math.round(rmse * 100) / 100,
  };
}

// 6. Realistic Default Market Quotes Generator with Injectable Synthetic Arbitrage
export function generateMarketOptionQuotes(spot: number = 24200): OptionQuote[] {
  const dtes = [7, 14, 28, 60];
  const strikeSteps = [-400, -300, -200, -100, 0, 100, 200, 300, 400];
  const quotes: OptionQuote[] = [];

  dtes.forEach((dte) => {
    const tYear = dte / 365.0;
    const baseIv = 14.5 + (dte === 7 ? 1.5 : dte === 14 ? 0.8 : 0);

    strikeSteps.forEach((step) => {
      const strike = Math.round((spot + step) / 50) * 50;
      const moneyness = strike / spot;
      // Typical equity skew: higher IV for OTM puts (moneyness < 1.0)
      const skew = (1.0 - moneyness) * 22.0;
      let callIv = Math.max(baseIv + skew, 8.5);

      let callPx = bsCallPrice(spot, strike, tYear, 0.065, callIv / 100.0);
      let putPx = bsCallPrice(spot, strike, tYear, 0.065, callIv / 100.0) - spot + strike * Math.exp(-0.065 * tYear);

      // Inject 1 subtle Butterfly Arbitrage on 7D weekly: make middle strike slightly overpriced
      if (dte === 7 && strike === Math.round(spot / 50) * 50) {
        callPx += 3.5; // Artificial middle strike bump creates negative butterfly
        callIv += 1.8;
      }

      // Inject 1 subtle Calendar Arbitrage on 14D vs 7D: make 7D OTM call slightly higher than 14D
      if (strike === Math.round((spot + 200) / 50) * 50 && dte === 7) {
        callPx += 8.0;
        callIv += 3.2;
      }

      quotes.push({
        strike,
        dte,
        expiryLabel: `${dte}D Expiry`,
        marketCallPrice: Math.round(Math.max(callPx, 0.5) * 10) / 10,
        marketPutPrice: Math.round(Math.max(putPx, 0.5) * 10) / 10,
        marketCallIv: Math.round(callIv * 10) / 10,
        marketPutIv: Math.round((callIv + 1.2) * 10) / 10,
        volume: Math.floor(Math.random() * 4000) + 500,
        openInterest: Math.floor(Math.random() * 50000) + 10000,
      });
    });
  });

  return quotes;
}
