// Milestone 21: Genetic Algorithm Strategy Parameter Optimizer
// Evolves multi-parameter quantitative strategies optimizing Calmar Ratio, Sharpe Ratio and Rule 4.3 drawdown bounds.

export interface StrategyChromosome {
  fastPeriod: number; // 5 to 45
  slowPeriod: number; // 20 to 150
  atrMultiplier: number; // 1.0 to 4.0
  riskPerTrade: number; // 0.2 to 1.5% (Rule 4.3 cap)
  fitness: number;
  calmarRatio: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  winRatePct: number;
  netReturnPct: number;
  totalTrades: number;
  rule43Compliant: boolean;
}

export interface GenerationStats {
  generation: number;
  bestFitness: number;
  avgFitness: number;
  bestCalmar: number;
  bestDrawdown: number;
}

export interface OptimizationResult {
  bestChromosome: StrategyChromosome;
  history: GenerationStats[];
  totalGenerations: number;
  populationSize: number;
  elapsedMs: number;
}

/** Evaluates a chromosome over historical/seeded candle series */
export function evaluateChromosome(
  chromosome: Omit<StrategyChromosome, "fitness" | "calmarRatio" | "sharpeRatio" | "maxDrawdownPct" | "winRatePct" | "netReturnPct" | "totalTrades" | "rule43Compliant">,
  prices: number[]
): StrategyChromosome {
  const { fastPeriod, slowPeriod, atrMultiplier, riskPerTrade } = chromosome;

  // Invalid crossover check: fast must be strictly less than slow
  if (fastPeriod >= slowPeriod) {
    return {
      ...chromosome,
      fitness: -100.0,
      calmarRatio: 0,
      sharpeRatio: -1.0,
      maxDrawdownPct: 100,
      winRatePct: 0,
      netReturnPct: -100,
      totalTrades: 0,
      rule43Compliant: false,
    };
  }

  // Calculate Exponential Moving Averages (EMA)
  const calcEma = (period: number): number[] => {
    const k = 2 / (period + 1);
    const ema: number[] = [prices[0] ?? 24500];
    for (let i = 1; i < prices.length; i++) {
      const p = prices[i] ?? 24500;
      const prev = ema[i - 1] ?? p;
      ema.push(p * k + prev * (1 - k));
    }
    return ema;
  };

  const fastEma = calcEma(fastPeriod);
  const slowEma = calcEma(slowPeriod);

  // Backtest simulation
  let cash = 1000000;
  const initialCash = cash;
  let inPosition = false;
  let entryPrice = 0;
  let stopLoss = 0;
  let qty = 0;
  let wins = 0;
  let trades = 0;
  let peakEquity = cash;
  let maxDrawdown = 0;
  const returns: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const p = prices[i] ?? 24500;
    const prevFast = fastEma[i - 1] ?? p;
    const currFast = fastEma[i] ?? p;
    const prevSlow = slowEma[i - 1] ?? p;
    const currSlow = slowEma[i] ?? p;

    // ATR estimate: 0.8% of spot
    const atr = p * 0.008;

    if (!inPosition) {
      // Golden Cross Entry (Fast crosses above Slow)
      if (prevFast <= prevSlow && currFast > currSlow) {
        inPosition = true;
        entryPrice = p;
        stopLoss = p - atr * atrMultiplier;
        // Position sizing based on risk per trade
        const riskAmount = (cash * (riskPerTrade / 100));
        const riskPerShare = Math.max(1, entryPrice - stopLoss);
        qty = Math.max(1, Math.floor(riskAmount / riskPerShare));
      }
    } else {
      // Position tracking
      const currentEquity = cash + (p - entryPrice) * qty;
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }
      const dd = ((peakEquity - currentEquity) / peakEquity) * 100;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }

      // Exit conditions: Stop loss or Death Cross (Fast crosses below Slow)
      const hitStop = p <= stopLoss;
      const deathCross = prevFast >= prevSlow && currFast < currSlow;

      if (hitStop || deathCross) {
        const pnl = (p - entryPrice) * qty;
        cash += pnl;
        returns.push(pnl / initialCash);
        trades++;
        if (pnl > 0) wins++;
        inPosition = false;
      }
    }
  }

  // Close open position at end
  if (inPosition) {
    const finalP = prices[prices.length - 1] ?? 24500;
    const pnl = (finalP - entryPrice) * qty;
    cash += pnl;
    returns.push(pnl / initialCash);
    trades++;
    if (pnl > 0) wins++;
  }

  const netReturnPct = ((cash - initialCash) / initialCash) * 100;
  const winRatePct = trades > 0 ? (wins / trades) * 100 : 0;
  const calmarRatio = maxDrawdown > 0.01 ? netReturnPct / maxDrawdown : 0;

  // Compute Sharpe Ratio
  let sharpeRatio = 0;
  if (returns.length > 1) {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
    const std = Math.sqrt(variance);
    sharpeRatio = std > 0 ? (mean / std) * Math.sqrt(252) : 0;
  }

  // Rule 4.3 Capital Risk Gate: Daily drawdown ceiling is 1.50%
  const rule43Compliant = maxDrawdown <= 1.50;

  // Multi-objective Fitness function
  let fitness = (calmarRatio * 0.6) + (sharpeRatio * 0.4) + (winRatePct / 100);

  // Penalize Rule 4.3 breach heavily
  if (!rule43Compliant) {
    fitness -= (maxDrawdown - 1.5) * 15.0;
  }

  // Penalize over-fitting with too few trades
  if (trades < 3) {
    fitness -= 20.0;
  }

  return {
    ...chromosome,
    fitness: Math.round(fitness * 100) / 100,
    calmarRatio: Math.round(calmarRatio * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    maxDrawdownPct: Math.round(maxDrawdown * 100) / 100,
    winRatePct: Math.round(winRatePct * 10) / 10,
    netReturnPct: Math.round(netReturnPct * 100) / 100,
    totalTrades: trades,
    rule43Compliant,
  };
}

/** Generates a random valid chromosome */
function randomChromosome(): StrategyChromosome {
  const fast = Math.floor(Math.random() * 35 + 5); // 5 to 40
  const slow = Math.floor(Math.random() * 80 + fast + 10); // fast+10 to ~130
  const atr = Math.round((Math.random() * 2.5 + 1.2) * 10) / 10; // 1.2 to 3.7
  const risk = Math.round((Math.random() * 1.0 + 0.3) * 10) / 10; // 0.3 to 1.3%

  return {
    fastPeriod: fast,
    slowPeriod: slow,
    atrMultiplier: atr,
    riskPerTrade: Math.min(1.5, risk), // Cap at 1.5% Rule 4.3
    fitness: 0,
    calmarRatio: 0,
    sharpeRatio: 0,
    maxDrawdownPct: 0,
    winRatePct: 0,
    netReturnPct: 0,
    totalTrades: 0,
    rule43Compliant: true,
  };
}

/**
 * Runs complete Genetic Algorithm Optimization over price series
 */
export function runGeneticOptimizer(
  priceSeries: number[],
  options: {
    populationSize?: number;
    generations?: number;
    mutationRate?: number;
  } = {}
): OptimizationResult {
  const popSize = options.populationSize || 25;
  const numGens = options.generations || 12;
  const mutRate = options.mutationRate || 0.25;

  const startMs = Date.now();
  const history: GenerationStats[] = [];

  // 1. Initialize random population
  let population: StrategyChromosome[] = [];
  for (let i = 0; i < popSize; i++) {
    const raw = randomChromosome();
    population.push(evaluateChromosome(raw, priceSeries));
  }

  // 2. Evolutionary loop
  for (let gen = 0; gen < numGens; gen++) {
    // Sort descending by fitness
    population.sort((a, b) => b.fitness - a.fitness);

    const best = population[0]!;
    const avgFitness = population.reduce((s, c) => s + c.fitness, 0) / popSize;

    history.push({
      generation: gen + 1,
      bestFitness: best.fitness,
      avgFitness: Math.round(avgFitness * 100) / 100,
      bestCalmar: best.calmarRatio,
      bestDrawdown: best.maxDrawdownPct,
    });

    // Elitism: Preserve top 2 individuals
    const nextGen: StrategyChromosome[] = [population[0]!, population[1]!];

    // Reproduce remainder of population
    while (nextGen.length < popSize) {
      // Tournament selection (k = 3)
      const selectOne = (): StrategyChromosome => {
        const i1 = Math.floor(Math.random() * popSize);
        const i2 = Math.floor(Math.random() * popSize);
        const i3 = Math.floor(Math.random() * popSize);
        const c1 = population[i1]!;
        const c2 = population[i2]!;
        const c3 = population[i3]!;
        if (c1.fitness >= c2.fitness && c1.fitness >= c3.fitness) return c1;
        if (c2.fitness >= c1.fitness && c2.fitness >= c3.fitness) return c2;
        return c3;
      };

      const p1 = selectOne();
      const p2 = selectOne();

      // Crossover (Uniform)
      let childFast = Math.random() < 0.5 ? p1.fastPeriod : p2.fastPeriod;
      let childSlow = Math.random() < 0.5 ? p1.slowPeriod : p2.slowPeriod;
      let childAtr = Math.random() < 0.5 ? p1.atrMultiplier : p2.atrMultiplier;
      let childRisk = Math.random() < 0.5 ? p1.riskPerTrade : p2.riskPerTrade;

      // Mutation
      if (Math.random() < mutRate) {
        childFast = Math.max(5, Math.min(45, childFast + Math.floor((Math.random() - 0.5) * 6)));
      }
      if (Math.random() < mutRate) {
        childSlow = Math.max(childFast + 5, Math.min(160, childSlow + Math.floor((Math.random() - 0.5) * 12)));
      }
      if (Math.random() < mutRate) {
        childAtr = Math.max(1.0, Math.min(4.0, Math.round((childAtr + (Math.random() - 0.5) * 0.4) * 10) / 10));
      }
      if (Math.random() < mutRate) {
        childRisk = Math.max(0.2, Math.min(1.5, Math.round((childRisk + (Math.random() - 0.5) * 0.3) * 10) / 10));
      }

      // Ensure valid fast < slow
      if (childFast >= childSlow) {
        childSlow = childFast + 15;
      }

      const evaluated = evaluateChromosome(
        {
          fastPeriod: childFast,
          slowPeriod: childSlow,
          atrMultiplier: childAtr,
          riskPerTrade: childRisk,
        },
        priceSeries
      );
      nextGen.push(evaluated);
    }

    population = nextGen;
  }

  population.sort((a, b) => b.fitness - a.fitness);

  return {
    bestChromosome: population[0]!,
    history,
    totalGenerations: numGens,
    populationSize: popSize,
    elapsedMs: Date.now() - startMs,
  };
}
