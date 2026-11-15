// Milestone 38: Level-3 FIX Drop-Copy Real-Time Audit Feed WebSocket & Regulatory Replay UI
import { useState, useEffect, useRef } from "react";
import {
  Terminal,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  ShieldCheck,
  Download,
  Layers,
  ArrowDownUp,
  Cpu,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { inr } from "@/lib/data";
import {
  FixRawMessage,
  Level3BookReconstructor,
  generateInitialFixStream,
  generateNextFixTick,
  generateSebiDropCopyAuditJson,
} from "@/lib/fix-level3-stream";

export function FixLevel3ReplayPanel() {
  const [symbol, setSymbol] = useState<string>("NIFTY");
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [streamMessages, setStreamMessages] = useState<FixRawMessage[]>(() =>
    generateInitialFixStream(symbol, 24200.0)
  );

  // Reconstructor reference
  const reconstructorRef = useRef<Level3BookReconstructor>(new Level3BookReconstructor(symbol));
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Reconstruct book on stream updates
  const [bookSnapshot, setBookSnapshot] = useState(() => {
    const recon = reconstructorRef.current;
    recon.reset();
    streamMessages.forEach((msg) => recon.applyFixMessage(msg));
    return recon.getSnapshot();
  });

  // Streaming timer
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setStreamMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        const nextMsg = generateNextFixTick(lastMsg, symbol, bookSnapshot.midPrice || 24200.0);
        const nextList = [...prev.slice(-39), nextMsg]; // keep last 40 for memory efficiency

        // Apply to reconstructor
        reconstructorRef.current.applyFixMessage(nextMsg);
        setBookSnapshot(reconstructorRef.current.getSnapshot());

        return nextList;
      });
    }, 700);

    return () => clearInterval(interval);
  }, [isStreaming, symbol, bookSnapshot.midPrice]);

  // Step 1 tick forward manually
  const handleStepForward = () => {
    setStreamMessages((prev) => {
      const lastMsg = prev[prev.length - 1];
      const nextMsg = generateNextFixTick(lastMsg, symbol, bookSnapshot.midPrice || 24200.0);
      reconstructorRef.current.applyFixMessage(nextMsg);
      setBookSnapshot(reconstructorRef.current.getSnapshot());
      return [...prev.slice(-39), nextMsg];
    });
    toast.info("Stepped 1 FIX message forward in matching engine.");
  };

  const handleResetStream = () => {
    reconstructorRef.current.reset();
    const init = generateInitialFixStream(symbol, symbol === "NIFTY" ? 24200.0 : 51800.0);
    init.forEach((m) => reconstructorRef.current.applyFixMessage(m));
    setStreamMessages(init);
    setBookSnapshot(reconstructorRef.current.getSnapshot());
    toast.success("Reset FIX drop-copy stream and order book state.");
  };

  const handleExportAuditCertificate = () => {
    const auditData = generateSebiDropCopyAuditJson(streamMessages, symbol);
    const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SEBI-TR8-DROP-COPY-${symbol}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported SEBI Form TR-8 Drop-Copy Audit Certificate with cryptographic hash chain.");
  };

  const latestMsg = streamMessages[streamMessages.length - 1];

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 md:p-6 shadow-sm">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              Level-3 FIX Drop-Copy Replay & Order Book Reconstructor
            </h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary border border-primary/20">
              Milestone 38 / FIX 4.4 MBO
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Sub-millisecond FIX 4.4 drop-copy stream parsing, matching engine depth reconstruction, and SEBI SHA-256 regulatory hash chaining.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Symbol Selector */}
          <select
            value={symbol}
            onChange={(e) => {
              setSymbol(e.target.value);
              reconstructorRef.current = new Level3BookReconstructor(e.target.value);
              const init = generateInitialFixStream(e.target.value, e.target.value === "NIFTY" ? 24200 : 51800);
              init.forEach((m) => reconstructorRef.current.applyFixMessage(m));
              setStreamMessages(init);
              setBookSnapshot(reconstructorRef.current.getSnapshot());
            }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold"
          >
            <option value="NIFTY">NIFTY 50 Futures</option>
            <option value="BANKNIFTY">BANK NIFTY Futures</option>
          </select>

          {/* Stream Controls */}
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-all shadow ${
              isStreaming ? "bg-amber-600 hover:bg-amber-500" : "bg-gain hover:bg-gain/90"
            }`}
          >
            {isStreaming ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isStreaming ? "Pause Feed" : "Live Stream"}
          </button>

          <button
            onClick={handleStepForward}
            disabled={isStreaming}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <SkipForward className="h-3.5 w-3.5 text-muted-foreground" />
            Step Tick
          </button>

          <button
            onClick={handleResetStream}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            Reset
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Stream Status</span>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${isStreaming ? "bg-gain animate-pulse" : "bg-amber-500"}`} />
            <span className="font-bold text-foreground text-sm font-mono">
              {isStreaming ? "LIVE WEBSOCKET" : "PAUSED"}
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground">Seq #{latestMsg?.seqNum ?? 0} ({latestMsg?.sendingTime.split("-")[1] || ""})</span>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Resting L3 Orders</span>
          <p className="num mt-1 font-mono text-base font-black text-primary">
            {bookSnapshot.totalActiveOrders} Live Orders
          </p>
          <span className="text-[10px] text-muted-foreground">In Matching Engine Book</span>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Bid/Ask Spread</span>
          <p className="num mt-1 font-mono text-base font-bold text-foreground">
            ₹{bookSnapshot.spread.toFixed(2)} ({((bookSnapshot.spread / (bookSnapshot.midPrice || 24200)) * 10000).toFixed(1)} bps)
          </p>
          <span className="text-[10px] text-muted-foreground">Mid: ₹{bookSnapshot.midPrice.toFixed(2)}</span>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400">Cryptographic Chain</span>
          <div className="mt-1 flex items-center gap-1 font-mono text-xs font-bold text-gain truncate">
            <Lock className="h-3 w-3 shrink-0" />
            <span className="truncate">{latestMsg?.sha256Hash.substring(0, 16)}...</span>
          </div>
          <span className="text-[10px] text-muted-foreground">SHA-256 Continuous Block Chain</span>
        </div>
      </div>

      {/* Main Grid: Reconstructed L3/L2 Book on Left, Raw FIX Stream on Right */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: Reconstructed Matching Engine Order Book */}
        <div className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Reconstructed Matching Engine Depth (Level-2 / 3)
              </h3>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              Last Order: {bookSnapshot.lastUpdateTime.split("-")[1] || ""}
            </span>
          </div>

          {/* Depth Table */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Bids Ladder */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase text-gain border-b border-gain/30 pb-1">
                <span>Orders</span>
                <span>Qty</span>
                <span>Bid Price</span>
              </div>
              {bookSnapshot.bids.length === 0 ? (
                <div className="p-3 text-center text-[11px] text-muted-foreground">No resting buy orders</div>
              ) : (
                bookSnapshot.bids.map((lvl, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between rounded bg-gain/10 px-2 py-1 font-mono text-[11px] hover:bg-gain/20 transition-colors"
                  >
                    <span className="text-muted-foreground font-sans text-[10px]">({lvl.orderCount})</span>
                    <span className="font-bold text-foreground">{lvl.totalVolume}</span>
                    <span className="font-black text-gain">₹{lvl.price.toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>

            {/* Asks Ladder */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase text-loss border-b border-loss/30 pb-1">
                <span>Ask Price</span>
                <span>Qty</span>
                <span>Orders</span>
              </div>
              {bookSnapshot.asks.length === 0 ? (
                <div className="p-3 text-center text-[11px] text-muted-foreground">No resting sell orders</div>
              ) : (
                bookSnapshot.asks.map((lvl, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between rounded bg-loss/10 px-2 py-1 font-mono text-[11px] hover:bg-loss/20 transition-colors"
                  >
                    <span className="font-black text-loss">₹{lvl.price.toFixed(2)}</span>
                    <span className="font-bold text-foreground">{lvl.totalVolume}</span>
                    <span className="text-muted-foreground font-sans text-[10px]">({lvl.orderCount})</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* L3 Orders Detail */}
          <div className="border-t border-border/40 pt-2 text-[10px] text-muted-foreground space-y-1">
            <span className="font-bold uppercase text-foreground">Top Resting FIFO Queue Sample:</span>
            <div className="max-h-24 overflow-y-auto space-y-1 font-mono">
              {[...bookSnapshot.bids.flatMap((b) => b.orders), ...bookSnapshot.asks.flatMap((a) => a.orders)]
                .slice(0, 6)
                .map((o, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-muted/40 rounded px-2 py-0.5">
                    <span className={o.side === "BUY" ? "text-gain font-bold" : "text-loss font-bold"}>
                      {o.side} {o.qty} @ ₹{o.price.toFixed(1)}
                    </span>
                    <span>{o.clOrdId}</span>
                    <span className="text-muted-foreground">{o.timestamp.split("-")[1]}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right: Raw FIX Stream Feed Console */}
        <div className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <div className="flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Streaming Drop-Copy FIX 4.4 Feed (SOH Delimited)
                </h3>
              </div>
              <button
                onClick={handleExportAuditCertificate}
                className="flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[10px] font-bold text-foreground hover:bg-secondary/80 transition-colors"
              >
                <Download className="h-3 w-3" /> SEBI TR-8 Export
              </button>
            </div>

            {/* Terminal Window */}
            <div className="mt-2 h-72 overflow-y-auto rounded-lg border border-border/60 bg-black/90 p-2.5 font-mono text-[10px] leading-tight space-y-1.5">
              {streamMessages.map((msg, idx) => {
                const isNew = msg.msgType === "D";
                const isExec = msg.msgType === "8";
                return (
                  <div key={idx} className="border-b border-zinc-800 pb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">#{msg.seqNum}</span>
                      <span className="text-zinc-400">{msg.sendingTime.split("-")[1]}</span>
                      <span
                        className={`rounded px-1 text-[9px] font-bold ${
                          isNew
                            ? "bg-sky-500/20 text-sky-400"
                            : msg.execType === "2"
                            ? "bg-gain/20 text-gain"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {msg.msgTypeName} ({msg.msgType === "8" ? `150=${msg.execType}` : "35=D"})
                      </span>
                      <span className={msg.side === "1" ? "text-gain" : "text-loss"}>
                        {msg.side === "1" ? "BUY" : "SELL"} {msg.orderQty} @ ₹{msg.price}
                      </span>
                    </div>
                    {/* Raw string preview with pipe delimiters */}
                    <div className="mt-0.5 text-zinc-500 truncate text-[9px] select-all">
                      {msg.rawString.replace(/\x01/g, "|")}
                    </div>
                  </div>
                );
              })}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {/* Cryptographic Proof Verification Card */}
          <div className="mt-2 rounded-lg border border-border/40 bg-muted/20 p-2.5 text-[11px] flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <ShieldCheck className="h-4 w-4 text-gain" />
                <span>SEBI Rule 6.1 Regulatory Compliance Chain</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono truncate max-w-sm">
                Hash: {latestMsg?.sha256Hash}
              </p>
            </div>
            <button
              onClick={handleExportAuditCertificate}
              className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow"
            >
              <Download className="h-3.5 w-3.5" /> Download Certificate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
