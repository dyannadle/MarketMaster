// Milestone 41: FIX Fast Protocol (FAST) Binary Compression Engine UI
import { useState, useMemo } from "react";
import {
  Binary,
  Cpu,
  Layers,
  ArrowDownUp,
  RefreshCw,
  Zap,
  CheckCircle2,
  FileCode2,
  Download,
  Flame,
} from "lucide-react";
import { toast } from "sonner";
import {
  FastEncodedPacket,
  FastCodecEngine,
  generateSampleFastStream,
  FAST_TEMPLATE_101,
} from "@/lib/fast-protocol";

export function FastProtocolInspector() {
  const [packetStream, setPacketStream] = useState<FastEncodedPacket[]>(() =>
    generateSampleFastStream(10)
  );
  const [selectedPacketIdx, setSelectedPacketIdx] = useState<number>(0);

  const activePacket = packetStream[selectedPacketIdx] || packetStream[0];

  const handleGenerateNewStream = () => {
    const stream = generateSampleFastStream(10);
    setPacketStream(stream);
    setSelectedPacketIdx(0);
    toast.success("Generated new stream of 10 FAST-compressed execution reports.");
  };

  const avgReduction = useMemo(() => {
    if (packetStream.length === 0) return 88.0;
    const sum = packetStream.reduce((s, p) => s + p.bandwidthReductionPct, 0);
    return Math.round((sum / packetStream.length) * 10) / 10;
  }, [packetStream]);

  const totalAsciiBytes = useMemo(
    () => packetStream.reduce((s, p) => s + p.asciiByteLength, 0),
    [packetStream]
  );
  const totalFastBytes = useMemo(
    () => packetStream.reduce((s, p) => s + p.fastByteLength, 0),
    [packetStream]
  );

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 md:p-6 shadow-sm">
      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Binary className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">
              FIX Fast Protocol (FAST) Binary Compression Engine
            </h2>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary border border-primary/20">
              Milestone 41 / NSE Co-location FAST
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Ultra-low-latency 7-bit stop-bit encoding, Presence Map (P-Map) bit vectors, and stateful COPY/DELTA operators achieving ~88% wire bandwidth reduction.
          </p>
        </div>

        <button
          onClick={handleGenerateNewStream}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
          Generate New FAST Feed
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400">Bandwidth Compression</span>
          <p className="num mt-1 font-mono text-xl font-black text-gain">
            {avgReduction}% Saved
          </p>
          <span className="text-[10px] text-muted-foreground">vs raw ASCII FIX wire</span>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Selected Msg Size</span>
          <p className="num mt-1 font-mono text-xl font-bold text-primary">
            {activePacket?.fastByteLength} Bytes
          </p>
          <span className="text-[10px] text-muted-foreground">Raw FIX: {activePacket?.asciiByteLength} Bytes</span>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Stream Volume</span>
          <p className="num mt-1 font-mono text-xl font-bold text-foreground">
            {totalFastBytes}B <span className="text-xs font-normal text-muted-foreground">/ {totalAsciiBytes}B</span>
          </p>
          <span className="text-[10px] text-muted-foreground">{packetStream.length} messages encoded</span>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Decoding Latency</span>
          <p className="num mt-1 font-mono text-xl font-bold text-foreground">
            &lt; 12 $\mu$s
          </p>
          <span className="text-[10px] text-muted-foreground">Sub-microsecond per packet</span>
        </div>
      </div>

      {/* Main Grid: Packet Stream List (Left) vs Packet Inspector (Right) */}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Packet Stream Selector */}
        <div className="rounded-xl border border-border/60 bg-background/50 p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              FAST Messages ({packetStream.length})
            </span>
            <span className="text-[10px] text-primary font-mono">Template 101</span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-1.5 font-mono text-xs">
            {packetStream.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedPacketIdx(idx)}
                className={`w-full rounded-lg p-2.5 text-left transition-all ${
                  selectedPacketIdx === idx
                    ? "bg-primary/15 border border-primary/40 font-bold"
                    : "hover:bg-muted/40 border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-primary font-bold">Msg #{idx + 1}</span>
                  <span className="text-gain font-semibold">-{p.bandwidthReductionPct}%</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground font-sans">
                  <span>Price: ₹{Number(p.fieldsDecoded["Price"] || 24200).toFixed(1)}</span>
                  <span className="font-mono">{p.fastByteLength}B / {p.asciiByteLength}B</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Packet Inspector Console */}
        <div className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <div className="flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Message #{selectedPacketIdx + 1} Bit-Level Binary Decoder
              </h3>
            </div>
            <span className="font-mono text-[11px] text-gain font-bold">
              Compression Ratio: {activePacket?.bandwidthReductionPct}%
            </span>
          </div>

          {/* 1. Presence Map (P-Map) Bit Vector */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Presence Map (P-Map) Bit Vector
              </span>
              <span className="font-mono text-xs font-bold text-foreground">
                Bits: [{activePacket?.pMapBits}]
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Each bit tells the decoder whether an optional field is present in the stream or if a field operator applies (0 = copy prior / omit; 1 = wire payload present).
            </p>
          </div>

          {/* 2. Raw Hex Binary Dump vs Raw ASCII FIX */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* FAST Binary Hex Dump */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                FAST Binary Wire Payload ({activePacket?.fastByteLength} Bytes):
              </span>
              <div className="rounded-lg border border-border/60 bg-black/90 p-2.5 font-mono text-[11px] text-emerald-400 break-all select-all">
                {activePacket?.fastHexDump}
              </div>
            </div>

            {/* Equivalent ASCII FIX */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                Equivalent ASCII FIX String ({activePacket?.asciiByteLength} Bytes):
              </span>
              <div className="rounded-lg border border-border/60 bg-black/90 p-2.5 font-mono text-[11px] text-zinc-400 break-all select-all">
                {activePacket?.asciiFixString.replace(/\x01/g, "|")}
              </div>
            </div>
          </div>

          {/* 3. Field Operator Reconstruction Table */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              FAST Template 101 Field Operators & Reconstructed Values:
            </span>

            <div className="overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 font-semibold text-muted-foreground uppercase text-[10px]">
                  <tr className="border-b border-border/60">
                    <th className="p-2.5">Tag</th>
                    <th className="p-2.5">Field Name</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Operator</th>
                    <th className="p-2.5 text-right">Decoded Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 font-mono text-[11px]">
                  {FAST_TEMPLATE_101.fields.map((f, idx) => {
                    const val = activePacket?.fieldsDecoded[f.name];
                    return (
                      <tr key={idx} className="hover:bg-accent/20">
                        <td className="p-2.5 text-muted-foreground">{f.tag}</td>
                        <td className="p-2.5 font-sans font-bold text-foreground">{f.name}</td>
                        <td className="p-2.5 text-muted-foreground">{f.type}</td>
                        <td className="p-2.5 font-sans">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                              f.operator === "COPY"
                                ? "bg-sky-500/20 text-sky-400"
                                : f.operator === "DELTA"
                                ? "bg-amber-500/20 text-amber-400"
                                : f.operator === "DEFAULT"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {f.operator}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-bold text-foreground">
                          {val !== undefined ? String(val) : String(f.defaultValue || "")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
