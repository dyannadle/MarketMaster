import { useState, useMemo } from "react";
import {
  Terminal,
  Database,
  Download,
  Play,
  RotateCcw,
  Trash2,
  BookmarkPlus,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  executeBrowserSqlQuery,
  downloadParquetFile,
  getCachedBacktestSessions,
  saveBacktestSession,
  deleteCachedSession,
  SEEDED_BACKTEST_TRADES,
  CachedBacktestSession,
  SqlQueryResult,
} from "@/lib/offline-sql-cache";

interface SqlAnalyticsCachePanelProps {
  currentFast?: number;
  currentSlow?: number;
  currentSharpe?: number;
  currentCalmar?: number;
  currentPnl?: number;
  currentWinRate?: number;
  symbol?: string;
  onRestoreSession?: (session: CachedBacktestSession) => void;
}

export function SqlAnalyticsCachePanel({
  currentFast = 9,
  currentSlow = 21,
  currentSharpe = 1.84,
  currentCalmar = 2.45,
  currentPnl = 182400,
  currentWinRate = 64.3,
  symbol = "NIFTY_FUT",
  onRestoreSession,
}: SqlAnalyticsCachePanelProps) {
  // SQL Query State
  const [queryText, setQueryText] = useState<string>(
    "SELECT symbol, COUNT(*), SUM(pnl), AVG(pnl) FROM trades GROUP BY symbol ORDER BY SUM(pnl) DESC"
  );
  const [activePreset, setActivePreset] = useState<string>("SYMBOL_AGG");

  // Query Execution
  const queryResult: SqlQueryResult = useMemo(() => {
    return executeBrowserSqlQuery(queryText);
  }, [queryText]);

  // Session Cache State
  const [cachedSessions, setCachedSessions] = useState<CachedBacktestSession[]>(() =>
    getCachedBacktestSessions()
  );

  // Preset Handlers
  const handlePresetSelect = (preset: string, query: string) => {
    setActivePreset(preset);
    setQueryText(query);
  };

  // Cache Current Backtest Session
  const handleSaveCurrentSession = () => {
    const saved = saveBacktestSession({
      name: `Dual EMA (${currentFast}/${currentSlow})`,
      symbol,
      fastEma: currentFast,
      slowEma: currentSlow,
      sharpe: currentSharpe,
      calmar: currentCalmar,
      totalPnl: currentPnl,
      winRate: currentWinRate,
    });
    setCachedSessions(getCachedBacktestSessions());
    toast.success(`Session cached as ${saved.cacheId}! Available offline for instant replay.`);
  };

  // Delete Cached Session
  const handleDeleteSession = (cacheId: string) => {
    deleteCachedSession(cacheId);
    setCachedSessions(getCachedBacktestSessions());
    toast.info(`Cached session ${cacheId} removed.`);
  };

  // Download Parquet
  const handleDownloadParquet = () => {
    downloadParquetFile(SEEDED_BACKTEST_TRADES, `marketmaster_trades_${Date.now()}.parquet`);
    toast.success("Downloaded Apache Parquet dataset with standard PAR1 binary header!");
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-1.5">
              <Database className="h-4 w-4 text-primary" /> In-Browser SQL Analytics & Parquet Data Lake
            </h2>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
              Zero-Server Relational Engine
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Query tick-level trade logs with relational SQL, export Apache Parquet files for pandas/Jupyter, and replay cached backtests.
          </p>
        </div>

        {/* Parquet Download Button */}
        <button
          onClick={handleDownloadParquet}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition-all cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" /> Export Parquet (.parquet)
        </button>
      </div>

      {/* SQL Query Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[11px] font-bold text-muted-foreground">Presets:</span>
        <button
          onClick={() =>
            handlePresetSelect(
              "SYMBOL_AGG",
              "SELECT symbol, COUNT(*), SUM(pnl), AVG(pnl) FROM trades GROUP BY symbol ORDER BY SUM(pnl) DESC"
            )
          }
          className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
            activePreset === "SYMBOL_AGG"
              ? "bg-primary text-primary-foreground shadow"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          PnL Aggregation by Symbol
        </button>

        <button
          onClick={() =>
            handlePresetSelect(
              "TOP_10",
              "SELECT trade_id, timestamp, symbol, side, qty, pnl, return_pct FROM trades ORDER BY pnl DESC LIMIT 10"
            )
          }
          className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
            activePreset === "TOP_10"
              ? "bg-primary text-primary-foreground shadow"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Top 10 Winning Trades
        </button>

        <button
          onClick={() =>
            handlePresetSelect(
              "RULE_43",
              "SELECT trade_id, symbol, pnl, return_pct, rule_43_compliant FROM trades WHERE pnl < 0 ORDER BY pnl ASC"
            )
          }
          className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
            activePreset === "RULE_43"
              ? "bg-primary text-primary-foreground shadow"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Rule 4.3 Drawdown Audit
        </button>

        <button
          onClick={() =>
            handlePresetSelect(
              "STRATEGY_RUNS",
              "SELECT strategy_name, symbol, total_trades, win_rate, total_pnl, sharpe_ratio, calmar_ratio FROM strategy_runs ORDER BY calmar_ratio DESC"
            )
          }
          className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
            activePreset === "STRATEGY_RUNS"
              ? "bg-primary text-primary-foreground shadow"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          Strategy Benchmark Runs
        </button>
      </div>

      {/* SQL Editor Area */}
      <div className="rounded-xl border border-border/80 bg-zinc-950 p-3 font-mono text-xs text-zinc-100">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5 font-bold text-zinc-300">
            <Terminal className="h-3.5 w-3.5 text-primary" /> Relational SQL Console (In-Memory Engine)
          </span>
          <span className="text-emerald-400 font-bold">
            ⚡ Executed in {queryResult.executionTimeMs} ms | {queryResult.rowCount} rows
          </span>
        </div>

        <textarea
          rows={2}
          value={queryText}
          onChange={(e) => {
            setQueryText(e.target.value);
            setActivePreset("");
          }}
          className="mt-2 w-full bg-transparent font-mono text-xs text-primary focus:outline-none resize-none"
          spellCheck={false}
        />
      </div>

      {/* Query Result Grid */}
      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/60">
        {queryResult.error ? (
          <div className="p-4 text-xs text-rose-400 font-mono">{queryResult.error}</div>
        ) : (
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-border/60 bg-muted/40 text-[10px] font-bold uppercase text-muted-foreground">
              <tr>
                {queryResult.columns.map((col, idx) => (
                  <th key={idx} className="p-2.5">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {queryResult.rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-muted/20">
                  {row.map((cell, cellIdx) => {
                    const isPnlCol = queryResult.columns[cellIdx]?.toLowerCase().includes("pnl");
                    const isNum = typeof cell === "number";
                    const isPos = isNum && cell > 0;
                    const isNeg = isNum && cell < 0;

                    return (
                      <td
                        key={cellIdx}
                        className={`p-2.5 ${
                          isPnlCol && isPos
                            ? "text-gain font-bold"
                            : isPnlCol && isNeg
                            ? "text-loss font-bold"
                            : "text-foreground"
                        }`}
                      >
                        {isNum && isPnlCol
                          ? `₹${cell.toLocaleString("en-IN")}`
                          : String(cell)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Session Cache Replay & Snapshots */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" /> Session Cache Replay History
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Saved locally in browser storage. Restore past backtest runs with 1 click without recomputing.
            </p>
          </div>

          <button
            onClick={handleSaveCurrentSession}
            className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90 transition-all cursor-pointer"
          >
            <BookmarkPlus className="h-3.5 w-3.5" /> Snapshot Current Run
          </button>
        </div>

        {cachedSessions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No cached sessions found. Click &quot;Snapshot Current Run&quot; to save.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {cachedSessions.map((session) => (
              <div
                key={session.cacheId}
                className="rounded-lg border border-border/60 bg-card p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">{session.name}</span>
                  <span className="text-[10px] text-muted-foreground">{session.savedAt}</span>
                </div>

                <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                  <span>Sharpe: {session.sharpe}</span>
                  <span>Calmar: {session.calmar}</span>
                  <span className="text-gain font-bold">₹{session.totalPnl.toLocaleString("en-IN")}</span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <span className="text-[9px] text-muted-foreground font-mono">{session.cacheId}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onRestoreSession && onRestoreSession(session)}
                      className="rounded px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/10 transition-all cursor-pointer"
                    >
                      1-Click Replay
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.cacheId)}
                      className="text-muted-foreground hover:text-loss transition-all p-0.5 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
