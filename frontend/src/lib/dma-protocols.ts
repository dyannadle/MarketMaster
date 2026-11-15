/**
 * ITCH 5.0 and OUCH 4.2 Direct Market Access (DMA) Protocol Engine
 *
 * Implements:
 * 1. ITCH 5.0 Binary Multicast Market Data Feed:
 *    - MoldUDP64 / Binary framing
 *    - Message Types: 'A' (Add Order), 'E' (Order Executed), 'X' (Order Cancel), 'U' (Order Replace)
 *    - Nanosecond timestamps, Big-Endian encoding.
 * 2. OUCH 4.2 Binary TCP Direct Order Entry:
 *    - Message Types: 'O' (Enter Order), 'A' (Order Accepted), 'E' (Order Executed), 'X' (Cancel Order)
 * 3. Sub-Microsecond Tick-to-Trade (T2T) Latency Profiler:
 *    - Measures latency between inbound ITCH book event and outbound OUCH order dispatch.
 *    - Realistic hardware distribution (Sub-microsecond kernel-bypass to user-space jitter).
 * 4. Binary Dissector & Hex Dump Generator.
 */

export interface ItchAddOrderMsg {
  type: "A";
  stockLocate: number;
  trackingNumber: number;
  timestampNs: bigint;
  orderRefNumber: bigint;
  buySell: "B" | "S";
  shares: number;
  symbol: string;
  price: number; // In currency units (scaled from 1e-4)
}

export interface ItchExecutedMsg {
  type: "E";
  stockLocate: number;
  trackingNumber: number;
  timestampNs: bigint;
  orderRefNumber: bigint;
  executedShares: number;
  matchNumber: bigint;
}

export interface ItchCancelMsg {
  type: "X";
  stockLocate: number;
  trackingNumber: number;
  timestampNs: bigint;
  orderRefNumber: bigint;
  canceledShares: number;
}

export interface ItchReplaceMsg {
  type: "U";
  stockLocate: number;
  trackingNumber: number;
  timestampNs: bigint;
  origOrderRefNumber: bigint;
  newOrderRefNumber: bigint;
  shares: number;
  price: number;
}

export type ItchMessage = ItchAddOrderMsg | ItchExecutedMsg | ItchCancelMsg | ItchReplaceMsg;

export interface OuchEnterOrderMsg {
  type: "O";
  orderToken: string; // 14 chars
  buySell: "B" | "S";
  shares: number;
  symbol: string; // 8 chars
  price: number;
  timeInForce: number; // 0 = Day, 99999 = IOC
  firm: string; // 4 chars
}

export interface OuchOrderAcceptedMsg {
  type: "A";
  timestampNs: bigint;
  orderToken: string;
  buySell: "B" | "S";
  shares: number;
  symbol: string;
  price: number;
  orderRefNumber: bigint;
}

export interface OuchOrderExecutedMsg {
  type: "E";
  timestampNs: bigint;
  orderToken: string;
  executedShares: number;
  executionPrice: number;
  liquidityFlag: "A" | "R"; // Added (Maker) vs Removed (Taker)
  matchNumber: bigint;
}

export type OuchMessage = OuchEnterOrderMsg | OuchOrderAcceptedMsg | OuchOrderExecutedMsg;

export interface DmaPacketLog {
  id: string;
  protocol: "ITCH_5.0" | "OUCH_4.2";
  direction: "INBOUND" | "OUTBOUND";
  msgType: string;
  description: string;
  timestampFormatted: string;
  timestampNs: bigint;
  rawBytes: Uint8Array;
  hexDump: string;
  parsed: ItchMessage | OuchMessage;
  latencyNs?: number;
}

export interface LatencyHistogramBin {
  label: string;
  minNs: number;
  maxNs: number;
  count: number;
  percentage: number;
}

export interface LatencyTelemetryReport {
  sampleCount: number;
  minNs: number;
  maxNs: number;
  meanNs: number;
  p50Ns: number;
  p90Ns: number;
  p99Ns: number;
  p999Ns: number;
  bins: LatencyHistogramBin[];
}

/**
 * Encodes an ITCH 5.0 Add Order message ('A') into Big-Endian binary buffer (38 bytes)
 */
export function encodeItchAddOrder(msg: ItchAddOrderMsg): Uint8Array {
  const buffer = new Uint8Array(38);
  const view = new DataView(buffer.buffer);

  // Offset 0: Message Type 'A' (0x41)
  buffer[0] = 0x41;
  // Offset 1: Stock Locate (uint16)
  view.setUint16(1, msg.stockLocate, false);
  // Offset 3: Tracking Number (uint16)
  view.setUint16(3, msg.trackingNumber, false);
  // Offset 5: Timestamp Nanoseconds (6 bytes / uint48 or uint64)
  view.setBigUint64(5, msg.timestampNs, false);
  // Offset 13: Order Reference Number (uint64)
  view.setBigUint64(13, msg.orderRefNumber, false);
  // Offset 21: Buy/Sell Indicator ('B' = 0x42, 'S' = 0x53)
  buffer[21] = msg.buySell.charCodeAt(0);
  // Offset 22: Shares (uint32)
  view.setUint32(22, msg.shares, false);
  // Offset 26: Stock Symbol (8 bytes ASCII space-padded)
  const symPadded = msg.symbol.padEnd(8, " ");
  for (let i = 0; i < 8; i++) {
    buffer[26 + i] = symPadded.charCodeAt(i);
  }
  // Offset 34: Price (uint32 scaled by 10000)
  view.setUint32(34, Math.round(msg.price * 10000), false);

  return buffer;
}

/**
 * Decodes an ITCH 5.0 Add Order message ('A') from Big-Endian binary buffer
 */
export function decodeItchAddOrder(buffer: Uint8Array): ItchAddOrderMsg {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const stockLocate = view.getUint16(1, false);
  const trackingNumber = view.getUint16(3, false);
  const timestampNs = view.getBigUint64(5, false);
  const orderRefNumber = view.getBigUint64(13, false);
  const buySell = String.fromCharCode(buffer[21]!) as "B" | "S";
  const shares = view.getUint32(22, false);

  let symbol = "";
  for (let i = 0; i < 8; i++) {
    symbol += String.fromCharCode(buffer[26 + i]!);
  }
  symbol = symbol.trim();

  const priceRaw = view.getUint32(34, false);
  const price = priceRaw / 10000;

  return {
    type: "A",
    stockLocate,
    trackingNumber,
    timestampNs,
    orderRefNumber,
    buySell,
    shares,
    symbol,
    price,
  };
}

/**
 * Encodes an OUCH 4.2 Enter Order message ('O') into Big-Endian binary buffer (48 bytes)
 */
export function encodeOuchEnterOrder(msg: OuchEnterOrderMsg): Uint8Array {
  const buffer = new Uint8Array(48);
  const view = new DataView(buffer.buffer);

  // Offset 0: Message Type 'O' (0x4F)
  buffer[0] = 0x4f;
  // Offset 1: Order Token (14 bytes ASCII)
  const tokenPadded = msg.orderToken.padEnd(14, " ");
  for (let i = 0; i < 14; i++) {
    buffer[1 + i] = tokenPadded.charCodeAt(i);
  }
  // Offset 15: Buy/Sell Indicator
  buffer[15] = msg.buySell.charCodeAt(0);
  // Offset 16: Shares (uint32)
  view.setUint32(16, msg.shares, false);
  // Offset 20: Stock Symbol (8 bytes ASCII)
  const symPadded = msg.symbol.padEnd(8, " ");
  for (let i = 0; i < 8; i++) {
    buffer[20 + i] = symPadded.charCodeAt(i);
  }
  // Offset 28: Price (uint32 scaled by 10000)
  view.setUint32(28, Math.round(msg.price * 10000), false);
  // Offset 32: Time In Force (uint32)
  view.setUint32(32, msg.timeInForce, false);
  // Offset 36: Firm ID (4 bytes ASCII)
  const firmPadded = msg.firm.padEnd(4, " ");
  for (let i = 0; i < 4; i++) {
    buffer[36 + i] = firmPadded.charCodeAt(i);
  }
  // Offset 40..47: Display / Capacity / Intermarket flags
  buffer[40] = 0x59; // Display 'Y'

  return buffer;
}

/**
 * Decodes an OUCH 4.2 Enter Order message ('O') from Big-Endian binary buffer
 */
export function decodeOuchEnterOrder(buffer: Uint8Array): OuchEnterOrderMsg {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let orderToken = "";
  for (let i = 0; i < 14; i++) {
    orderToken += String.fromCharCode(buffer[1 + i]!);
  }
  orderToken = orderToken.trim();

  const buySell = String.fromCharCode(buffer[15]!) as "B" | "S";
  const shares = view.getUint32(16, false);

  let symbol = "";
  for (let i = 0; i < 8; i++) {
    symbol += String.fromCharCode(buffer[20 + i]!);
  }
  symbol = symbol.trim();

  const priceRaw = view.getUint32(28, false);
  const price = priceRaw / 10000;
  const timeInForce = view.getUint32(32, false);

  let firm = "";
  for (let i = 0; i < 4; i++) {
    firm += String.fromCharCode(buffer[36 + i]!);
  }
  firm = firm.trim();

  return {
    type: "O",
    orderToken,
    buySell,
    shares,
    symbol,
    price,
    timeInForce,
    firm,
  };
}

/**
 * Formats a binary buffer into standard Wireshark/Hex-editor style dump
 */
export function formatHexDump(buffer: Uint8Array): string {
  const lines: string[] = [];
  for (let i = 0; i < buffer.length; i += 16) {
    const offsetHex = i.toString(16).padStart(4, "0").toUpperCase();
    const chunk = buffer.slice(i, i + 16);

    const hexBytes: string[] = [];
    let asciiChars = "";

    for (let j = 0; j < 16; j++) {
      if (j < chunk.length) {
        const b = chunk[j]!;
        hexBytes.push(b.toString(16).padStart(2, "0").toUpperCase());
        asciiChars += b >= 32 && b <= 126 ? String.fromCharCode(b) : ".";
      } else {
        hexBytes.push("  ");
      }
    }

    const firstHalf = hexBytes.slice(0, 8).join(" ");
    const secondHalf = hexBytes.slice(8, 16).join(" ");
    lines.push(`${offsetHex}  ${firstHalf}  ${secondHalf}  |${asciiChars}|`);
  }
  return lines.join("\n");
}

/**
 * Generates synthetic stream of ITCH market data events and paired OUCH algorithmic responses
 */
export function generateSyntheticDmaStream(eventCount: number = 12): DmaPacketLog[] {
  const logs: DmaPacketLog[] = [];
  const baseTimestampNs = 34200000000000n; // 09:30:00.000 AM in nanoseconds

  const symbols = ["NIFTY   ", "BANKNIFT", "RELIANCE", "HDFCBANK", "INFY    "];
  let orderRefSeq = 100001n;
  let ouchTokenSeq = 80001;

  for (let i = 0; i < eventCount; i++) {
    const sym = symbols[i % symbols.length]!;
    const itchTime = baseTimestampNs + BigInt(i * 1250000); // +1.25ms intervals
    const price = 24500 + (i % 5) * 5.25;
    const isBuy = i % 2 === 0;

    // 1. ITCH Market Data Event (Add Order)
    const itchMsg: ItchAddOrderMsg = {
      type: "A",
      stockLocate: 1,
      trackingNumber: i + 1,
      timestampNs: itchTime,
      orderRefNumber: orderRefSeq++,
      buySell: isBuy ? "B" : "S",
      shares: 100 * ((i % 4) + 1),
      symbol: sym.trim(),
      price: Number(price.toFixed(2)),
    };

    const itchBytes = encodeItchAddOrder(itchMsg);
    const itchTimeFormatted = formatNsToTime(itchTime);

    logs.push({
      id: `ITCH-${i + 1}`,
      protocol: "ITCH_5.0",
      direction: "INBOUND",
      msgType: "Add Order (A)",
      description: `Market Depth Add: ${itchMsg.buySell === "B" ? "BID" : "ASK"} ${itchMsg.shares} ${itchMsg.symbol} @ ₹${itchMsg.price.toFixed(2)}`,
      timestampFormatted: itchTimeFormatted,
      timestampNs: itchTime,
      rawBytes: itchBytes,
      hexDump: formatHexDump(itchBytes),
      parsed: itchMsg,
    });

    // 2. High-Frequency Trading Bot triggers an OUCH Order Entry in response
    // Realistic kernel-bypass / FPGA tick-to-trade latency: 850ns to 12,400ns
    // Synthetic log-normal latency profile:
    const jitterFactor = Math.sin(i * 1.7) * 0.5 + 0.5;
    const latencyNs = Math.round(850 + jitterFactor * 2400 + (i % 3 === 0 ? 5200 : 0));
    const ouchTime = itchTime + BigInt(latencyNs);

    const ouchMsg: OuchEnterOrderMsg = {
      type: "O",
      orderToken: `ORD${ouchTokenSeq++}`,
      buySell: isBuy ? "B" : "S",
      shares: 50 * ((i % 3) + 1),
      symbol: sym.trim(),
      price: Number((price + (isBuy ? 0.05 : -0.05)).toFixed(2)),
      timeInForce: 99999, // IOC
      firm: "MMTR",
    };

    const ouchBytes = encodeOuchEnterOrder(ouchMsg);
    const ouchTimeFormatted = formatNsToTime(ouchTime);

    logs.push({
      id: `OUCH-${i + 1}`,
      protocol: "OUCH_4.2",
      direction: "OUTBOUND",
      msgType: "Enter Order (O)",
      description: `DMA IOC Dispatch: ${ouchMsg.buySell} ${ouchMsg.shares} ${ouchMsg.symbol} @ ₹${ouchMsg.price.toFixed(2)}`,
      timestampFormatted: ouchTimeFormatted,
      timestampNs: ouchTime,
      rawBytes: ouchBytes,
      hexDump: formatHexDump(ouchBytes),
      parsed: ouchMsg,
      latencyNs,
    });
  }

  return logs;
}

function formatNsToTime(ns: bigint): string {
  const totalSeconds = Number(ns / 1000000000n);
  const remainingNs = Number(ns % 1000000000n);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = hours.toString().padStart(2, "0");
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  const subSec = Math.floor(remainingNs / 1000).toString().padStart(6, "0"); // Microseconds

  return `${hh}:${mm}:${ss}.${subSec}`;
}

/**
 * Computes Latency Percentiles and Histogram from DmaPacketLogs
 */
export function computeLatencyTelemetry(logs: DmaPacketLog[]): LatencyTelemetryReport {
  const latencies = logs
    .filter((l) => l.latencyNs !== undefined)
    .map((l) => l.latencyNs!)
    .sort((a, b) => a - b);

  if (latencies.length === 0) {
    return {
      sampleCount: 0,
      minNs: 0,
      maxNs: 0,
      meanNs: 0,
      p50Ns: 0,
      p90Ns: 0,
      p99Ns: 0,
      p999Ns: 0,
      bins: [],
    };
  }

  const count = latencies.length;
  const minNs = latencies[0]!;
  const maxNs = latencies[count - 1]!;
  const sum = latencies.reduce((a, b) => a + b, 0);
  const meanNs = Math.round(sum / count);

  const p50Ns = latencies[Math.floor(count * 0.5)]!;
  const p90Ns = latencies[Math.floor(count * 0.9)]!;
  const p99Ns = latencies[Math.floor(count * 0.99)]!;
  const p999Ns = latencies[Math.floor(count * 0.999)] || maxNs;

  const binDefs = [
    { label: "< 1.0 µs", minNs: 0, maxNs: 1000 },
    { label: "1.0 - 2.5 µs", minNs: 1000, maxNs: 2500 },
    { label: "2.5 - 5.0 µs", minNs: 2500, maxNs: 5000 },
    { label: "5.0 - 10 µs", minNs: 5000, maxNs: 10000 },
    { label: "> 10 µs", minNs: 10000, maxNs: Infinity },
  ];

  const bins: LatencyHistogramBin[] = binDefs.map((def) => {
    const inBin = latencies.filter((l) => l >= def.minNs && l < def.maxNs).length;
    return {
      label: def.label,
      minNs: def.minNs,
      maxNs: def.maxNs,
      count: inBin,
      percentage: Number(((inBin / count) * 100).toFixed(1)),
    };
  });

  return {
    sampleCount: count,
    minNs,
    maxNs,
    meanNs,
    p50Ns,
    p90Ns,
    p99Ns,
    p999Ns,
    bins,
  };
}
