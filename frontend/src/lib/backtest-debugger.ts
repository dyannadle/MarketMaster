// Milestone 30: Real-Time Algorithmic Strategy Backtest Visual Debugger & Step-Through Engine
// Implements candle-by-candle playback, signal attribution inspector, and trade journal annotations

export interface DebuggerIndicators {
  fastEma: number;
  slowEma: number;
  atr: number;
  trailingStop: number;
}

export interface DebuggerActivePosition {
  side: "BUY" | "SELL";
  entryPrice: number;
  qty: number;
  unrealizedPnl: number;
  unrealizedReturnPct: number;
  barsHeld: number;
  currentTrailingStop: number;
}

export interface DebuggerTradeAnnotation {
  type: "ENTRY" | "EXIT_TARGET" | "EXIT_STOP_LOSS";
  price: number;
  tag: string; // e.g. #BreakoutRetest, #OrderBlock
  note: string;
}

export interface DebuggerFrame {
  frameIndex: number;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  indicators: DebuggerIndicators;
  signalState: "FLAT" | "LONG_ENTRY" | "SHORT_ENTRY" | "IN_TRADE" | "STOP_LOSS_EXIT" | "TARGET_EXIT";
  signalReason: string;
  activePosition: DebuggerActivePosition | null;
  annotation: DebuggerTradeAnnotation | null;
  equity: number;
}

export interface BacktestDebuggerState {
  strategyName: string;
  symbol: string;
  fastPeriod: number;
  slowPeriod: number;
  totalFrames: number;
  frames: DebuggerFrame[];
  totalTradesExecuted: number;
  finalEquity: number;
  netPnl: number;
}

// 1. Generate Deterministic Bar-by-Bar Step-Through Replay Sequence
export function generateBacktestDebuggerFrames(
  strategyName: string = "Dual_EMA_Crossover",
  symbol: string = "NIFTY_FUT",
  numBars: number = 30,
  fastPeriod: number = 9,
  slowPeriod: number = 21,
  startPrice: number = 24350
): BacktestDebuggerState {
  const frames: DebuggerFrame[] = [];
  let currentPrice = startPrice;
  let currentEquity = 1000000;
  let activePos: DebuggerActivePosition | null = null;
  let tradesCount = 0;

  // Running EMAs
  let fastEma = currentPrice;
  let slowEma = currentPrice;
  const alphaFast = 2 / (fastPeriod + 1);
  const alphaSlow = 2 / (slowPeriod + 1);

  const now = new Date();

  for (let i = 0; i < numBars; i++) {
    const barTime = new Date(now.getTime() - (numBars - i) * 15 * 60 * 1000);
    const timeStr = barTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    // Deterministic price drift: Initial dip bars 0..5, then sharp bullish trend expansion bars 6..18
    const cycle = i < 6 ? -12 * (i + 1) : (i - 5) * 22 - 70;
    const open = Math.round(currentPrice);
    const close = Math.round(startPrice + cycle);
    const high = Math.max(open, close) + Math.round(15 + Math.abs(Math.sin(i)) * 12);
    const low = Math.min(open, close) - Math.round(12 + Math.abs(Math.cos(i)) * 10);
    currentPrice = close;

    // Update EMAs
    fastEma = Number((close * alphaFast + fastEma * (1 - alphaFast)).toFixed(2));
    slowEma = Number((close * alphaSlow + slowEma * (1 - alphaSlow)).toFixed(2));
    const atr = Number((22 + Math.abs(Math.sin(i * 0.4)) * 10).toFixed(1));

    let signalState: DebuggerFrame["signalState"] = "FLAT";
    let signalReason = "Conditions neutral. Monitoring fast/slow EMA gap.";
    let annotation: DebuggerTradeAnnotation | null = null;

    const prevFrame = i > 0 ? frames[i - 1] : null;
    const prevFast = prevFrame ? prevFrame.indicators.fastEma : fastEma;
    const prevSlow = prevFrame ? prevFrame.indicators.slowEma : slowEma;

    // Check Long Entry: Fast crosses above Slow
    if (!activePos && prevFast <= prevSlow && fastEma > slowEma && i >= 6) {
      signalState = "LONG_ENTRY";
      const trailingStop = Number((close - atr * 1.5).toFixed(2));
      signalReason = `Fast EMA (₹${fastEma}) crossed ABOVE Slow EMA (₹${slowEma}). Bullish trend momentum initiated.`;
      activePos = {
        side: "BUY",
        entryPrice: close,
        qty: 250,
        unrealizedPnl: 0,
        unrealizedReturnPct: 0,
        barsHeld: 1,
        currentTrailingStop: trailingStop,
      };
      annotation = {
        type: "ENTRY",
        price: close,
        tag: "#DualEmaBreakout",
        note: `Entered Long @ ₹${close}. Initial Invalidation Stop-Loss: ₹${trailingStop}.`,
      };
      tradesCount++;
    } else if (activePos) {
      // Manage Active Position
      activePos.barsHeld++;
      const mtmPerShare = close - activePos.entryPrice;
      activePos.unrealizedPnl = Math.round(mtmPerShare * activePos.qty);
      activePos.unrealizedReturnPct = Number(((mtmPerShare / activePos.entryPrice) * 100).toFixed(2));

      // Trail Stop Loss upward
      const candidateStop = Number((close - atr * 1.5).toFixed(2));
      if (candidateStop > activePos.currentTrailingStop) {
        activePos.currentTrailingStop = candidateStop;
      }

      // Check Exit: Low breaches Trailing Stop OR Fast crosses below Slow
      if (low <= activePos.currentTrailingStop || (fastEma < slowEma && i > 15)) {
        signalState = "TARGET_EXIT";
        const exitPrice = low <= activePos.currentTrailingStop ? activePos.currentTrailingStop : close;
        const finalTradePnl = Math.round((exitPrice - activePos.entryPrice) * activePos.qty);
        currentEquity += finalTradePnl;

        signalReason = `Position Exited! Fast EMA weakened (₹${fastEma} < ₹${slowEma}) or Trailing Stop hit at ₹${exitPrice}. P&L: ₹${finalTradePnl.toLocaleString("en-IN")}.`;
        annotation = {
          type: "EXIT_TARGET",
          price: exitPrice,
          tag: "#TrendExhaustion",
          note: `Locked in profit of +₹${finalTradePnl.toLocaleString("en-IN")} (+${activePos.unrealizedReturnPct}%).`,
        };
        activePos = null;
      } else {
        signalState = "IN_TRADE";
        signalReason = `Holding Long (${activePos.barsHeld} bars). Trailing Stop trailed up to ₹${activePos.currentTrailingStop} (ATR 1.5x). MTM: ₹${activePos.unrealizedPnl.toLocaleString("en-IN")}.`;
      }
    }

    const trailingStop = activePos ? activePos.currentTrailingStop : Number((close - atr * 1.5).toFixed(2));

    frames.push({
      frameIndex: i + 1,
      timestamp: timeStr,
      open,
      high,
      low,
      close,
      volume: Math.round(2500 + Math.sin(i) * 1800),
      indicators: {
        fastEma,
        slowEma,
        atr,
        trailingStop,
      },
      signalState,
      signalReason,
      activePosition: activePos ? { ...activePos } : null,
      annotation,
      equity: currentEquity + (activePos ? activePos.unrealizedPnl : 0),
    });
  }

  return {
    strategyName,
    symbol,
    fastPeriod,
    slowPeriod,
    totalFrames: frames.length,
    frames,
    totalTradesExecuted: tradesCount,
    finalEquity: currentEquity,
    netPnl: currentEquity - 1000000,
  };
}
