import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  SAMPLE_CORPORATE_ACTIONS,
  applyCorporateAction,
  computeAdjustedPriceSeries,
  generateSampleCorporateActionPrices,
  CorporateActionEvent,
  PortfolioHolding,
  CorporateActionExecutionResult,
} from '../../lib/corporate-actions';

export function CorporateActionsSimulator() {
  const [selectedActionId, setSelectedActionId] = useState<string>(SAMPLE_CORPORATE_ACTIONS[0]!.id);
  const [holdingQuantity, setHoldingQuantity] = useState<number>(200);
  const [holdingAvgPrice, setHoldingAvgPrice] = useState<number>(1820.50);
  const [activeTab, setActiveTab] = useState<'SIMULATOR' | 'PRICE_SERIES' | 'TDS_LEDGER'>('SIMULATOR');
  const [showAdjusted, setShowAdjusted] = useState<boolean>(true);

  const selectedAction = useMemo(() => {
    return SAMPLE_CORPORATE_ACTIONS.find(a => a.id === selectedActionId) || SAMPLE_CORPORATE_ACTIONS[0]!;
  }, [selectedActionId]);

  const currentHolding: PortfolioHolding = useMemo(() => ({
    symbol: selectedAction.symbol,
    quantity: holdingQuantity,
    averagePrice: holdingAvgPrice,
  }), [selectedAction.symbol, holdingQuantity, holdingAvgPrice]);

  const executionResult: CorporateActionExecutionResult = useMemo(() => {
    return applyCorporateAction(currentHolding, selectedAction);
  }, [currentHolding, selectedAction]);

  // Generate sample price series crossing the ex-date
  const rawPrices = useMemo(() => {
    return generateSampleCorporateActionPrices(selectedAction.symbol, 45);
  }, [selectedAction.symbol]);

  const adjustedSeries = useMemo(() => {
    return computeAdjustedPriceSeries(rawPrices, [selectedAction]);
  }, [rawPrices, selectedAction]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col gap-6 font-mono text-slate-100">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></span>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Indian Market Corporate Actions & Dividend Adjustment Simulator
            </h2>
            <span className="text-xs bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded">
              Sec 194 TDS & CAF Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Simulate ex-date Stock Splits, Bonus Issues, Cash Dividends with Indian Section 194 10% TDS withholding, and toggle adjusted vs unadjusted backtest series.
          </p>
        </div>

        {/* Corporate Action Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-sans">Corporate Event:</label>
          <select
            value={selectedActionId}
            onChange={(e) => setSelectedActionId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-sans"
          >
            {SAMPLE_CORPORATE_ACTIONS.map(a => (
              <option key={a.id} value={a.id}>
                {a.symbol} — {a.type.replace('_', ' ')} ({a.exDate})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Action Type</div>
          <div className="text-lg font-bold text-amber-400 mt-1">
            {selectedAction.type.replace('_', ' ')}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">Ex-Date: {selectedAction.exDate}</div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Position Adjustment</div>
          <div className="text-lg font-bold text-white mt-1">
            {executionResult.oldQuantity} ➔ <span className="text-emerald-400">{executionResult.newQuantity} shs</span>
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Avg Cost: ₹{executionResult.oldAveragePrice} ➔ ₹{executionResult.newAveragePrice}
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Gross Dividend Payout</div>
          <div className="text-lg font-bold text-cyan-400 mt-1">
            ₹{executionResult.grossDividendInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            {selectedAction.dividendPerShare ? `₹${selectedAction.dividendPerShare}/sh` : 'N/A (Stock Event)'}
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Sec 194 TDS Withheld</div>
          <div className="text-lg font-bold text-rose-400 mt-1">
            ₹{executionResult.tdsWithheldInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Net Credited: <span className="text-emerald-400 font-bold">₹{executionResult.netCashCreditedInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        {(['SIMULATOR', 'PRICE_SERIES', 'TDS_LEDGER'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
              activeTab === tab
                ? 'border-amber-500 text-amber-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/20'
            }`}
          >
            {tab === 'SIMULATOR' && 'Holding Adjustment Simulator'}
            {tab === 'PRICE_SERIES' && 'Adjusted vs Raw Price Series'}
            {tab === 'TDS_LEDGER' && 'Double-Entry TDS Ledger'}
          </button>
        ))}
      </div>

      {/* Tab 1: Simulator Holding Inputs & Outcome */}
      {activeTab === 'SIMULATOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
            <span className="text-xs font-bold text-white uppercase font-sans">
              Portfolio Position Inputs ({selectedAction.symbol})
            </span>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-slate-400 font-sans">Holding Quantity (Shares):</label>
              <input
                type="number"
                min="1"
                value={holdingQuantity}
                onChange={e => setHoldingQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] text-slate-400 font-sans">Average Cost Price (₹):</label>
              <input
                type="number"
                step="0.05"
                min="1"
                value={holdingAvgPrice}
                onChange={e => setHoldingAvgPrice(Math.max(1, parseFloat(e.target.value) || 1))}
                className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs flex flex-col gap-1">
              <span className="text-amber-400 font-semibold font-sans">Corporate Action Terms:</span>
              <p className="text-slate-300 font-sans text-[11px]">{selectedAction.description}</p>
              <span className="text-slate-500 text-[10px]">Record Date: {selectedAction.recordDate}</span>
            </div>
          </div>

          {/* Outcome Card */}
          <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-4">
            <span className="text-xs font-bold text-white uppercase font-sans">
              Post-Corporate Action Settlement Voucher
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block font-sans">Pre-Event Value:</span>
                <span className="text-white font-bold text-sm">
                  ₹{(executionResult.oldQuantity * executionResult.oldAveragePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">{executionResult.oldQuantity} shares @ ₹{executionResult.oldAveragePrice.toFixed(2)}</span>
              </div>
              <div className="bg-slate-900 p-3 rounded border border-slate-800">
                <span className="text-slate-500 block font-sans">Post-Event Securities Value:</span>
                <span className="text-white font-bold text-sm">
                  ₹{(executionResult.newQuantity * executionResult.newAveragePrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-emerald-400 block mt-1">{executionResult.newQuantity} shares @ ₹{executionResult.newAveragePrice.toFixed(2)}</span>
              </div>
            </div>

            {selectedAction.type === 'CASH_DIVIDEND' && (
              <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-3 text-xs flex flex-col gap-2">
                <span className="text-amber-300 font-bold font-sans">Indian Income Tax Act Section 194 Compliance:</span>
                <p className="text-slate-300 text-[11px] font-sans">
                  Dividends paid by domestic Indian companies to resident individuals are subject to a mandatory 10% TDS deduction.
                </p>
                <div className="flex justify-between border-t border-amber-900/40 pt-2 text-xs">
                  <span>Gross Dividend: ₹{executionResult.grossDividendInr.toFixed(2)}</span>
                  <span className="text-rose-400">TDS (10%): -₹{executionResult.tdsWithheldInr.toFixed(2)}</span>
                  <span className="text-emerald-400 font-bold">Net Cash Credited: ₹{executionResult.netCashCreditedInr.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Adjusted vs Unadjusted Price Series Chart */}
      {activeTab === 'PRICE_SERIES' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-sans">
            <span className="font-semibold text-slate-300">
              Historical Price Series: {selectedAction.symbol} (Ex-Date: {selectedAction.exDate})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdjusted(!showAdjusted)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition"
              >
                {showAdjusted ? 'Viewing: Backward-Adjusted (CAF)' : 'Viewing: Raw Exchange Settlement'}
              </button>
            </div>
          </div>

          <div className="h-72 w-full bg-slate-950 border border-slate-800 rounded-lg p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={adjustedSeries}>
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '11px' }}
                  formatter={(val: any, name: any) => [`₹${Number(val).toFixed(2)}`, name === 'adjustedClose' ? 'Adjusted Close' : 'Raw Unadjusted Close']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <Line
                  type="monotone"
                  dataKey="unadjustedClose"
                  name="Raw Unadjusted Price"
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  dot={false}
                  strokeWidth={2}
                />
                {showAdjusted && (
                  <Line
                    type="monotone"
                    dataKey="adjustedClose"
                    name="Backtest Adjusted Price (Continuous)"
                    stroke="#10b981"
                    dot={false}
                    strokeWidth={2.5}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-slate-400 font-sans">
            Note: Raw unadjusted series reflects artificial ex-date price drops caused by stock splits/bonus dilution, producing false technical sell signals. The adjusted series computes the Cumulative Adjustment Factor (CAF) backwards to preserve true return continuity for backtesting.
          </p>
        </div>
      )}

      {/* Tab 3: Double-Entry TDS Ledger */}
      {activeTab === 'TDS_LEDGER' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-800 rounded-lg overflow-hidden font-mono">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-2.5">Ledger Account</th>
                <th className="p-2.5">Description</th>
                <th className="p-2.5 text-right">Debit (Dr)</th>
                <th className="p-2.5 text-right">Credit (Cr)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
              {executionResult.ledgerEntries.map((le, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="p-2.5 text-cyan-400 font-semibold">{le.account}</td>
                  <td className="p-2.5 text-slate-300 font-sans">{le.description}</td>
                  <td className="p-2.5 text-right text-rose-400">
                    {le.debit > 0 ? `₹${le.debit.toFixed(2)}` : '—'}
                  </td>
                  <td className="p-2.5 text-right text-emerald-400">
                    {le.credit > 0 ? `₹${le.credit.toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
