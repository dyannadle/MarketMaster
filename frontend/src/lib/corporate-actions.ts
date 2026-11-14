/**
 * Indian Market Corporate Actions & Dividend Adjustment Engine
 * Milestone 35: Stock Splits, Bonus Issues, Cash Dividends with Section 194 10% TDS & Price Adjustment Series
 */

export type CorporateActionType = 'STOCK_SPLIT' | 'BONUS_ISSUE' | 'CASH_DIVIDEND';

export interface CorporateActionEvent {
  id: string;
  symbol: string;
  type: CorporateActionType;
  exDate: string; // YYYY-MM-DD
  recordDate: string;
  description: string;
  // For splits: splitRatio = newShares / oldShares (e.g. 10 for 1:10 split)
  // For bonus: bonusRatio = additionalShares / oldShares (e.g. 1.0 for 1:1 bonus)
  // For dividend: dividendPerShare = cash dividend in INR
  ratio?: number;
  dividendPerShare?: number;
}

export interface PortfolioHolding {
  symbol: string;
  quantity: number;
  averagePrice: number;
}

export interface CorporateActionExecutionResult {
  event: CorporateActionEvent;
  symbol: string;
  oldQuantity: number;
  newQuantity: number;
  oldAveragePrice: number;
  newAveragePrice: number;
  grossDividendInr: number;
  tdsWithheldInr: number; // Section 194 10% TDS
  netCashCreditedInr: number;
  ledgerEntries: {
    description: string;
    debit: number;
    credit: number;
    account: string;
  }[];
}

export interface PriceAdjustmentBar {
  date: string;
  unadjustedClose: number;
  adjustedClose: number;
  adjustmentFactor: number;
  eventDescription?: string | undefined;
}

/**
 * Curated historical Corporate Actions for Indian Nifty 50 constituents
 */
export const SAMPLE_CORPORATE_ACTIONS: CorporateActionEvent[] = [
  {
    id: 'CA-INFY-BONUS-2024',
    symbol: 'INFY',
    type: 'BONUS_ISSUE',
    exDate: '2024-09-12',
    recordDate: '2024-09-13',
    description: 'Bonus Issue 1:1 (1 free share for every 1 equity share held)',
    ratio: 1.0,
  },
  {
    id: 'CA-RELIANCE-DIV-2024',
    symbol: 'RELIANCE',
    type: 'CASH_DIVIDEND',
    exDate: '2024-08-19',
    recordDate: '2024-08-20',
    description: 'Final Cash Dividend of ₹10.00 per share',
    dividendPerShare: 10.0,
  },
  {
    id: 'CA-TATAMOTORS-SPLIT-2024',
    symbol: 'TATAMOTORS',
    type: 'STOCK_SPLIT',
    exDate: '2024-10-25',
    recordDate: '2024-10-26',
    description: 'Sub-division / Stock Split from Face Value ₹10 to ₹2 (Ratio 1:5)',
    ratio: 5.0,
  },
  {
    id: 'CA-TCS-SPECIALDIV-2024',
    symbol: 'TCS',
    type: 'CASH_DIVIDEND',
    exDate: '2024-01-18',
    recordDate: '2024-01-19',
    description: 'Special Cash Dividend of ₹27.00 per share',
    dividendPerShare: 27.0,
  },
];

/**
 * Executes a corporate action on a portfolio holding, computing adjustments and Indian Section 194 TDS
 */
export function applyCorporateAction(
  holding: PortfolioHolding,
  event: CorporateActionEvent
): CorporateActionExecutionResult {
  let newQuantity = holding.quantity;
  let newAveragePrice = holding.averagePrice;
  let grossDividendInr = 0;
  let tdsWithheldInr = 0;
  let netCashCreditedInr = 0;
  const ledgerEntries: CorporateActionExecutionResult['ledgerEntries'] = [];

  if (event.type === 'STOCK_SPLIT' && event.ratio) {
    // 1:N split: quantity multiplies by ratio, average price divides by ratio
    newQuantity = holding.quantity * event.ratio;
    newAveragePrice = Number((holding.averagePrice / event.ratio).toFixed(2));
    ledgerEntries.push({
      description: `Stock Split 1:${event.ratio} on ${event.symbol} (${holding.quantity} -> ${newQuantity} shares)`,
      debit: 0,
      credit: 0,
      account: 'SECURITIES_INVENTORY',
    });
  } else if (event.type === 'BONUS_ISSUE' && event.ratio) {
    // 1:N bonus: new total quantity = holding.quantity * (1 + event.ratio)
    const bonusShares = holding.quantity * event.ratio;
    newQuantity = holding.quantity + bonusShares;
    newAveragePrice = Number((holding.averagePrice / (1 + event.ratio)).toFixed(2));
    ledgerEntries.push({
      description: `Bonus Issue ${event.ratio}:1 on ${event.symbol} (+${bonusShares} bonus shares)`,
      debit: 0,
      credit: 0,
      account: 'SECURITIES_INVENTORY',
    });
  } else if (event.type === 'CASH_DIVIDEND' && event.dividendPerShare) {
    grossDividendInr = holding.quantity * event.dividendPerShare;
    // Section 194 Indian Income Tax Act: 10% TDS withholding
    tdsWithheldInr = Number((grossDividendInr * 0.10).toFixed(2));
    netCashCreditedInr = Number((grossDividendInr - tdsWithheldInr).toFixed(2));

    ledgerEntries.push(
      {
        description: `Gross Dividend: ₹${event.dividendPerShare.toFixed(2)}/sh on ${holding.quantity} shares of ${event.symbol}`,
        debit: 0,
        credit: grossDividendInr,
        account: 'DIVIDEND_INCOME',
      },
      {
        description: `Section 194 TDS Withheld (10%) on ${event.symbol} Dividend`,
        debit: tdsWithheldInr,
        credit: 0,
        account: 'TAX_WITHHOLDING_TDS',
      },
      {
        description: `Net Cash Credited to Ledger Account`,
        debit: 0,
        credit: netCashCreditedInr,
        account: 'VIRTUAL_CASH_SETTLEMENT',
      }
    );
  }

  return {
    event,
    symbol: holding.symbol,
    oldQuantity: holding.quantity,
    newQuantity,
    oldAveragePrice: holding.averagePrice,
    newAveragePrice,
    grossDividendInr,
    tdsWithheldInr,
    netCashCreditedInr,
    ledgerEntries,
  };
}

/**
 * Computes split/bonus/dividend adjusted historical price series
 * Backward adjustment preserves recent price scale while eliminating artificial ex-date price drops
 */
export function computeAdjustedPriceSeries(
  rawPrices: { date: string; close: number }[],
  actions: CorporateActionEvent[]
): PriceAdjustmentBar[] {
  const n = rawPrices.length;
  if (n === 0) return [];

  const result: PriceAdjustmentBar[] = new Array<PriceAdjustmentBar>(n);

  // Actions sorted by date
  const actionMap = new Map<string, CorporateActionEvent>();
  for (const a of actions) {
    actionMap.set(a.exDate, a);
  }

  // Calculate cumulative adjustment factors backward from latest bar (bar n-1 factor = 1.0)
  let cumulativeFactor = 1.0;

  for (let i = n - 1; i >= 0; i--) {
    const bar = rawPrices[i]!;
    const action = actionMap.get(bar.date);

    const adjustedClose = Number((bar.close * cumulativeFactor).toFixed(2));
    result[i] = {
      date: bar.date,
      unadjustedClose: bar.close,
      adjustedClose,
      adjustmentFactor: Number(cumulativeFactor.toFixed(4)),
      eventDescription: action ? action.description : undefined,
    };

    // Update cumulative factor for preceding historical bars
    if (action) {
      if (action.type === 'STOCK_SPLIT' && action.ratio) {
        cumulativeFactor *= (1 / action.ratio);
      } else if (action.type === 'BONUS_ISSUE' && action.ratio) {
        cumulativeFactor *= (1 / (1 + action.ratio));
      } else if (action.type === 'CASH_DIVIDEND' && action.dividendPerShare) {
        const divFactor = Math.max(0.5, (bar.close - action.dividendPerShare) / bar.close);
        cumulativeFactor *= divFactor;
      }
    }
  }

  return result;
}

/**
 * Generates sample historical prices crossing an ex-date corporate action
 */
export function generateSampleCorporateActionPrices(
  symbol = 'INFY',
  days = 60
): { date: string; close: number }[] {
  const series: { date: string; close: number }[] = [];
  let basePrice = symbol === 'INFY' ? 1800.0 : symbol === 'TATAMOTORS' ? 980.0 : 2500.0;
  const startDate = new Date('2024-08-01');

  for (let i = 0; i < days; i++) {
    const curDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = curDate.toISOString().split('T')[0]!;

    // Ex-date drop (e.g. 1:1 bonus halving price on 2024-09-12)
    if (symbol === 'INFY' && dateStr === '2024-09-12') {
      basePrice = basePrice / 2; // Halves on ex-bonus date
    }

    // Daily volatility
    const drift = ((Math.sin(i * 1.5) * 1000) % 1) * 12 - 5;
    basePrice = Math.max(50, basePrice + drift);

    series.push({
      date: dateStr,
      close: Number(basePrice.toFixed(2)),
    });
  }

  return series;
}
