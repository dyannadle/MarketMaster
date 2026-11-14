// Milestone 25: Real-Time Options Volatility Surface & Implied Volatility (IV) Smile Engine
// Implements Black-Scholes inversion, Hagan et al. SABR interpolation, and term structure analysis

export interface SabrParameters {
  alpha: number; // ATM volatility level (e.g. 0.15 for 15%)
  beta: number;  // CEV elasticity exponent (0.5 for CIR/CEV or 1.0 for lognormal)
  rho: number;   // Correlation between price return and volatility (-1 to 1, e.g. -0.35)
  nu: number;    // Volatility of volatility (e.g. 0.45)
}

export interface VolatilityPoint {
  dte: number;           // Days to expiry
  expiryLabel: string;   // e.g. "7D (Weekly)", "28D (Monthly)"
  strike: number;        // Strike price
  moneyness: number;     // K / Spot ratio
  iv: number;            // Implied volatility in percent (e.g. 15.4%)
  callPrice: number;     // Theoretical BS Call price
  putPrice: number;      // Theoretical BS Put price
  isAtm?: boolean | undefined;
}

export interface VolatilitySurfaceData {
  underlyingSymbol: string;
  spotPrice: number;
  riskFreeRate: number;
  atmIv: number;
  putCallSkewRatio: number; // 90% OTM Put IV / 110% OTM Call IV
  riskReversal25Delta: number; // IV(Call 25D) - IV(Put 25D)
  termStructureRegime: "CONTANGO" | "BACKWARDATION" | "FLAT";
  dteList: number[];
  strikes: number[];
  points: VolatilityPoint[];
  sabrParams: SabrParameters;
}

// 1. Standard Cumulative Normal Distribution Approximation (Abramowitz & Stegun)
export function cdfNormal(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * y);
}

export function pdfNormal(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// 2. Black-Scholes Analytical Pricing
export function blackScholesPrice(
  S: number,
  K: number,
  T: number, // in years
  r: number, // annualized decimal (0.065 for 6.5%)
  sigma: number, // annualized decimal (0.15 for 15%)
  isCall: boolean
): number {
  if (T <= 0) {
    return isCall ? Math.max(0, S - K) : Math.max(0, K - S);
  }
  if (sigma <= 0) {
    return isCall ? Math.max(0, S - K * Math.exp(-r * T)) : Math.max(0, K * Math.exp(-r * T) - S);
  }

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  if (isCall) {
    return S * cdfNormal(d1) - K * Math.exp(-r * T) * cdfNormal(d2);
  } else {
    return K * Math.exp(-r * T) * cdfNormal(-d2) - S * cdfNormal(-d1);
  }
}

// Black-Scholes Vega
export function blackScholesVega(S: number, K: number, T: number, r: number, sigma: number): number {
  if (T <= 0 || sigma <= 0) return 0;
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  return S * Math.sqrt(T) * pdfNormal(d1);
}

// 3. Implied Volatility Solver (Newton-Raphson with Bisection Fallback)
export function invertImpliedVol(
  targetPrice: number,
  S: number,
  K: number,
  T: number, // in years
  r: number,
  isCall: boolean,
  maxIterations: number = 35,
  tolerance: number = 1e-4
): number {
  if (T <= 0) return 0;
  const intrinsic = isCall ? Math.max(0, S - K) : Math.max(0, K - S);
  if (targetPrice <= intrinsic) {
    return 0.01; // Floor at 1%
  }

  // Initial estimate (Brenner-Subrahmanyam heuristic)
  let sigma = Math.max(0.05, Math.min(2.5, Math.sqrt((2 * Math.PI) / T) * (targetPrice / S)));
  let low = 0.005;
  let high = 4.0;

  for (let i = 0; i < maxIterations; i++) {
    const price = blackScholesPrice(S, K, T, r, sigma, isCall);
    const diff = price - targetPrice;

    if (Math.abs(diff) < tolerance) {
      return sigma;
    }

    if (diff > 0) {
      high = sigma;
    } else {
      low = sigma;
    }

    const vega = blackScholesVega(S, K, T, r, sigma);
    if (vega > 1e-6) {
      const step = diff / vega;
      const nextSigma = sigma - step;
      if (nextSigma > low && nextSigma < high) {
        sigma = nextSigma;
        continue;
      }
    }

    // Bisection step fallback
    sigma = 0.5 * (low + high);
  }

  return sigma;
}

// 4. Hagan et al. SABR Volatility Smile Model
export function sabrImpliedVol(
  F: number, // Forward price (S * exp(r * T))
  K: number, // Strike price
  T: number, // in years
  params: SabrParameters
): number {
  const { beta, rho, nu } = params;
  // Normalize alpha so alpha is always the annualized ATM volatility percentage (e.g. 0.15 for 15%)
  // For CEV beta < 1, the Hagan parameter alpha_sabr = alpha * F^(1 - beta)
  const alphaSabr = params.alpha * Math.pow(F, 1 - beta);

  if (T <= 0) return params.alpha;
  if (Math.abs(F - K) < 1e-4) {
    // ATM Expansion Formula
    const fBeta = Math.pow(F, 1 - beta);
    const term1 = ((1 - beta) * (1 - beta) * alphaSabr * alphaSabr) / (24 * fBeta * fBeta);
    const term2 = (0.25 * rho * beta * nu * alphaSabr) / fBeta;
    const term3 = ((2 - 3 * rho * rho) * nu * nu) / 24;
    return (alphaSabr / fBeta) * (1 + (term1 + term2 + term3) * T);
  }

  const logFK = Math.log(F / K);
  const fkBeta = Math.pow(F * K, (1 - beta) / 2);
  const z = (nu / alphaSabr) * fkBeta * logFK;

  // x(z) calculation with numerical stability
  const sqrtTerm = Math.sqrt(Math.max(1e-10, 1 - 2 * rho * z + z * z));
  const numerator = sqrtTerm + z - rho;
  const denominator = 1 - rho;
  const xz = Math.abs(numerator - denominator) < 1e-9 ? 1.0 : Math.log(Math.max(1e-10, numerator / denominator));

  const zOverXz = Math.abs(z) < 1e-6 ? 1.0 : z / xz;

  const denomTerm1 = ((1 - beta) * (1 - beta) / 24) * logFK * logFK;
  const denomTerm2 = (Math.pow(1 - beta, 4) / 1920) * Math.pow(logFK, 4);
  const denominatorTotal = fkBeta * (1 + denomTerm1 + denomTerm2);

  const factor1 = alphaSabr / denominatorTotal;

  const corrTerm1 = ((1 - beta) * (1 - beta) * alphaSabr * alphaSabr) / (24 * Math.pow(F * K, 1 - beta));
  const corrTerm2 = (0.25 * rho * beta * nu * alphaSabr) / fkBeta;
  const corrTerm3 = ((2 - 3 * rho * rho) * nu * nu) / 24;
  const factor2 = 1 + (corrTerm1 + corrTerm2 + corrTerm3) * T;

  const finalVol = factor1 * zOverXz * factor2;
  return Math.max(0.02, Math.min(3.0, finalVol));
}

// 5. Complete 3D Volatility Surface Generator
export function generateVolatilitySurface(
  underlyingSymbol: string = "NIFTY",
  spotPrice: number = 24500,
  riskFreeRate: number = 0.065,
  customSabr?: Partial<SabrParameters>
): VolatilitySurfaceData {
  const sabrParams: SabrParameters = {
    alpha: customSabr?.alpha ?? 0.145, // ~14.5% ATM volatility
    beta: customSabr?.beta ?? 0.7,     // Indian equity index elasticity
    rho: customSabr?.rho ?? -0.38,     // Negative equity skew (puts more expensive)
    nu: customSabr?.nu ?? 0.42,        // Vol of vol
  };

  // Expiration tenors: 7D (Weekly), 14D (Bi-Weekly), 28D (Monthly), 60D (Bi-Monthly), 90D (Quarterly)
  const dteList = [7, 14, 28, 60, 90];
  const dteLabels: Record<number, string> = {
    7: "7D (Weekly)",
    14: "14D (Bi-Weekly)",
    28: "28D (Monthly)",
    60: "60D (Bi-Monthly)",
    90: "90D (Quarterly)",
  };

  // Strike range: 90% to 110% of Spot with standard round step
  const step = Math.round(spotPrice * 0.01 / 50) * 50 || 50;
  const roundedSpot = Math.round(spotPrice / step) * step;
  const strikes: number[] = [];

  for (let offset = -5; offset <= 5; offset++) {
    strikes.push(roundedSpot + offset * step * 2);
  }

  const points: VolatilityPoint[] = [];

  dteList.forEach((dte) => {
    const T = dte / 365.0;
    const forward = spotPrice * Math.exp(riskFreeRate * T);

    strikes.forEach((K) => {
      const volDecimal = sabrImpliedVol(forward, K, T, sabrParams);
      const ivPct = Number((volDecimal * 100).toFixed(2));
      const call = blackScholesPrice(spotPrice, K, T, riskFreeRate, volDecimal, true);
      const put = blackScholesPrice(spotPrice, K, T, riskFreeRate, volDecimal, false);
      const moneyness = Number((K / spotPrice).toFixed(3));

      points.push({
        dte,
        expiryLabel: dteLabels[dte] ?? `${dte}D`,
        strike: K,
        moneyness,
        iv: ivPct,
        callPrice: Number(call.toFixed(2)),
        putPrice: Number(put.toFixed(2)),
        isAtm: Math.abs(K - roundedSpot) < step,
      });
    });
  });

  // Calculate Metrics
  const monthlyPoints = points.filter((p) => p.dte === 28);
  const atmPoint = monthlyPoints.find((p) => p.isAtm) || monthlyPoints[Math.floor(monthlyPoints.length / 2)]!;
  const otmPut = monthlyPoints[0]!; // Lowest strike (Deep OTM Put)
  const otmCall = monthlyPoints[monthlyPoints.length - 1]!; // Highest strike (Deep OTM Call)

  const putCallSkewRatio = Number((otmPut.iv / Math.max(0.1, otmCall.iv)).toFixed(2));
  const riskReversal25Delta = Number((otmCall.iv - otmPut.iv).toFixed(2));

  // Term Structure Analysis: Compare Weekly vs Quarterly ATM Vol
  const weeklyAtm = points.find((p) => p.dte === 7 && p.isAtm)?.iv ?? 14.0;
  const quarterlyAtm = points.find((p) => p.dte === 90 && p.isAtm)?.iv ?? 15.5;

  let termStructureRegime: "CONTANGO" | "BACKWARDATION" | "FLAT" = "FLAT";
  if (quarterlyAtm - weeklyAtm > 0.75) {
    termStructureRegime = "CONTANGO"; // Normal calm regime: Far months carry term premium
  } else if (weeklyAtm - quarterlyAtm > 0.75) {
    termStructureRegime = "BACKWARDATION"; // Panic / Event regime: Near term event risk
  }

  return {
    underlyingSymbol,
    spotPrice,
    riskFreeRate,
    atmIv: atmPoint.iv,
    putCallSkewRatio,
    riskReversal25Delta,
    termStructureRegime,
    dteList,
    strikes,
    points,
    sabrParams,
  };
}
