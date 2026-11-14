// Milestone 20: FIX Protocol v4.4 Message Inspector & Institutional Drop Copy UI
// Visual protocol decoder and audit log viewer for NSE/BSE FIX gateway integration.

import { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Filter,
  CheckCircle2,
  Terminal,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FixMessageLog,
  getStoredFixLogs,
  logFixMessage,
  createNewOrderSingleFix,
  createExecutionReportFix,
  exportDropCopyFile,
} from "@/lib/fix-protocol";

export function FixProtocolInspector() {
  const [messages, setMessages] = useState<FixMessageLog[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"ALL" | "D" | "8">("ALL");

  const reload = () => {
    const list = getStoredFixLogs();
    setMessages(list);
    if (!selectedId && list.length > 0) {
      setSelectedId(list[0]?.id || null);
    }
  };

  useEffect(() => {
    reload();

    const handleUpdate = () => reload();
    window.addEventListener("mm-fix-log-update", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("mm-fix-log-update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const filtered = messages.filter((m) => {
    if (filterType === "ALL") return true;
    return m.msgType === filterType;
  });

  const selectedMsg = messages.find((m) => m.id === selectedId) || filtered[0] || null;

  const handleInjectTestFix = () => {
    const testOrder = createNewOrderSingleFix({
      symbol: "NIFTY_FUT",
      side: "BUY",
      qty: 50,
      orderType: "LIMIT",
      price: 24520.0,
    });
    logFixMessage(testOrder);

    // Simulate instant exchange fill
    setTimeout(() => {
      const execReport = createExecutionReportFix({
        symbol: "NIFTY_FUT",
        side: "BUY",
        qty: 50,
        fillPrice: 24520.0,
        clOrdId: testOrder.clOrdId,
      });
      logFixMessage(execReport);
    }, 600);
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm space-y-4">
      {/* Header & Drop Copy Exporter */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Terminal className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">FIX Protocol v4.4 Message Inspector</h3>
              <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[9px] font-mono font-bold text-primary">
                TAG-VALUE DECODER
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Institutional broker-dealer FIX stream & Drop Copy audit trail
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleInjectTestFix}
            className="gap-1.5 text-xs font-semibold"
          >
            <PlusCircle className="size-3.5" /> Inject Test Order FIX
          </Button>
          <Button
            size="sm"
            onClick={() => exportDropCopyFile(messages)}
            className="gap-1.5 text-xs font-bold"
          >
            <Download className="size-3.5" /> Export Drop Copy (.fix)
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2 border-b pb-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground font-semibold flex items-center gap-1">
            <Filter className="size-3" /> Filter:
          </span>
          <button
            onClick={() => setFilterType("ALL")}
            className={`rounded px-2.5 py-1 font-medium transition-colors ${
              filterType === "ALL" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            All Messages ({messages.length})
          </button>
          <button
            onClick={() => setFilterType("D")}
            className={`rounded px-2.5 py-1 font-medium transition-colors ${
              filterType === "D" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            New Orders (35=D)
          </button>
          <button
            onClick={() => setFilterType("8")}
            className={`rounded px-2.5 py-1 font-medium transition-colors ${
              filterType === "8" ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-muted-foreground"
            }`}
          >
            Exec Reports (35=8)
          </button>
        </div>

        <button onClick={reload} className="text-muted-foreground hover:text-foreground">
          <RefreshCw className="size-3.5" />
        </button>
      </div>

      {/* Main Grid: Stream on Left, Tag Breakdown on Right */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Messages List (2 cols) */}
        <div className="lg:col-span-2 space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
              No FIX messages found. Execute an order in the terminal to generate FIX packets.
            </div>
          ) : (
            filtered.map((msg) => (
              <div
                key={msg.id}
                onClick={() => setSelectedId(msg.id)}
                className={`cursor-pointer rounded-lg border p-2.5 text-xs transition-colors ${
                  selectedMsg?.id === msg.id
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/60 bg-background hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-bold ${
                      msg.msgType === "D"
                        ? "bg-blue-500/15 text-blue-400"
                        : "bg-emerald-500/15 text-emerald-400"
                    }`}
                  >
                    35={msg.msgType}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {msg.timestamp.slice(11, 19)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between font-semibold text-foreground">
                  <span>
                    {msg.side} {msg.qty} {msg.symbol}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {msg.price ? `₹${msg.price.toFixed(2)}` : "MKT"}
                  </span>
                </div>
                <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                  {msg.rawFix}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Selected Message Tag Breakdown (3 cols) */}
        <div className="lg:col-span-3 rounded-lg border bg-muted/20 p-3.5 space-y-3">
          {selectedMsg ? (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-primary" />
                    {selectedMsg.msgTypeName}
                  </h4>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ClOrdID: {selectedMsg.clOrdId}
                  </span>
                </div>

                {/* Raw FIX SOH String */}
                <div className="mt-2 rounded bg-black/60 p-2 font-mono text-[11px] text-emerald-400 break-all border border-border/40 select-all">
                  {selectedMsg.rawFix}
                </div>
              </div>

              {/* Tag Breakdown Table */}
              <div className="overflow-x-auto max-h-[220px]">
                <table className="w-full text-xs">
                  <thead className="border-b bg-surface text-left text-[10px] font-bold uppercase text-muted-foreground">
                    <tr>
                      <th className="p-1.5">Tag</th>
                      <th className="p-1.5">Field Name</th>
                      <th className="p-1.5">Value</th>
                      <th className="p-1.5">Institutional Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {selectedMsg.fields.map((field, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="p-1.5 font-mono font-bold text-primary">{field.tag}</td>
                        <td className="p-1.5 font-semibold text-foreground">{field.name}</td>
                        <td className="p-1.5 font-mono text-foreground">{field.value}</td>
                        <td className="p-1.5 text-muted-foreground text-[11px]">{field.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-10 text-center text-xs text-muted-foreground">
              Select a message to inspect FIX tags.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
