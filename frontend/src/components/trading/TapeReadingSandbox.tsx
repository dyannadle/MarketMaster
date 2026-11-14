import { useState, useMemo, useEffect } from 'react';
import {
  generateSyntheticTapeStream,
  computeTapeVelocityMetrics,
  TAPE_DRILL_SCENARIOS,
  TapePrint,
  TapeDrillScenario,
} from '../../lib/tape-reading';

interface TapeReadingSandboxProps {
  symbol?: string;
  currentPrice?: number;
}

export function TapeReadingSandbox({
  symbol = 'RELIANCE',
  currentPrice = 2450.0,
}: TapeReadingSandboxProps) {
  const [prints, setPrints] = useState<TapePrint[]>(() => generateSyntheticTapeStream(currentPrice, 75));
  const [isLiveReplaying, setIsLiveReplaying] = useState<boolean>(true);
  const [selectedDrill, setSelectedDrill] = useState<TapeDrillScenario | null>(null);
  const [drillAnswerSubmitted, setDrillAnswerSubmitted] = useState<string | null>(null);
  const [drillScore, setDrillScore] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });

  // Stream live ticks when not in drill mode
  useEffect(() => {
    if (!isLiveReplaying || selectedDrill !== null) return;
    const interval = setInterval(() => {
      setPrints(prev => {
        const last = prev[prev.length - 1];
        const lastPrice = last ? last.price : currentPrice;
        const newPrints = generateSyntheticTapeStream(lastPrice, 1, Date.now());
        const combined = [...prev, ...newPrints];
        return combined.slice(-100); // Retain latest 100 prints
      });
    }, 400);

    return () => clearInterval(interval);
  }, [isLiveReplaying, selectedDrill, currentPrice]);

  const activePrints = selectedDrill ? selectedDrill.prints : prints;
  const metrics = useMemo(() => computeTapeVelocityMetrics(activePrints), [activePrints]);

  const handleSelectDrill = (drill: TapeDrillScenario) => {
    setSelectedDrill(drill);
    setDrillAnswerSubmitted(null);
    setIsLiveReplaying(false);
  };

  const handleExitDrill = () => {
    setSelectedDrill(null);
    setDrillAnswerSubmitted(null);
    setIsLiveReplaying(true);
  };

  const handleAnswerDrill = (action: 'BUY_BREAKOUT' | 'BUY_REVERSAL' | 'SELL_BREAKDOWN') => {
    if (!selectedDrill) return;
    setDrillAnswerSubmitted(action);
    const isCorrect = action === selectedDrill.correctAction;
    setDrillScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col gap-6 font-mono text-slate-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isLiveReplaying ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Time & Sales (Tape) Velocity & Microstructure Sandbox
            </h2>
            <span className="text-xs bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded">
              L3 Tick Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Real-time tape velocity measuring trades per second, aggressive maker/taker order flow profiling, and resting institutional iceberg detection.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {selectedDrill ? (
            <button
              onClick={handleExitDrill}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
            >
              Exit Drill Mode
            </button>
          ) : (
            <button
              onClick={() => setIsLiveReplaying(!isLiveReplaying)}
              className={`px-3 py-1.5 text-xs font-semibold rounded border transition ${
                isLiveReplaying
                  ? 'bg-amber-950 border-amber-700 text-amber-300 hover:bg-amber-900'
                  : 'bg-emerald-950 border-emerald-700 text-emerald-300 hover:bg-emerald-900'
              }`}
            >
              {isLiveReplaying ? 'Pause Tape' : 'Resume Tape Replay'}
            </button>
          )}
          <button
            onClick={() => setPrints(generateSyntheticTapeStream(currentPrice, 75))}
            className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
          >
            Regenerate Tape
          </button>
        </div>
      </div>

      {/* KPI Velocity Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Tape Velocity (TPS)</div>
          <div className="text-2xl font-bold text-white mt-1 flex items-baseline gap-2">
            <span>{metrics.currentTps}</span>
            <span className="text-xs text-slate-400 font-normal">trades/sec</span>
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Baseline: {metrics.baselineTps} TPS (Ratio: <span className={metrics.isBursting ? 'text-amber-400 font-bold' : 'text-slate-300'}>{metrics.velocityRatio}x</span>)
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Aggressive Flow Imbalance</div>
          <div className="text-2xl font-bold mt-1">
            <span className={metrics.buyRatio >= 0.6 ? 'text-emerald-400' : metrics.buyRatio <= 0.4 ? 'text-rose-400' : 'text-slate-200'}>
              {(metrics.buyRatio * 100).toFixed(0)}% Buy
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Aggressive Buyers vs Sellers
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Institutional Blocks</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {metrics.blockTradeCount}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Prints &gt; 1,000 Qty / ₹10L+
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 uppercase font-sans">Resting Icebergs</div>
          <div className={`text-2xl font-bold mt-1 ${metrics.detectedIcebergs.length > 0 ? 'text-cyan-400' : 'text-slate-400'}`}>
            {metrics.detectedIcebergs.length}
          </div>
          <div className="text-[10px] text-slate-500 font-sans">
            Absorbed Limit Liquidity Walls
          </div>
        </div>
      </div>

      {/* Main Section: Tape Window vs Profiler & Drills */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Real-Time Time & Sales Tape */}
        <div className="lg:col-span-6 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 font-sans">
            <span className="flex items-center gap-2">
              <span>Time & Sales Prints ({symbol})</span>
              {metrics.isBursting && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 border border-amber-700 text-amber-300 animate-pulse">
                  ⚡ BURST VELOCITY
                </span>
              )}
            </span>
            <span className="text-[10px] text-slate-500">Green=Lift Ask | Red=Hit Bid</span>
          </div>

          <div className="h-96 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-2 flex flex-col gap-1 text-xs">
            <div className="grid grid-cols-12 text-[10px] text-slate-500 uppercase pb-1 border-b border-slate-800 px-2 font-sans font-semibold">
              <span className="col-span-3">Time</span>
              <span className="col-span-3 text-right">Price</span>
              <span className="col-span-3 text-right">Size</span>
              <span className="col-span-3 text-right">Type</span>
            </div>
            {activePrints.slice().reverse().map((p) => (
              <div
                key={p.id}
                className={`grid grid-cols-12 px-2 py-1 rounded transition items-center font-mono text-xs ${
                  p.isBlockTrade ? 'bg-amber-950/30 border border-amber-800/40' : 'hover:bg-slate-900'
                }`}
              >
                <span className="col-span-3 text-slate-400 text-[11px]">{p.timeStr}</span>
                <span className={`col-span-3 text-right font-bold ${p.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ₹{p.price.toFixed(2)}
                </span>
                <span className="col-span-3 text-right text-slate-200">
                  {p.quantity.toLocaleString('en-IN')}
                </span>
                <span className="col-span-3 text-right flex justify-end items-center gap-1">
                  {p.isBlockTrade && (
                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-900/60 text-amber-300 border border-amber-700">
                      BLOCK
                    </span>
                  )}
                  <span className={`text-[10px] font-bold ${p.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {p.side}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Liquidity Profiler & Gamified Drills */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          {/* Aggression Volume Ratio Bar */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <span className="text-xs font-semibold text-slate-300 font-sans">Aggressive Flow Distribution</span>
            <div className="w-full bg-rose-950/80 h-3 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${metrics.buyRatio * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] font-sans">
              <span className="text-emerald-400 font-bold">
                Buyers: {metrics.buyVolume.toLocaleString('en-IN')} ({(metrics.buyRatio * 100).toFixed(1)}%)
              </span>
              <span className="text-rose-400 font-bold">
                Sellers: {metrics.sellVolume.toLocaleString('en-IN')} ({((1 - metrics.buyRatio) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>

          {/* Iceberg Liquidity Alerts */}
          {metrics.detectedIcebergs.length > 0 && (
            <div className="bg-cyan-950/40 border border-cyan-800/60 rounded-xl p-3 flex flex-col gap-2">
              <span className="text-xs font-bold text-cyan-300 font-sans flex items-center gap-1.5">
                <span>🛡️ Resting Iceberg Liquidity Walls Detected</span>
              </span>
              {metrics.detectedIcebergs.slice(0, 2).map((ice, idx) => (
                <div key={idx} className="bg-slate-900/80 p-2 rounded border border-cyan-900/50 text-xs">
                  <span className="text-cyan-400 font-bold">{ice.side === 'BUY_ICEBERG' ? 'BUY ICEBERG' : 'SELL ICEBERG'}</span> at ₹{ice.price.toFixed(2)}:
                  Absorbed <span className="text-white font-bold">{ice.absorbedVolume.toLocaleString('en-IN')} units</span> across {ice.hitCount} aggressive fills.
                </div>
              ))}
            </div>
          )}

          {/* Gamified Tape Reading Drills */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase font-sans">
                Interactive Tape Reading Drills
              </span>
              <span className="text-xs text-amber-400">
                Score: {drillScore.correct}/{drillScore.total}
              </span>
            </div>

            {selectedDrill ? (
              <div className="flex flex-col gap-3">
                <div className="text-xs font-bold text-indigo-300 font-sans">{selectedDrill.title}</div>
                <div className="text-xs text-slate-300 font-sans">{selectedDrill.description}</div>

                {/* Prediction Action Buttons */}
                {!drillAnswerSubmitted ? (
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <button
                      onClick={() => handleAnswerDrill('BUY_BREAKOUT')}
                      className="px-2 py-2 bg-emerald-900/70 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 rounded text-xs font-bold transition text-center"
                    >
                      Buy Breakout
                    </button>
                    <button
                      onClick={() => handleAnswerDrill('BUY_REVERSAL')}
                      className="px-2 py-2 bg-indigo-900/70 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 rounded text-xs font-bold transition text-center"
                    >
                      Buy Reversal
                    </button>
                    <button
                      onClick={() => handleAnswerDrill('SELL_BREAKDOWN')}
                      className="px-2 py-2 bg-rose-900/70 hover:bg-rose-800 text-rose-200 border border-rose-700 rounded text-xs font-bold transition text-center"
                    >
                      Sell Breakdown
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        drillAnswerSubmitted === selectedDrill.correctAction
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}>
                        {drillAnswerSubmitted === selectedDrill.correctAction ? 'CORRECT CALL ✓' : 'INCORRECT CALL ✗'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      {selectedDrill.explanation}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-slate-400 font-sans">
                  Select a gamified scenario to test your ability to read aggressive order flow and institutional sweeps:
                </p>
                <div className="flex flex-col gap-1.5">
                  {TAPE_DRILL_SCENARIOS.map((drill) => (
                    <button
                      key={drill.id}
                      onClick={() => handleSelectDrill(drill)}
                      className="text-left p-2.5 bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-xs transition"
                    >
                      <div className="font-bold text-white font-sans">{drill.title}</div>
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5 truncate">{drill.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
