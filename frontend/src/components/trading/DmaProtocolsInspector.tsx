import React, { useState, useMemo } from "react";
import {
  Network,
  Cpu,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Binary,
  Layers,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  DmaPacketLog,
  generateSyntheticDmaStream,
  computeLatencyTelemetry,
  LatencyTelemetryReport,
} from "@/lib/dma-protocols";

export const DmaProtocolsInspector: React.FC = () => {
  const [streamCount, setStreamCount] = useState(16);
  const [protocolFilter, setProtocolFilter] = useState<"ALL" | "ITCH_5.0" | "OUCH_4.2">("ALL");
  const [selectedPacketId, setSelectedPacketId] = useState<string>("ITCH-1");

  const packets: DmaPacketLog[] = useMemo(() => {
    return generateSyntheticDmaStream(streamCount);
  }, [streamCount]);

  const telemetry: LatencyTelemetryReport = useMemo(() => {
    return computeLatencyTelemetry(packets);
  }, [packets]);

  const filteredPackets = useMemo(() => {
    if (protocolFilter === "ALL") return packets;
    return packets.filter((p) => p.protocol === protocolFilter);
  }, [packets, protocolFilter]);

  const selectedPacket = useMemo(() => {
    return packets.find((p) => p.id === selectedPacketId) || packets[0]!;
  }, [packets, selectedPacketId]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-secondary/10 p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-black uppercase text-primary">
                Milestone 44
              </span>
              <h2 className="text-lg font-bold tracking-tight">
                ITCH 5.0 & OUCH 4.2 Direct Market Access (DMA) Protocol Inspector
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Direct binary exchange gateway emulator replicating high-speed ITCH multicast market feeds and OUCH point-to-point order entry with nanosecond timestamps.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Cpu className="size-3.5" /> Sub-Microsecond Wire Decoder
            </span>
          </div>
        </div>
      </div>

      {/* Latency & Wire Telemetry KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Median T2T Latency (p50)</div>
          <div className="mt-1 font-mono text-xl font-bold text-emerald-500">
            {(telemetry.p50Ns / 1000).toFixed(2)} µs
          </div>
          <div className="text-[10px] text-muted-foreground">{telemetry.p50Ns.toLocaleString()} ns tick-to-trade</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">99th Percentile (p99)</div>
          <div className="mt-1 font-mono text-xl font-bold text-primary">
            {(telemetry.p99Ns / 1000).toFixed(2)} µs
          </div>
          <div className="text-[10px] text-muted-foreground">{telemetry.p99Ns.toLocaleString()} ns worst-case</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Min Latency (FPGA Wire)</div>
          <div className="mt-1 font-mono text-xl font-bold text-foreground">
            {telemetry.minNs} ns
          </div>
          <div className="text-[10px] text-muted-foreground">Direct Kernel-Bypass NIC</div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Packets Dissected</div>
          <div className="mt-1 font-mono text-xl font-bold text-foreground">
            {packets.length} Packets
          </div>
          <div className="text-[10px] text-muted-foreground">
            ITCH: {packets.filter((p) => p.protocol === "ITCH_5.0").length} | OUCH: {packets.filter((p) => p.protocol === "OUCH_4.2").length}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-3 shadow-xs">
          <div className="text-[11px] font-semibold text-muted-foreground">Wire Overhead</div>
          <div className="mt-1 font-mono text-xl font-bold text-emerald-500">
            Zero-Copy
          </div>
          <div className="text-[10px] text-muted-foreground">Big-Endian Binary C-Structs</div>
        </div>
      </div>

      {/* Latency Distribution Histogram */}
      <div className="rounded-xl border bg-card p-5 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tick-to-Trade Latency Distribution Histogram (Nanoseconds)
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Empirical distribution of elapsed time from ITCH book event ingress to OUCH order egress.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setStreamCount((c) => Math.min(c + 8, 48))}
              className="gap-1.5 text-xs font-bold"
            >
              <Zap className="size-3.5 text-amber-500" /> +8 Packets
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setStreamCount(16)}
              className="gap-1 text-xs text-muted-foreground"
            >
              <RotateCcw className="size-3.5" /> Reset
            </Button>
          </div>
        </div>

        <div className="mt-4 h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={telemetry.bins} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="label" stroke="#888888" fontSize={11} />
              <YAxis stroke="#888888" fontSize={11} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(val: any) => [`${val}%`, "Share of Packets"]}
                contentStyle={{ backgroundColor: "#1e1e24", borderColor: "#444" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="percentage" name="Latency Density (%)" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Protocol Dissector & Packet Stream Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Packet Stream List (Left 5 Cols) */}
        <div className="rounded-xl border bg-card p-4 shadow-xs lg:col-span-5">
          <div className="flex items-center justify-between pb-3 border-b">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Live DMA Stream Feed
            </h3>
            <div className="flex rounded-md border p-0.5 text-[11px]">
              <button
                onClick={() => setProtocolFilter("ALL")}
                className={`px-2 py-0.5 font-bold rounded ${
                  protocolFilter === "ALL" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setProtocolFilter("ITCH_5.0")}
                className={`px-2 py-0.5 font-bold rounded ${
                  protocolFilter === "ITCH_5.0" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                ITCH
              </button>
              <button
                onClick={() => setProtocolFilter("OUCH_4.2")}
                className={`px-2 py-0.5 font-bold rounded ${
                  protocolFilter === "OUCH_4.2" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                OUCH
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredPackets.map((pkt) => {
              const isSelected = pkt.id === selectedPacket.id;
              const isItch = pkt.protocol === "ITCH_5.0";

              return (
                <div
                  key={pkt.id}
                  onClick={() => setSelectedPacketId(pkt.id)}
                  className={`cursor-pointer rounded-lg border p-2.5 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border/70 bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          isItch
                            ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                            : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                        }`}
                      >
                        {isItch ? (
                          <>
                            <ArrowDownLeft className="size-3" /> ITCH 5.0
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="size-3" /> OUCH 4.2
                          </>
                        )}
                      </span>
                      <span className="font-mono text-xs font-bold text-foreground">
                        {pkt.msgType}
                      </span>
                    </div>

                    <span className="font-mono text-[10px] text-muted-foreground">
                      {pkt.timestampFormatted}
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-foreground line-clamp-1">{pkt.description}</p>

                  <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                    <span>Size: {pkt.rawBytes.length} bytes</span>
                    {pkt.latencyNs !== undefined && (
                      <span className="text-emerald-500 font-bold">
                        Δt: {(pkt.latencyNs / 1000).toFixed(2)} µs
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Packet Dissector & Hex Dump (Right 7 Cols) */}
        <div className="rounded-xl border bg-card p-4 shadow-xs lg:col-span-7">
          <div className="flex items-center justify-between pb-3 border-b">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Protocol Dissector & Hex Inspector
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Selected: <span className="font-mono font-bold text-primary">{selectedPacket.id}</span> ({selectedPacket.protocol})
              </p>
            </div>
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
              {selectedPacket.rawBytes.length} Bytes Wire Payload
            </span>
          </div>

          {/* Protocol Field Dissector Tree */}
          <div className="mt-3 rounded-lg border bg-muted/20 p-3 font-mono text-xs space-y-2">
            <div className="text-[11px] font-bold text-primary uppercase">
              Decoded Structure ({selectedPacket.protocol} {selectedPacket.msgType}):
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
              <div>
                <span className="text-muted-foreground">Timestamp:</span>{" "}
                <span className="font-bold text-foreground">{selectedPacket.timestampFormatted}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Nanoseconds:</span>{" "}
                <span className="text-foreground">{selectedPacket.timestampNs.toString()}</span>
              </div>

              {selectedPacket.protocol === "ITCH_5.0" ? (
                <>
                  <div>
                    <span className="text-muted-foreground">Order Ref:</span>{" "}
                    <span className="text-foreground">
                      {(selectedPacket.parsed as any).orderRefNumber?.toString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Symbol:</span>{" "}
                    <span className="font-bold text-primary">
                      {(selectedPacket.parsed as any).symbol}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Side:</span>{" "}
                    <span
                      className={
                        (selectedPacket.parsed as any).buySell === "B"
                          ? "text-emerald-500 font-bold"
                          : "text-rose-500 font-bold"
                      }
                    >
                      {(selectedPacket.parsed as any).buySell === "B" ? "BUY (Bid)" : "SELL (Ask)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Shares:</span>{" "}
                    <span className="text-foreground font-bold">
                      {(selectedPacket.parsed as any).shares?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Price (4 dec):</span>{" "}
                    <span className="font-bold text-foreground">
                      ₹{(selectedPacket.parsed as any).price?.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Locate ID:</span>{" "}
                    <span className="text-muted-foreground">
                      {(selectedPacket.parsed as any).stockLocate}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-muted-foreground">Order Token:</span>{" "}
                    <span className="font-bold text-primary">
                      {(selectedPacket.parsed as any).orderToken}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Symbol:</span>{" "}
                    <span className="font-bold text-foreground">
                      {(selectedPacket.parsed as any).symbol}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Side:</span>{" "}
                    <span
                      className={
                        (selectedPacket.parsed as any).buySell === "B"
                          ? "text-emerald-500 font-bold"
                          : "text-rose-500 font-bold"
                      }
                    >
                      {(selectedPacket.parsed as any).buySell === "B" ? "BUY" : "SELL"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Shares:</span>{" "}
                    <span className="text-foreground font-bold">
                      {(selectedPacket.parsed as any).shares?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Price:</span>{" "}
                    <span className="font-bold text-foreground">
                      ₹{(selectedPacket.parsed as any).price?.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Firm ID:</span>{" "}
                    <span className="text-muted-foreground">
                      {(selectedPacket.parsed as any).firm}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Hex Dump Section */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Raw Network Byte Dump (Big-Endian Wire Buffer)
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Offset | Hex (0..15) | ASCII
              </span>
            </div>
            <div className="rounded-lg border bg-black/90 p-3 font-mono text-[11px] leading-relaxed text-emerald-400 overflow-x-auto shadow-inner">
              <pre>{selectedPacket.hexDump}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
