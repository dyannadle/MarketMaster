import { useState, useMemo, useEffect } from 'react';
import {
  generateRandomTree,
  scoreAlphaIndividual,
  evolveAlphaGeneration,
  generateSyntheticMarketBars,
  exportToPolarsPython,
  DEFAULT_EVOLUTION_CONFIG,
  AlphaIndividual,
  EvolutionConfig,
} from '../../lib/symbolic-alpha';

export function SymbolicAlphaDiscoverer() {
  const [config, setConfig] = useState<EvolutionConfig>(DEFAULT_EVOLUTION_CONFIG);
  const [generation, setGeneration] = useState<number>(0);
  const [population, setPopulation] = useState<AlphaIndividual[]>([]);
  const [history, setHistory] = useState<{ gen: number; bestFitness: number; bestIc: number; bestSharpe: number }[]>([]);
  const [isEvolving, setIsEvolving] = useState<boolean>(false);
  const [selectedIndividual, setSelectedIndividual] = useState<AlphaIndividual | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Pre-generate market dataset
  const marketBars = useMemo(() => generateSyntheticMarketBars(250, 99), []);

  // Initialize population
  const initializePopulation = () => {
    const pop: AlphaIndividual[] = [];
    for (let i = 0; i < config.populationSize; i++) {
      const tree = generateRandomTree(config.maxInitialDepth, 1, i % 2 === 0 ? 'grow' : 'full');
      pop.push(scoreAlphaIndividual(tree, marketBars, config));
    }
    pop.sort((a, b) => b.fitness - a.fitness);
    setPopulation(pop);
    setSelectedIndividual(pop[0] ?? null);
    setGeneration(0);
    if (pop[0]) {
      setHistory([{
        gen: 0,
        bestFitness: pop[0].fitness,
        bestIc: pop[0].ic,
        bestSharpe: pop[0].sharpe,
      }]);
    }
  };

  useEffect(() => {
    initializePopulation();
  }, [config.populationSize]);

  // Step 1 generation forward
  const stepGeneration = () => {
    if (population.length === 0) return;
    const nextGen = evolveAlphaGeneration(population, marketBars, config);
    const nextGenNum = generation + 1;
    setPopulation(nextGen);
    setSelectedIndividual(nextGen[0] ?? null);
    setGeneration(nextGenNum);
    if (nextGen[0]) {
      setHistory(prev => [
        ...prev,
        {
          gen: nextGenNum,
          bestFitness: nextGen[0]!.fitness,
          bestIc: nextGen[0]!.ic,
          bestSharpe: nextGen[0]!.sharpe,
        },
      ]);
    }
  };

  // Evolve continuous loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isEvolving && generation < config.generations) {
      timer = setTimeout(() => {
        stepGeneration();
      }, 100);
    } else if (generation >= config.generations) {
      setIsEvolving(false);
    }
    return () => clearTimeout(timer);
  }, [isEvolving, generation, config.generations, population]);

  const bestAlpha = population.length > 0 ? population[0] : null;
  const activeAlpha = selectedIndividual || bestAlpha;

  const pythonCode = activeAlpha ? exportToPolarsPython(activeAlpha.tree) : '';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col gap-6 font-mono text-slate-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></span>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Genetic Programming Symbolic Alpha Discoverer
            </h2>
            <span className="text-xs bg-cyan-950 text-cyan-300 border border-cyan-800 px-2 py-0.5 rounded">
              AST Symbolic Regression
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Automatically evolve mathematical quantitative alpha expressions using genetic AST crossover, mutation, and multi-objective fitness (IC + Sharpe - Parsimony Penalty).
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={initializePopulation}
            disabled={isEvolving}
            className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition disabled:opacity-50"
          >
            Reset Population
          </button>
          <button
            onClick={stepGeneration}
            disabled={isEvolving}
            className="px-3.5 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded shadow transition disabled:opacity-50"
          >
            Step +1 Gen
          </button>
          <button
            onClick={() => setIsEvolving(!isEvolving)}
            className={`px-4 py-1.5 text-xs font-semibold rounded shadow transition ${
              isEvolving ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            }`}
          >
            {isEvolving ? 'Pause Evolution' : `Evolve (${generation}/${config.generations})`}
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Generation</div>
          <div className="text-2xl font-bold text-white mt-1">
            {generation} <span className="text-xs text-slate-500 font-normal">/ {config.generations}</span>
          </div>
          <div className="text-[10px] text-slate-500">Pop: {config.populationSize} Candidates</div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Best Information Coeff (IC)</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {bestAlpha ? (bestAlpha.ic * 100).toFixed(2) + '%' : '0.00%'}
          </div>
          <div className="text-[10px] text-slate-500">Correlation with Forward Returns</div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Annualized Sharpe Ratio</div>
          <div className="text-2xl font-bold text-cyan-400 mt-1">
            {bestAlpha ? bestAlpha.sharpe.toFixed(2) : '0.00'}
          </div>
          <div className="text-[10px] text-slate-500">Long-Short Synthetic Strategy</div>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Formula Complexity</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {bestAlpha ? `${bestAlpha.nodeCount} nodes` : '0'}
          </div>
          <div className="text-[10px] text-slate-500">Depth {bestAlpha?.depth || 0} (Parsimony Controlled)</div>
        </div>
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Ranked Population Candidates */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-300 font-sans font-semibold">
            <span>Ranked Population Candidates (Gen {generation}):</span>
            <span className="text-[10px] text-slate-500">Click to inspect formula</span>
          </div>
          <div className="h-80 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-2 flex flex-col gap-1.5 text-xs">
            {population.map((ind, idx) => (
              <div
                key={ind.id}
                onClick={() => setSelectedIndividual(ind)}
                className={`p-2 rounded cursor-pointer transition flex flex-col gap-1 border ${
                  activeAlpha?.id === ind.id
                    ? 'bg-cyan-950/70 border-cyan-700/60 text-white'
                    : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold">{ind.id}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">IC: {(ind.ic * 100).toFixed(1)}%</span>
                    <span className="text-cyan-400">SR: {ind.sharpe.toFixed(2)}</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 truncate font-mono">
                  {ind.formulaStr}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Active Formula Details & Polars Code Export */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {activeAlpha && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white uppercase font-sans">
                  Selected Alpha: {activeAlpha.id}
                </span>
                <span className="text-[11px] text-amber-400">
                  Fitness Score: {activeAlpha.fitness.toFixed(3)} (Penalty: -{(config.parsimonyCoeff * (activeAlpha.nodeCount + activeAlpha.depth)).toFixed(3)})
                </span>
              </div>

              {/* Formula Badge */}
              <div className="bg-slate-900 border border-cyan-800/50 rounded-lg p-3">
                <div className="text-[10px] text-slate-400 uppercase font-sans mb-1">Mathematical AST Expression</div>
                <div className="text-sm font-bold text-cyan-300 font-mono break-all">
                  {activeAlpha.formulaStr}
                </div>
              </div>

              {/* Vectorized Python Polars Export */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300 font-sans">
                  <span className="font-semibold">Vectorized Python (Polars Engine) Code:</span>
                  <button
                    onClick={handleCopyCode}
                    className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition"
                  >
                    {copiedCode ? 'Copied ✓' : 'Copy Python Code'}
                  </button>
                </div>
                <pre className="h-44 overflow-y-auto bg-slate-900 border border-slate-800 rounded-lg p-3 text-[11px] text-emerald-300 font-mono">
                  {pythonCode}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fitness Convergence History */}
      {history.length > 1 && (
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-300 font-sans">Evolution Convergence History (Generations 0 to {generation})</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-28 overflow-y-auto">
            {history.map(h => (
              <div key={h.gen} className="bg-slate-900 border border-slate-800/80 rounded p-1.5 text-[10px]">
                <div className="text-slate-500">Gen #{h.gen}</div>
                <div className="text-emerald-400 font-bold">IC: {(h.bestIc * 100).toFixed(1)}%</div>
                <div className="text-cyan-400">SR: {h.bestSharpe.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
