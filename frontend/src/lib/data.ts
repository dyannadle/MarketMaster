export type Course = { id: string; code: string; title: string; lessons: number; topics: string[] };
export type Level = { level: number; name: string; blurb: string; courses: Course[] };

const c = (code: string, title: string, topics: string[]): Course => ({
  id: code.replace(".", "-"),
  code,
  title,
  lessons: topics.length * 3 + 2,
  topics,
});

export const curriculum: Level[] = [
  { level: 0, name: "Financial Literacy", blurb: "Money, personal finance, maths & statistics.", courses: [
    c("0.1", "Understanding Money", ["Inflation", "Time value of money", "Compounding", "Interest rates"]),
    c("0.2", "Personal Finance", ["Budgeting", "Emergency funds", "Insurance", "Goal planning"]),
    c("0.3", "Mathematics for Finance", ["Percentages", "Returns & CAGR", "Logarithms", "Annuities"]),
    c("0.4", "Statistics & Probability", ["Mean & variance", "Distributions", "Correlation", "Expected value"]),
  ]},
  { level: 1, name: "Markets & Microstructure", blurb: "Exchanges, regulators, quotes, order types.", courses: [
    c("1.1", "Introduction to Financial Markets", ["Primary vs secondary", "Participants", "Asset classes"]),
    c("1.2", "Indian Financial System", ["SEBI", "RBI", "NSE & BSE", "MCX & MSEI", "Clearing & depositories"]),
    c("1.3", "Market Instruments", ["Equity", "Debt", "Derivatives", "Hybrids"]),
    c("1.4", "Trading Accounts & Access", ["Demat", "Brokers", "KYC", "Segments"]),
    c("1.5", "Prices, Quotes & Spreads", ["Bid–ask spread", "LTP", "Tick size", "Circuits"]),
    c("1.6", "Liquidity & Market Depth", ["Order book", "Depth", "Impact cost"]),
    c("1.7", "Order Types", ["Market", "Limit", "Stop-loss", "Bracket & cover", "GTT"]),
    c("1.8", "Matching & Trading Sessions", ["Price-time priority", "Pre-open", "Call auctions"]),
  ]},
  { level: 2, name: "Investing & Analysis", blurb: "Macro, statements, funds, ETFs, bonds.", courses: [
    c("2.1", "Macroeconomics & Monetary Policy", ["GDP", "Repo rate", "Yield curve"]),
    c("2.2", "Financial Statements", ["Income statement", "Balance sheet", "Cash flow"]),
    c("2.3", "Fundamental Analysis", ["Ratios", "Moats", "Valuation multiples"]),
    c("2.4", "Equity & Corporate Actions", ["IPOs", "Dividends", "Splits & bonus", "Buybacks"]),
    c("2.5", "Mutual Funds", ["NAV", "SIP", "Expense ratio", "Fund categories"]),
    c("2.6", "ETFs & Passive Investing", ["Index funds", "Tracking error", "iNAV"]),
    c("2.7", "Fixed Income & Bonds", ["Yield", "Duration", "Credit risk"]),
    c("2.8", "Portfolio Construction", ["Asset allocation", "Rebalancing", "Diversification"]),
  ]},
  { level: 3, name: "Trading & Derivatives", blurb: "Technicals, futures, options, currency, commodities.", courses: [
    c("3.1", "Technical Analysis Foundations", ["Candlesticks", "Trends", "Support & resistance"]),
    c("3.2", "Technical Indicators", ["Moving averages", "RSI", "MACD", "VWAP"]),
    c("3.3", "Trading Strategies", ["Breakouts", "Mean reversion", "Trade management"]),
    c("3.4", "Futures", ["Lot sizes", "Margin & MTM", "Rollover", "Basis"]),
    c("3.5", "Options Fundamentals", ["Calls & puts", "Moneyness", "Option chain"]),
    c("3.6", "Options Pricing & Greeks", ["Black–Scholes", "Delta", "Theta & Vega", "IV"]),
    c("3.7", "Options Strategies", ["Spreads", "Straddles", "Iron condor", "Hedging"]),
    c("3.8", "Currency & Commodity Markets", ["USDINR", "Bullion", "Energy", "Agri"]),
  ]},
  { level: 4, name: "Risk, Quant & Algo", blurb: "RMS, quant models, backtesting, execution algos.", courses: [
    c("4.1", "Risk Management & RMS", ["Margin & leverage", "VaR", "Position sizing", "Square-off"]),
    c("4.2", "Quantitative Finance", ["Returns modelling", "Volatility", "Factor models"]),
    c("4.3", "Programming for Trading", ["Python basics", "Pandas", "Broker APIs"]),
    c("4.4", "Algorithmic Trading Systems", ["Signals", "Event loop", "Order routing"]),
    c("4.5", "Backtesting & Validation", ["Lookahead bias", "Walk-forward", "Overfitting"]),
    c("4.6", "Execution Algorithms", ["TWAP", "VWAP", "Iceberg & slicing", "POV"]),
  ]},
  { level: 5, name: "Global & Professional", blurb: "Global markets, valuation, ethics, taxation.", courses: [
    c("5.1", "Global Financial Markets", ["US markets", "Europe & Asia", "Global FX"]),
    c("5.2", "Corporate Finance & Valuation", ["DCF", "WACC", "M&A"]),
    c("5.3", "Institutional & Alternatives", ["REITs & InvITs", "PE & VC", "Hedge funds"]),
    c("5.4", "Digital Assets & FinTech", ["Blockchain", "Stablecoins", "CBDC"]),
    c("5.5", "Psychology & Ethics", ["Biases", "Journaling", "Fraud prevention"]),
    c("5.6", "Regulations & Taxation", ["STCG / LTCG", "F&O taxation", "Insider trading rules"]),
  ]},
];

export const allCourses = curriculum.flatMap((l) => l.courses.map((c) => ({ ...c, level: l.level })));

export type Instrument = { symbol: string; name: string; segment: "Equity" | "F&O" | "Currency" | "Commodity" | "ETF" | "Index"; exchange: string; price: number; lot: number };

export const instruments: Instrument[] = [
  { symbol: "NIFTY 50", name: "Nifty 50 Index", segment: "Index", exchange: "NSE", price: 24350, lot: 1 },
  { symbol: "SENSEX", name: "BSE Sensex", segment: "Index", exchange: "BSE", price: 80120, lot: 1 },
  { symbol: "RELIANCE", name: "Reliance Industries", segment: "Equity", exchange: "NSE", price: 2945.5, lot: 1 },
  { symbol: "TCS", name: "Tata Consultancy Services", segment: "Equity", exchange: "NSE", price: 4120.2, lot: 1 },
  { symbol: "HDFCBANK", name: "HDFC Bank", segment: "Equity", exchange: "NSE", price: 1688.4, lot: 1 },
  { symbol: "INFY", name: "Infosys", segment: "Equity", exchange: "NSE", price: 1862.75, lot: 1 },
  { symbol: "NIFTY FUT", name: "Nifty Futures (Monthly)", segment: "F&O", exchange: "NSE", price: 24410, lot: 75 },
  { symbol: "BANKNIFTY FUT", name: "Bank Nifty Futures", segment: "F&O", exchange: "NSE", price: 52180, lot: 30 },
  { symbol: "USDINR", name: "USD/INR Futures", segment: "Currency", exchange: "NSE", price: 83.42, lot: 1000 },
  { symbol: "EURINR", name: "EUR/INR Futures", segment: "Currency", exchange: "NSE", price: 90.18, lot: 1000 },
  { symbol: "GOLD", name: "Gold Futures", segment: "Commodity", exchange: "MCX", price: 72450, lot: 1 },
  { symbol: "CRUDEOIL", name: "Crude Oil Futures", segment: "Commodity", exchange: "MCX", price: 6520, lot: 100 },
  { symbol: "NIFTYBEES", name: "Nippon Nifty BeES", segment: "ETF", exchange: "NSE", price: 268.3, lot: 1 },
  { symbol: "GOLDBEES", name: "Nippon Gold BeES", segment: "ETF", exchange: "NSE", price: 62.1, lot: 1 },
];

export const strategies = [
  { name: "TWAP Slicer", type: "Execution", desc: "Split a large order evenly across time buckets." },
  { name: "VWAP Tracker", type: "Execution", desc: "Follow intraday volume profile to minimise impact." },
  { name: "Iceberg Order", type: "Execution", desc: "Show only a small visible quantity in the book." },
  { name: "MA Crossover", type: "Signal", desc: "Buy when fast MA crosses above slow MA." },
  { name: "RSI Mean Reversion", type: "Signal", desc: "Fade extremes when RSI < 30 or > 70." },
  { name: "Calendar Spread", type: "Spread", desc: "Long far-month, short near-month futures." },
  { name: "Cash-Futures Arbitrage", type: "Arbitrage", desc: "Capture basis between spot and futures." },
  { name: "Protective Put Hedge", type: "Hedging", desc: "Insure a long portfolio with index puts." },
];

export const challenges = [
  { title: "First 10 Trades", desc: "Place 10 paper trades with stop-losses.", reward: "Rookie badge", progress: 60 },
  { title: "Risk Discipline", desc: "Never risk more than 1% per trade for a week.", reward: "Risk Guardian", progress: 35 },
  { title: "Options Explorer", desc: "Build and analyse 3 option spreads.", reward: "Greeks Graduate", progress: 10 },
  { title: "Level 1 Mastery", desc: "Clear every Level 1 quiz with 80%+.", reward: "Market Insider", progress: 80 },
];

export const leaderboard = [
  { name: "Aarav S.", ret: 18.4, trades: 142 },
  { name: "Meera K.", ret: 15.1, trades: 98 },
  { name: "Rohan P.", ret: 12.7, trades: 211 },
  { name: "Isha T.", ret: 9.9, trades: 64 },
  { name: "Kabir M.", ret: 7.3, trades: 120 },
];

export function seededSeries(seed: number, n: number, start: number, vol = 0.012) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const out: { t: number; v: number }[] = [];
  let v = start;
  for (let i = 0; i < n; i++) {
    v = v * (1 + (rnd() - 0.48) * vol);
    out.push({ t: i, v: +v.toFixed(2) });
  }
  return out;
}

export const inr = (n: number) =>
  "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
