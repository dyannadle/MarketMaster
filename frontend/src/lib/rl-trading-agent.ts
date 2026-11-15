// Milestone 39: Reinforcement Learning (RL) Trading Agent Arena & Q-Learning Benchmark
// Implements client-side Q-Learning / Tabular DQN with customizable reward functions and Rule 4.3 drawdown penalty.

export type MarketRegimeRsi = "OVERSOLD" | "NEUTRAL" | "OVERBOUGHT";
export type MarketRegimeTrend = "STRONG_DOWN" | "WEAK_DOWN" | "NEUTRAL" | "WEAK_UP" | "STRONG_UP";
export type MarketRegimeVol = "LOW_VOL" | "HIGH_VOL";
export type AgentPosition = "FLAT" | "LONG" | "SHORT";

export type RlAction = 0 | 1 | 2 | 3; // 0=HOLD, 1=BUY, 2=SELL, 3=CLOSE
export const ACTION_NAMES: Record<RlAction, string> = {
  0: "HOLD",
  1: "BUY",
  2: "SELL",
  3: "CLOSE",
};

export interface RlMarketBar {
  index: number;
  open: number;
  high: number;
  low: number;
  close: number;
  rsi: number;
  emaFast: number;
  emaSlow: number;
  atr: number;
}

export interface RewardWeights {
  pnlWeight: number;       // default 1.0
  drawdownWeight: number;  // default 2.5 (strictly penalizes Rule 4.3 > 1.5% DD)
  churnPenalty: number;    // default 0.05 (penalizes frequent switching/slippage)
  winReward: number;       // default 0.5
}

export interface RlHyperparameters {
  learningRate: number;    // alpha: 0.1
  discountFactor: number;  // gamma: 0.95
  explorationRate: number; // initial epsilon: 1.0
  minExploration: number;  // min epsilon: 0.05
  decayRate: number;       // epsilon decay: 0.96
  episodes: number;        // default 100
}

export interface TrainingHistoryPoint {
  episode: number;
  cumulativeReward: number;
  sharpeRatio: number;
  winRatePct: number;
  maxDrawdownPct: number;
  rule43Compliant: boolean;
}

export interface BenchmarkComparison {
  modelName: "RL_AGENT" | "HUMAN_TRADER" | "BUY_AND_HOLD";
  cumulativeReturnPct: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdownPct: number;
  winRatePct: number;
  profitFactor: number;
  totalTrades: number;
  rule43Compliant: boolean;
  equityCurve: { bar: number; equity: number }[];
}

export interface StatePolicyInfo {
  stateIndex: number;
  rsiZone: MarketRegimeRsi;
  trend: MarketRegimeTrend;
  volatility: MarketRegimeVol;
  position: AgentPosition;
  bestAction: RlAction;
  qValues: number[]; // Q(s, 0), Q(s, 1), Q(s, 2), Q(s, 3)
}

// 1. Encode Discrete State Space into Single Index [0 .. 89]
export function encodeState(
  rsi: number,
  emaFast: number,
  emaSlow: number,
  atrNormalized: number,
  pos: AgentPosition
): number {
  // RSI: 0 = Oversold (<30), 1 = Neutral (30-70), 2 = Overbought (>70)
  let rsiIdx = 1;
  if (rsi < 30) rsiIdx = 0;
  else if (rsi > 70) rsiIdx = 2;

  // Trend: Difference between fast & slow EMA
  const diffPct = (emaFast - emaSlow) / emaSlow;
  let trendIdx = 2; // Neutral
  if (diffPct < -0.015) trendIdx = 0; // Strong Down
  else if (diffPct < -0.003) trendIdx = 1; // Weak Down
  else if (diffPct > 0.015) trendIdx = 4; // Strong Up
  else if (diffPct > 0.003) trendIdx = 3; // Weak Up

  // Volatility: 0 = Low, 1 = High
  const volIdx = atrNormalized > 0.012 ? 1 : 0;

  // Position: 0 = Flat, 1 = Long, 2 = Short
  const posIdx = pos === "FLAT" ? 0 : pos === "LONG" ? 1 : 2;

  // Total combinations: 3 * 5 * 2 * 3 = 90
  return rsiIdx * 30 + trendIdx * 6 + volIdx * 3 + posIdx;
}

// 2. Decode State Index back into components
export function decodeState(stateIdx: number): {
  rsiZone: MarketRegimeRsi;
  trend: MarketRegimeTrend;
  volatility: MarketRegimeVol;
  position: AgentPosition;
} {
  const posIdx = stateIdx % 3;
  const rem1 = Math.floor(stateIdx / 3);
  const volIdx = rem1 % 2;
  const rem2 = Math.floor(rem1 / 2);
  const trendIdx = rem2 % 5;
  const rsiIdx = Math.floor(rem2 / 5);

  const rsiList: MarketRegimeRsi[] = ["OVERSOLD", "NEUTRAL", "OVERBOUGHT"];
  const trendList: MarketRegimeTrend[] = ["STRONG_DOWN", "WEAK_DOWN", "NEUTRAL", "WEAK_UP", "STRONG_UP"];
  const volList: MarketRegimeVol[] = ["LOW_VOL", "HIGH_VOL"];
  const posList: AgentPosition[] = ["FLAT", "LONG", "SHORT"];

  return {
    rsiZone: rsiList[rsiIdx] || "NEUTRAL",
    trend: trendList[trendIdx] || "NEUTRAL",
    volatility: volList[volIdx] || "LOW_VOL",
    position: posList[posIdx] || "FLAT",
  };
}

// 3. Generate Realistic Sample Market Candlestick Sequence with Technical Indicators
export function generateRlMarketData(length: number = 200, seedPrice: number = 24200): RlMarketBar[] {
  const bars: RlMarketBar[] = [];
  let px = seedPrice;
  let emaFast = seedPrice;
  let emaSlow = seedPrice;
  let avgGain = 1.0;
  let avgLoss = 1.0;

  for (let i = 0; i < length; i++) {
    // Semi-cyclical drift with random volatility
    const cycle = Math.sin(i / 15.0) * 0.002;
    const noise = (Math.random() - 0.49) * 0.008;
    const ret = cycle + noise;

    const open = px;
    px = Math.max(100, px * (1.0 + ret));
    const high = px * (1.0 + Math.random() * 0.004);
    const low = px * (1.0 - Math.random() * 0.004);
    const close = px;

    // EMA updates
    emaFast = 0.2 * close + 0.8 * emaFast;
    emaSlow = 0.08 * close + 0.92 * emaSlow;

    // RSI update (Wilder's 14-period)
    const diff = close - open;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * 13 + gain) / 14;
    avgLoss = (avgLoss * 13 + loss) / 14;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    // ATR
    const atr = Math.max(high - low, Math.abs(high - open), Math.abs(low - open));

    bars.push({
      index: i,
      open: Math.round(open * 10) / 10,
      high: Math.round(high * 10) / 10,
      low: Math.round(low * 10) / 10,
      close: Math.round(close * 10) / 10,
      rsi: Math.round(rsi * 10) / 10,
      emaFast: Math.round(emaFast * 10) / 10,
      emaSlow: Math.round(emaSlow * 10) / 10,
      atr: Math.round(atr * 10) / 10,
    });
  }

  return bars;
}

// 4. Q-Learning Trading Agent Class
export class QLearningAgent {
  public numStates: number = 90;
  public numActions: number = 4;
  public qTable: number[][];
  public params: RlHyperparameters;
  public weights: RewardWeights;

  constructor(
    params: Partial<RlHyperparameters> = {},
    weights: Partial<RewardWeights> = {}
  ) {
    this.params = {
      learningRate: 0.1,
      discountFactor: 0.95,
      explorationRate: 1.0,
      minExploration: 0.05,
      decayRate: 0.96,
      episodes: 100,
      ...params,
    };

    this.weights = {
      pnlWeight: 1.0,
      drawdownWeight: 3.0,
      churnPenalty: 0.04,
      winReward: 0.4,
      ...weights,
    };

    // Initialize Q-table [90 x 4] with small zeros/biases
    this.qTable = Array.from({ length: this.numStates }, () => new Array<number>(this.numActions).fill(0));
  }

  // Epsilon-greedy action choice
  public chooseAction(state: number, epsilon: number): RlAction {
    if (Math.random() < epsilon) {
      return (Math.floor(Math.random() * this.numActions) as RlAction);
    }
    const actions = this.qTable[state] || [0, 0, 0, 0];
    let bestA: RlAction = 0;
    let maxQ = -Infinity;
    for (let a = 0; a < actions.length; a++) {
      if ((actions[a] ?? 0) > maxQ) {
        maxQ = actions[a] ?? 0;
        bestA = a as RlAction;
      }
    }
    return bestA;
  }

  // Calculate Reward with Rule 4.3 Drawdown Invariant
  public computeReward(
    priceReturn: number,
    pos: AgentPosition,
    newPos: AgentPosition,
    drawdownPct: number
  ): number {
    let pnl = 0;
    if (pos === "LONG") pnl = priceReturn;
    else if (pos === "SHORT") pnl = -priceReturn;

    let r = pnl * this.weights.pnlWeight * 100.0;

    // Churn penalty if position switched
    if (pos !== newPos && newPos !== "FLAT") {
      r -= this.weights.churnPenalty;
    }

    // Win bonus
    if (pnl > 0.002) r += this.weights.winReward;

    // Strict Rule 4.3 Penalty: If drawdown > 1.5%, severely penalize agent!
    if (drawdownPct > 1.5) {
      const excessDd = drawdownPct - 1.5;
      r -= excessDd * this.weights.drawdownWeight * 2.0;
    }

    return r;
  }

  // Train agent over market series
  public train(bars: RlMarketBar[]): TrainingHistoryPoint[] {
    const history: TrainingHistoryPoint[] = [];
    let eps = this.params.explorationRate;

    for (let ep = 1; ep <= this.params.episodes; ep++) {
      let currentPos: AgentPosition = "FLAT";
      let peakCapital = 1_000_000;
      let capital = 1_000_000;
      let totalReward = 0;
      let maxDd = 0;
      let wins = 0;
      let trades = 0;
      let returns: number[] = [];

      for (let t = 0; t < bars.length - 1; t++) {
        const bar = bars[t]!;
        const nextBar = bars[t + 1]!;

        const state = encodeState(bar.rsi, bar.emaFast, bar.emaSlow, bar.atr / bar.close, currentPos);
        const action = this.chooseAction(state, eps);

        // Transition position based on action
        let nextPos: AgentPosition = currentPos;
        if (action === 1) nextPos = "LONG";
        else if (action === 2) nextPos = "SHORT";
        else if (action === 3) nextPos = "FLAT";

        const barReturn = (nextBar.close - bar.close) / bar.close;
        let tradeRet = 0;
        if (nextPos === "LONG") tradeRet = barReturn;
        else if (nextPos === "SHORT") tradeRet = -barReturn;

        capital *= (1.0 + tradeRet);
        if (capital > peakCapital) peakCapital = capital;
        const currentDd = ((peakCapital - capital) / peakCapital) * 100.0;
        if (currentDd > maxDd) maxDd = currentDd;

        if (tradeRet !== 0) {
          returns.push(tradeRet);
          trades++;
          if (tradeRet > 0) wins++;
        }

        const reward = this.computeReward(barReturn, currentPos, nextPos, currentDd);
        totalReward += reward;

        const nextState = encodeState(nextBar.rsi, nextBar.emaFast, nextBar.emaSlow, nextBar.atr / nextBar.close, nextPos);
        const maxNextQ = Math.max(...(this.qTable[nextState] || [0, 0, 0, 0]));

        // Bellman Q-Update: Q(s, a) = Q(s, a) + alpha * (r + gamma * maxQ(s', a') - Q(s, a))
        const curQ = this.qTable[state]![action] ?? 0;
        this.qTable[state]![action] = curQ + this.params.learningRate * (reward + this.params.discountFactor * maxNextQ - curQ);

        currentPos = nextPos;
      }

      // Compute episode stats
      const winRatePct = trades > 0 ? (wins / trades) * 100.0 : 0;
      const meanRet = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
      const stdRet = returns.length > 1
        ? Math.sqrt(returns.reduce((sum, r) => sum + (r - meanRet) ** 2, 0) / (returns.length - 1))
        : 0.01;
      const sharpe = stdRet > 0 ? (meanRet / stdRet) * Math.sqrt(252) : 0;

      history.push({
        episode: ep,
        cumulativeReward: Math.round(totalReward * 10) / 10,
        sharpeRatio: Math.round(sharpe * 100) / 100,
        winRatePct: Math.round(winRatePct * 10) / 10,
        maxDrawdownPct: Math.round(maxDd * 10) / 10,
        rule43Compliant: maxDd <= 1.5,
      });

      // Decay epsilon
      eps = Math.max(this.params.minExploration, eps * this.params.decayRate);
    }

    return history;
  }

  // Evaluate learned policy against benchmark models on out-of-sample data
  public evaluate(bars: RlMarketBar[]): BenchmarkComparison[] {
    // 1. RL Agent Evaluation (Greedy policy, eps = 0)
    let agentCapital = 1_000_000;
    let agentPeak = 1_000_000;
    let agentMaxDd = 0;
    let agentPos: AgentPosition = "FLAT";
    const agentCurve: { bar: number; equity: number }[] = [];
    const agentTrades: number[] = [];
    let agentWins = 0;

    for (let t = 0; t < bars.length - 1; t++) {
      const b = bars[t]!;
      const nb = bars[t + 1]!;
      const state = encodeState(b.rsi, b.emaFast, b.emaSlow, b.atr / b.close, agentPos);
      const action = this.chooseAction(state, 0.0); // pure greedy

      if (action === 1) agentPos = "LONG";
      else if (action === 2) agentPos = "SHORT";
      else if (action === 3) agentPos = "FLAT";

      const ret = (nb.close - b.close) / b.close;
      let tradeRet = 0;
      if (agentPos === "LONG") tradeRet = ret;
      else if (agentPos === "SHORT") tradeRet = -ret;

      agentCapital *= (1.0 + tradeRet);
      if (agentCapital > agentPeak) agentPeak = agentCapital;
      const dd = ((agentPeak - agentCapital) / agentPeak) * 100.0;
      if (dd > agentMaxDd) agentMaxDd = dd;

      if (tradeRet !== 0) {
        agentTrades.push(tradeRet);
        if (tradeRet > 0) agentWins++;
      }
      agentCurve.push({ bar: t + 1, equity: Math.round(agentCapital) });
    }

    // 2. Buy & Hold Benchmark
    let bhCapital = 1_000_000;
    let bhPeak = 1_000_000;
    let bhMaxDd = 0;
    const bhCurve: { bar: number; equity: number }[] = [];
    const bhTrades: number[] = [];

    for (let t = 0; t < bars.length - 1; t++) {
      const b = bars[t]!;
      const nb = bars[t + 1]!;
      const ret = (nb.close - b.close) / b.close;
      bhCapital *= (1.0 + ret);
      if (bhCapital > bhPeak) bhPeak = bhCapital;
      const dd = ((bhPeak - bhCapital) / bhPeak) * 100.0;
      if (dd > bhMaxDd) bhMaxDd = dd;
      bhTrades.push(ret);
      bhCurve.push({ bar: t + 1, equity: Math.round(bhCapital) });
    }

    // 3. Simulated Human Trader (Moderate rules with occasional lag)
    let humanCapital = 1_000_000;
    let humanPeak = 1_000_000;
    let humanMaxDd = 0;
    let humanPos: AgentPosition = "FLAT";
    const humanCurve: { bar: number; equity: number }[] = [];
    const humanTrades: number[] = [];
    let humanWins = 0;

    for (let t = 0; t < bars.length - 1; t++) {
      const b = bars[t]!;
      const nb = bars[t + 1]!;
      // Simple RSI heuristic for human
      if (b.rsi < 35) humanPos = "LONG";
      else if (b.rsi > 65) humanPos = "SHORT";

      const ret = (nb.close - b.close) / b.close;
      let tradeRet = 0;
      if (humanPos === "LONG") tradeRet = ret;
      else if (humanPos === "SHORT") tradeRet = -ret;

      humanCapital *= (1.0 + tradeRet);
      if (humanCapital > humanPeak) humanPeak = humanCapital;
      const dd = ((humanPeak - humanCapital) / humanPeak) * 100.0;
      if (dd > humanMaxDd) humanMaxDd = dd;

      if (tradeRet !== 0) {
        humanTrades.push(tradeRet);
        if (tradeRet > 0) humanWins++;
      }
      humanCurve.push({ bar: t + 1, equity: Math.round(humanCapital) });
    }

    const calcMetrics = (capital: number, maxDd: number, trades: number[], wins: number) => {
      const cumRet = ((capital - 1_000_000) / 1_000_000) * 100.0;
      const mean = trades.length > 0 ? trades.reduce((a, b) => a + b, 0) / trades.length : 0;
      const std = trades.length > 1
        ? Math.sqrt(trades.reduce((s, r) => s + (r - mean) ** 2, 0) / (trades.length - 1))
        : 0.01;
      const downside = trades.filter((r) => r < 0);
      const downStd = downside.length > 1
        ? Math.sqrt(downside.reduce((s, r) => s + r ** 2, 0) / downside.length)
        : 0.01;

      const sharpe = std > 0 ? (mean / std) * Math.sqrt(252) : 0;
      const sortino = downStd > 0 ? (mean / downStd) * Math.sqrt(252) : 0;
      const grossWins = trades.filter((r) => r > 0).reduce((a, b) => a + b, 0);
      const grossLoss = Math.abs(trades.filter((r) => r < 0).reduce((a, b) => a + b, 0)) || 0.001;
      const pf = grossWins / grossLoss;
      const winRate = trades.length > 0 ? (wins / trades.length) * 100.0 : 0;

      return {
        cumulativeReturnPct: Math.round(cumRet * 10) / 10,
        sharpeRatio: Math.round(sharpe * 100) / 100,
        sortinoRatio: Math.round(sortino * 100) / 100,
        maxDrawdownPct: Math.round(maxDd * 10) / 10,
        winRatePct: Math.round(winRate * 10) / 10,
        profitFactor: Math.round(pf * 100) / 100,
        totalTrades: trades.length,
        rule43Compliant: maxDd <= 1.5,
      };
    };

    return [
      {
        modelName: "RL_AGENT",
        ...calcMetrics(agentCapital, agentMaxDd, agentTrades, agentWins),
        equityCurve: agentCurve,
      },
      {
        modelName: "HUMAN_TRADER",
        ...calcMetrics(humanCapital, humanMaxDd, humanTrades, humanWins),
        equityCurve: humanCurve,
      },
      {
        modelName: "BUY_AND_HOLD",
        ...calcMetrics(bhCapital, bhMaxDd, bhTrades, bhTrades.filter((r) => r > 0).length),
        equityCurve: bhCurve,
      },
    ];
  }

  // Get sample of top Q-value policies for visualization
  public getPolicySample(): StatePolicyInfo[] {
    const samples: StatePolicyInfo[] = [];
    const step = 6; // pick sample of states
    for (let s = 0; s < this.numStates; s += step) {
      const dec = decodeState(s);
      const actions = this.qTable[s] || [0, 0, 0, 0];
      let bestA: RlAction = 0;
      let maxQ = -Infinity;
      for (let a = 0; a < actions.length; a++) {
        if ((actions[a] ?? 0) > maxQ) {
          maxQ = actions[a] ?? 0;
          bestA = a as RlAction;
        }
      }

      samples.push({
        stateIndex: s,
        rsiZone: dec.rsiZone,
        trend: dec.trend,
        volatility: dec.volatility,
        position: dec.position,
        bestAction: bestA,
        qValues: actions.map((v) => Math.round(v * 100) / 100),
      });
    }
    return samples;
  }
}
