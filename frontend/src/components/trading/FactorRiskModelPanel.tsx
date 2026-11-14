import { useMemo } from 'react';
import {
  computeFactorRiskAttribution,
  generateSyntheticFactorReturns,
} from '../../lib/factor-risk-model';

interface FactorRiskModelPanelProps {
  portfolioReturns?: number[];
}

export function FactorRiskModelPanel({
  portfolioReturns,
}: FactorRiskModelPanelProps) {
  // Pre-generate factor series (60 trading days)
  const factorSeries = useMemo(() => generateSyntheticFactorReturns(60), []);

  // Synthetic portfolio returns if none provided (e.g. slight outperformance with momentum tilt)
  const returnsData = useMemo(() => {
    if (portfolioReturns && portfolioReturns.length >= 10) return portfolioReturns;
    return factorSeries.map((f, i) => {
      // Model portfolio returns as 1.15 * mktRf + 0.45 * wml + small alpha
      const alphaDaily = 0.0003; // ~7.5% annual alpha
      const noise = ((Math.sin(i * 19) * 1000) % 1) * 0.005 - 0.0025;
      return f.rf + 1.15 * f.mktRf + 0.35 * f.smb - 0.15 * f.hml + 0.65 * f.wml + alphaDaily + noise;
    });
  }, [portfolioReturns, factorSeries]);

  const attribution = useMemo(() => {
    return computeFactorRiskAttribution(returnsData, factorSeries);
  }, [returnsData, factorSeries]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col gap-6 font-mono text-slate-100">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></span>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Quantitative Factor Model & Barra-Style Risk Attribution
            </h2>
            <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
              Fama-French 4-Factor OLS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Decompose simulated trading returns into Market Beta, Size (SMB), Value (HML), and Momentum (WML) factor loadings with systematic vs idiosyncratic variance attribution.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-sans">Model Fit (R²):</span>
          <span className="text-emerald-400 font-bold">{attribution.rSquaredPct}%</span>
        </div>
      </div>

      {/* Primary KPI Ribbon: Jensen's Alpha & Risk Quality */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Jensen's Alpha (Annual)</div>
          <div className={`text-2xl font-bold mt-1 ${attribution.alphaAnnualizedPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {attribution.alphaAnnualizedPct >= 0 ? '+' : ''}{attribution.alphaAnnualizedPct}%
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            t-stat: <span className="text-cyan-400 font-bold">{attribution.alphaTStat}</span> ({attribution.alphaTStat > 2.0 ? 'Statistically Significant' : 'Random Noise'})
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Information Ratio (IR)</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">
            {attribution.informationRatio}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Tracking Error: <span className="text-white font-bold">{attribution.trackingErrorPct}%</span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Systematic Factor Risk</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {attribution.systematicRiskPct}%
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Total Volatility: {attribution.totalRiskAnnualizedPct}%
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Specific / Idiosyncratic Risk</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {attribution.idiosyncraticRiskPct}%
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Stock Selection Variance
          </div>
        </div>
      </div>

      {/* Factor Loading Breakdown Grid */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold text-white uppercase font-sans">
          Fama-French & Carhart Multi-Factor Loadings (Betas)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Market Beta */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between font-sans">
              <span className="font-bold text-slate-300">Market Factor (MKT)</span>
              <span className="text-slate-500 text-[10px]">Benchmark Beta</span>
            </div>
            <div className="text-2xl font-bold text-white font-mono">{attribution.betaMarket}</div>
            <p className="text-[11px] text-slate-400 font-sans">
              {attribution.betaMarket > 1.2
                ? 'High Beta: Portfolio magnifies Nifty swings.'
                : attribution.betaMarket < 0.8
                ? 'Low Beta: Defensive allocation mitigating downturns.'
                : 'Neutral Beta: Tracking market benchmark movements.'}
            </p>
          </div>

          {/* Size Beta (SMB) */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between font-sans">
              <span className="font-bold text-slate-300">Size Factor (SMB)</span>
              <span className="text-slate-500 text-[10px]">Small Minus Big</span>
            </div>
            <div className={`text-2xl font-bold font-mono ${attribution.betaSize > 0 ? 'text-cyan-400' : 'text-slate-200'}`}>
              {attribution.betaSize > 0 ? '+' : ''}{attribution.betaSize}
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              {attribution.betaSize > 0.2
                ? 'Small-Cap Tilt: Returns driven by smaller capitalized companies.'
                : attribution.betaSize < -0.2
                ? 'Large-Cap Tilt: Returns driven by bluechip Nifty 50 leaders.'
                : 'Size Neutral: Balanced exposure across market caps.'}
            </p>
          </div>

          {/* Value Beta (HML) */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between font-sans">
              <span className="font-bold text-slate-300">Value Factor (HML)</span>
              <span className="text-slate-500 text-[10px]">High Minus Low</span>
            </div>
            <div className={`text-2xl font-bold font-mono ${attribution.betaValue > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {attribution.betaValue > 0 ? '+' : ''}{attribution.betaValue}
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              {attribution.betaValue > 0.2
                ? 'Value Tilt: High book-to-market multiple discount.'
                : attribution.betaValue < -0.2
                ? 'Growth Tilt: High P/E growth companies dominate.'
                : 'Blend Style: Neutral valuation style exposure.'}
            </p>
          </div>

          {/* Momentum Beta (WML) */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between font-sans">
              <span className="font-bold text-slate-300">Momentum Factor (WML)</span>
              <span className="text-slate-500 text-[10px]">Winners Minus Losers</span>
            </div>
            <div className={`text-2xl font-bold font-mono ${attribution.betaMomentum > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
              {attribution.betaMomentum > 0 ? '+' : ''}{attribution.betaMomentum}
            </div>
            <p className="text-[11px] text-slate-400 font-sans">
              {attribution.betaMomentum > 0.3
                ? 'Trend Following: Heavy exposure to recent 12-month winners.'
                : attribution.betaMomentum < -0.3
                ? 'Contrarian / Mean-Reverting: Favoring lagging pullbacks.'
                : 'Momentum Neutral: Uncorrelated with trend factors.'}
            </p>
          </div>
        </div>
      </div>

      {/* Style Drift Warning System */}
      <div className="flex flex-col gap-3">
        <span className="text-xs font-bold text-white uppercase font-sans">
          Active Mandate Style Drift Surveillance
        </span>
        {attribution.styleDriftWarnings.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-emerald-400 font-sans">
            ✓ Portfolio factor loadings are strictly within institutional mandate limits. Zero style drift detected.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {attribution.styleDriftWarnings.map((w, idx) => (
              <div
                key={idx}
                className="bg-slate-950 border border-amber-800/60 rounded-xl p-3.5 flex flex-col gap-1.5 shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                      {w.severity} WARNING
                    </span>
                    <span className="text-xs font-bold text-white font-sans">{w.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans">{w.factor} FACTOR</span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">{w.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
