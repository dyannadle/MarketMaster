/**
 * Genetic Programming Alpha Formula Discoverer (Symbolic Regression Engine)
 * Milestone 33: AST Expression Trees, Multi-Objective Fitness (IC + Sharpe - Parsimony Penalty), & Vectorized Polars Code Export
 */

export type TerminalFeature = 'open' | 'high' | 'low' | 'close' | 'volume' | 'vwap' | 'returns';
export type UnaryOp = 'abs' | 'sign' | 'log' | 'rank' | 'neg';
export type BinaryOp = 'add' | 'sub' | 'mul' | 'div';
export type TsOp = 'ts_delay' | 'ts_delta' | 'ts_mean' | 'ts_std' | 'ts_decay';

export type AlphaNode =
  | { type: 'feature'; name: TerminalFeature }
  | { type: 'constant'; value: number }
  | { type: 'unary'; op: UnaryOp; child: AlphaNode }
  | { type: 'binary'; op: BinaryOp; left: AlphaNode; right: AlphaNode }
  | { type: 'ts'; op: TsOp; window: number; child: AlphaNode };

export interface MarketDataBar {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
  returns: number;
}

export interface AlphaIndividual {
  id: string;
  tree: AlphaNode;
  depth: number;
  nodeCount: number;
  formulaStr: string;
  ic: number; // Information Coefficient (Correlation with forward returns)
  sharpe: number; // Annualized Long-Short Sharpe Ratio
  fitness: number; // IC + Sharpe - Parsimony Penalty
}

export interface EvolutionConfig {
  populationSize: number;
  generations: number;
  maxInitialDepth: number;
  maxDepth: number;
  tournamentSize: number;
  crossoverRate: number;
  mutationRate: number;
  parsimonyCoeff: number; // Penalty per node (e.g. 0.02)
  forwardWindow: number; // Forward bar horizon for IC
}

export const DEFAULT_EVOLUTION_CONFIG: EvolutionConfig = {
  populationSize: 30,
  generations: 10,
  maxInitialDepth: 3,
  maxDepth: 5,
  tournamentSize: 3,
  crossoverRate: 0.7,
  mutationRate: 0.25,
  parsimonyCoeff: 0.03,
  forwardWindow: 1,
};

const TERMINAL_FEATURES: TerminalFeature[] = ['open', 'high', 'low', 'close', 'volume', 'vwap', 'returns'];
const CONSTANTS: number[] = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0];
const UNARY_OPS: UnaryOp[] = ['abs', 'sign', 'log', 'rank', 'neg'];
const BINARY_OPS: BinaryOp[] = ['add', 'sub', 'mul', 'div'];
const TS_OPS: TsOp[] = ['ts_delay', 'ts_delta', 'ts_mean', 'ts_std', 'ts_decay'];
const TS_WINDOWS: number[] = [3, 5, 10, 20];

/**
 * Calculates node count and max depth of an AST node
 */
export function getNodeStats(node: AlphaNode): { count: number; depth: number } {
  if (node.type === 'feature' || node.type === 'constant') {
    return { count: 1, depth: 1 };
  }
  if (node.type === 'unary' || node.type === 'ts') {
    const childStats = getNodeStats(node.child);
    return { count: 1 + childStats.count, depth: 1 + childStats.depth };
  }
  if (node.type === 'binary') {
    const leftStats = getNodeStats(node.left);
    const rightStats = getNodeStats(node.right);
    return {
      count: 1 + leftStats.count + rightStats.count,
      depth: 1 + Math.max(leftStats.depth, rightStats.depth),
    };
  }
  return { count: 1, depth: 1 };
}

/**
 * Converts AST into human-readable mathematical formula string
 */
export function alphaToString(node: AlphaNode): string {
  switch (node.type) {
    case 'feature':
      return node.name;
    case 'constant':
      return node.value.toString();
    case 'unary':
      return `${node.op}(${alphaToString(node.child)})`;
    case 'binary':
      return `(${alphaToString(node.left)} ${node.op === 'add' ? '+' : node.op === 'sub' ? '-' : node.op === 'mul' ? '*' : '/'} ${alphaToString(node.right)})`;
    case 'ts':
      return `${node.op}(${alphaToString(node.child)}, ${node.window})`;
  }
}

/**
 * Translates AST into high-performance vectorized Python / Polars code
 */
export function exportToPolarsPython(node: AlphaNode): string {
  function toPolars(n: AlphaNode): string {
    switch (n.type) {
      case 'feature':
        return `pl.col("${n.name}")`;
      case 'constant':
        return `pl.lit(${n.value})`;
      case 'unary':
        switch (n.op) {
          case 'abs': return `(${toPolars(n.child)}).abs()`;
          case 'sign': return `(${toPolars(n.child)}).sign()`;
          case 'log': return `(${toPolars(n.child)}).log()`;
          case 'rank': return `(${toPolars(n.child)}).rank(method='average') / pl.len()`;
          case 'neg': return `(-(${toPolars(n.child)}))`;
        }
        break;
      case 'binary': {
        const left = toPolars(n.left);
        const right = toPolars(n.right);
        switch (n.op) {
          case 'add': return `(${left} + ${right})`;
          case 'sub': return `(${left} - ${right})`;
          case 'mul': return `(${left} * ${right})`;
          case 'div': return `(${left} / (${right} + 1e-6))`;
        }
        break;
      }
      case 'ts': {
        const child = toPolars(n.child);
        switch (n.op) {
          case 'ts_delay': return `(${child}).shift(${n.window})`;
          case 'ts_delta': return `((${child}) - (${child}).shift(${n.window}))`;
          case 'ts_mean': return `(${child}).rolling_mean(window_size=${n.window})`;
          case 'ts_std': return `(${child}).rolling_std(window_size=${n.window})`;
          case 'ts_decay': return `(${child}).ewm_mean(span=${n.window})`;
        }
      }
    }
    return 'pl.col("close")';
  }

  const expr = toPolars(node);
  return `import polars as pl

def compute_alpha(df: pl.DataFrame) -> pl.DataFrame:
    """
    Auto-evolved Institutional Alpha via Symbolic Regression (MarketMaster Lab)
    Expression: ${alphaToString(node)}
    """
    return df.with_columns(
        alpha_signal=${expr}
    ).with_columns(
        # Normalize signal to [-1.0, 1.0] z-score weights
        target_weight=((pl.col("alpha_signal") - pl.col("alpha_signal").mean()) / (pl.col("alpha_signal").std() + 1e-6)).clip(-1.0, 1.0)
    )
`;
}

/**
 * Creates a random AST using grow or full tree generation
 */
export function generateRandomTree(maxDepth: number, currentDepth = 1, method: 'grow' | 'full' = 'grow'): AlphaNode {
  if (currentDepth >= maxDepth || (method === 'grow' && Math.random() < 0.3 && currentDepth > 1)) {
    // Terminal node
    if (Math.random() < 0.7) {
      const feat = TERMINAL_FEATURES[Math.floor(Math.random() * TERMINAL_FEATURES.length)] || 'close';
      return { type: 'feature', name: feat };
    } else {
      const val = CONSTANTS[Math.floor(Math.random() * CONSTANTS.length)] ?? 1.0;
      return { type: 'constant', value: val };
    }
  }

  // Operator node: select between unary, binary, ts
  const r = Math.random();
  if (r < 0.35) {
    const op = UNARY_OPS[Math.floor(Math.random() * UNARY_OPS.length)] || 'abs';
    return {
      type: 'unary',
      op,
      child: generateRandomTree(maxDepth, currentDepth + 1, method),
    };
  } else if (r < 0.70) {
    const op = BINARY_OPS[Math.floor(Math.random() * BINARY_OPS.length)] || 'sub';
    return {
      type: 'binary',
      op,
      left: generateRandomTree(maxDepth, currentDepth + 1, method),
      right: generateRandomTree(maxDepth, currentDepth + 1, method),
    };
  } else {
    const op = TS_OPS[Math.floor(Math.random() * TS_OPS.length)] || 'ts_mean';
    const window = TS_WINDOWS[Math.floor(Math.random() * TS_WINDOWS.length)] || 5;
    return {
      type: 'ts',
      op,
      window,
      child: generateRandomTree(maxDepth, currentDepth + 1, method),
    };
  }
}

/**
 * Evaluates an AST on a sequence of historical market data bars
 */
export function evaluateAlphaTree(node: AlphaNode, bars: MarketDataBar[]): number[] {
  const n = bars.length;
  const result = new Array<number>(n).fill(0);

  switch (node.type) {
    case 'feature': {
      const fname = node.name;
      for (let i = 0; i < n; i++) {
        result[i] = bars[i] ? bars[i]![fname] : 0;
      }
      return result;
    }
    case 'constant': {
      const val = node.value;
      for (let i = 0; i < n; i++) result[i] = val;
      return result;
    }
    case 'unary': {
      const childVals = evaluateAlphaTree(node.child, bars);
      for (let i = 0; i < n; i++) {
        const v = childVals[i] ?? 0;
        switch (node.op) {
          case 'abs': result[i] = Math.abs(v); break;
          case 'sign': result[i] = Math.sign(v); break;
          case 'log': result[i] = v > 0 ? Math.log(v + 1e-6) : 0; break;
          case 'rank': result[i] = v; break; // Rolling percentile approx
          case 'neg': result[i] = -v; break;
        }
      }
      return result;
    }
    case 'binary': {
      const leftVals = evaluateAlphaTree(node.left, bars);
      const rightVals = evaluateAlphaTree(node.right, bars);
      for (let i = 0; i < n; i++) {
        const l = leftVals[i] ?? 0;
        const r = rightVals[i] ?? 0;
        switch (node.op) {
          case 'add': result[i] = l + r; break;
          case 'sub': result[i] = l - r; break;
          case 'mul': result[i] = l * r; break;
          case 'div': result[i] = Math.abs(r) > 1e-6 ? l / r : 0; break;
        }
      }
      return result;
    }
    case 'ts': {
      const childVals = evaluateAlphaTree(node.child, bars);
      const w = node.window;
      for (let i = 0; i < n; i++) {
        if (node.op === 'ts_delay') {
          result[i] = i >= w ? (childVals[i - w] ?? 0) : (childVals[0] ?? 0);
        } else if (node.op === 'ts_delta') {
          result[i] = i >= w ? ((childVals[i] ?? 0) - (childVals[i - w] ?? 0)) : 0;
        } else if (node.op === 'ts_mean') {
          const start = Math.max(0, i - w + 1);
          let sum = 0;
          for (let k = start; k <= i; k++) sum += childVals[k] ?? 0;
          result[i] = sum / (i - start + 1);
        } else if (node.op === 'ts_std') {
          const start = Math.max(0, i - w + 1);
          let sum = 0;
          for (let k = start; k <= i; k++) sum += childVals[k] ?? 0;
          const mean = sum / (i - start + 1);
          let variance = 0;
          for (let k = start; k <= i; k++) variance += Math.pow((childVals[k] ?? 0) - mean, 2);
          result[i] = Math.sqrt(variance / Math.max(1, i - start));
        } else if (node.op === 'ts_decay') {
          // Exponential decay
          const alpha = 2 / (w + 1);
          let val = childVals[0] ?? 0;
          for (let k = 1; k <= i; k++) {
            val = alpha * (childVals[k] ?? 0) + (1 - alpha) * val;
          }
          result[i] = val;
        }
      }
      return result;
    }
  }
}

/**
 * Calculates fitness (IC, Sharpe, and Parsimony Penalized Score)
 */
export function scoreAlphaIndividual(
  node: AlphaNode,
  bars: MarketDataBar[],
  config: EvolutionConfig
): AlphaIndividual {
  const signal = evaluateAlphaTree(node, bars);
  const n = bars.length;
  const k = config.forwardWindow;

  // Forward returns: returns from bar i+1 to i+k
  const forwardReturns = new Array<number>(n - k);
  const trimmedSignal = new Array<number>(n - k);

  for (let i = 0; i < n - k; i++) {
    forwardReturns[i] = (bars[i + k]!.close - bars[i]!.close) / bars[i]!.close;
    trimmedSignal[i] = signal[i] ?? 0;
  }

  // Calculate Pearson correlation (IC)
  let ic = 0;
  if (forwardReturns.length > 5) {
    const meanSig = trimmedSignal.reduce((a, b) => a + b, 0) / trimmedSignal.length;
    const meanRet = forwardReturns.reduce((a, b) => a + b, 0) / forwardReturns.length;

    let cov = 0;
    let varSig = 0;
    let varRet = 0;

    for (let i = 0; i < forwardReturns.length; i++) {
      const dSig = (trimmedSignal[i] ?? 0) - meanSig;
      const dRet = (forwardReturns[i] ?? 0) - meanRet;
      cov += dSig * dRet;
      varSig += dSig * dSig;
      varRet += dRet * dRet;
    }

    if (varSig > 1e-8 && varRet > 1e-8) {
      ic = cov / Math.sqrt(varSig * varRet);
      if (isNaN(ic) || !isFinite(ic)) ic = 0;
    }
  }

  // Simulated Long-Short PnL
  const pnlSeries: number[] = [];
  for (let i = 0; i < forwardReturns.length; i++) {
    const position = Math.sign(trimmedSignal[i] ?? 0);
    pnlSeries.push(position * (forwardReturns[i] ?? 0));
  }

  let sharpe = 0;
  if (pnlSeries.length > 5) {
    const meanPnl = pnlSeries.reduce((a, b) => a + b, 0) / pnlSeries.length;
    const variancePnl = pnlSeries.reduce((a, b) => a + Math.pow(b - meanPnl, 2), 0) / (pnlSeries.length - 1);
    const stdPnl = Math.sqrt(variancePnl);
    if (stdPnl > 1e-6) {
      // Annualized Sharpe (assuming daily bars, 252 days)
      sharpe = (meanPnl / stdPnl) * Math.sqrt(252);
      if (isNaN(sharpe) || !isFinite(sharpe)) sharpe = 0;
    }
  }

  const { count, depth } = getNodeStats(node);
  const parsimonyPenalty = config.parsimonyCoeff * (count + depth);
  const fitness = (Math.abs(ic) * 10) + (Math.max(-2, sharpe) * 0.5) - parsimonyPenalty;

  return {
    id: `ALPHA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    tree: node,
    depth,
    nodeCount: count,
    formulaStr: alphaToString(node),
    ic,
    sharpe,
    fitness: isNaN(fitness) ? -999 : fitness,
  };
}

/**
 * Deep clones an AST
 */
export function cloneTree(node: AlphaNode): AlphaNode {
  switch (node.type) {
    case 'feature': return { type: 'feature', name: node.name };
    case 'constant': return { type: 'constant', value: node.value };
    case 'unary': return { type: 'unary', op: node.op, child: cloneTree(node.child) };
    case 'binary': return { type: 'binary', op: node.op, left: cloneTree(node.left), right: cloneTree(node.right) };
    case 'ts': return { type: 'ts', op: node.op, window: node.window, child: cloneTree(node.child) };
  }
}

/**
 * Performs subtree crossover between two parents
 */
export function crossover(parent1: AlphaNode, parent2: AlphaNode): [AlphaNode, AlphaNode] {
  const child1 = cloneTree(parent1);
  const child2 = cloneTree(parent2);

  // If binary node available, swap branch
  if (child1.type === 'binary' && child2.type === 'binary') {
    if (Math.random() < 0.5) {
      const temp = child1.left;
      child1.left = child2.left;
      child2.left = temp;
    } else {
      const temp = child1.right;
      child1.right = child2.right;
      child2.right = temp;
    }
  } else if (child1.type === 'unary' && child2.type === 'unary') {
    const temp = child1.child;
    child1.child = child2.child;
    child2.child = temp;
  }

  return [child1, child2];
}

/**
 * Performs mutation on a tree
 */
export function mutate(node: AlphaNode, maxDepth = 4): AlphaNode {
  const mutated = cloneTree(node);
  const r = Math.random();

  if (r < 0.3) {
    // Replace with completely new random subtree
    return generateRandomTree(maxDepth, 1, 'grow');
  } else if (mutated.type === 'binary') {
    if (Math.random() < 0.5) {
      mutated.op = BINARY_OPS[Math.floor(Math.random() * BINARY_OPS.length)]!;
    } else {
      mutated.left = mutate(mutated.left, maxDepth);
    }
  } else if (mutated.type === 'ts') {
    mutated.window = TS_WINDOWS[Math.floor(Math.random() * TS_WINDOWS.length)]!;
  } else if (mutated.type === 'feature') {
    mutated.name = TERMINAL_FEATURES[Math.floor(Math.random() * TERMINAL_FEATURES.length)]!;
  }

  return mutated;
}

/**
 * Generates sample market data bars for evolutionary training
 */
export function generateSyntheticMarketBars(count = 200, seed = 42): MarketDataBar[] {
  const bars: MarketDataBar[] = [];
  let currentPrice = 2450.0;

  for (let i = 0; i < count; i++) {
    // Mean-reverting geometric random walk with intraday volume spikes
    const drift = Math.sin(i / 15) * 0.003;
    const shock = ((Math.sin(i * seed) * 10000) % 1) * 0.015 - 0.0075;
    const ret = drift + shock;
    const prevClose = currentPrice;
    currentPrice = Math.max(10, currentPrice * (1 + ret));

    const high = currentPrice * (1 + Math.abs(shock) * 0.8);
    const low = currentPrice * (1 - Math.abs(shock) * 0.8);
    const open = (prevClose + currentPrice) / 2;
    const volume = Math.floor(10000 + Math.abs(shock) * 2000000);
    const vwap = (open + high + low + currentPrice) / 4;

    bars.push({
      open,
      high,
      low,
      close: currentPrice,
      volume,
      vwap,
      returns: (currentPrice - prevClose) / prevClose,
    });
  }

  return bars;
}

/**
 * Runs genetic evolution across multiple generations
 */
export function evolveAlphaGeneration(
  population: AlphaIndividual[],
  bars: MarketDataBar[],
  config: EvolutionConfig
): AlphaIndividual[] {
  // Sort descending by fitness
  const sorted = [...population].sort((a, b) => b.fitness - a.fitness);

  const nextGen: AlphaIndividual[] = [];
  // Elitism: retain top 2 unchanged
  if (sorted[0]) nextGen.push(sorted[0]);
  if (sorted[1]) nextGen.push(sorted[1]);

  const tournament = (): AlphaIndividual => {
    let best = sorted[Math.floor(Math.random() * sorted.length)] || sorted[0]!;
    for (let i = 1; i < config.tournamentSize; i++) {
      const cand = sorted[Math.floor(Math.random() * sorted.length)];
      if (cand && cand.fitness > best.fitness) best = cand;
    }
    return best;
  };

  while (nextGen.length < config.populationSize) {
    const parent1 = tournament();
    const parent2 = tournament();

    let childNode1: AlphaNode;
    let childNode2: AlphaNode;

    if (Math.random() < config.crossoverRate) {
      [childNode1, childNode2] = crossover(parent1.tree, parent2.tree);
    } else {
      childNode1 = cloneTree(parent1.tree);
      childNode2 = cloneTree(parent2.tree);
    }

    if (Math.random() < config.mutationRate) {
      childNode1 = mutate(childNode1, config.maxDepth);
    }
    if (Math.random() < config.mutationRate) {
      childNode2 = mutate(childNode2, config.maxDepth);
    }

    nextGen.push(scoreAlphaIndividual(childNode1, bars, config));
    if (nextGen.length < config.populationSize) {
      nextGen.push(scoreAlphaIndividual(childNode2, bars, config));
    }
  }

  return nextGen.sort((a, b) => b.fitness - a.fitness);
}
