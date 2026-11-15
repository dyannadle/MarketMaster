// Milestone 41: FIX Fast Protocol (FAST) Binary Compression Engine & Ultra-Low-Latency Order Decoder
// Implements stop-bit 7-bit encoding, Presence Map (P-Map), Copy/Delta/Default field operators, and bandwidth telemetry.

export type FastOperator = "CONSTANT" | "DEFAULT" | "COPY" | "DELTA" | "NONE";

export interface FastFieldDefinition {
  tag: number;
  name: string;
  type: "uInt32" | "int32" | "decimal" | "string";
  operator: FastOperator;
  defaultValue?: string | number | undefined;
  constantValue?: string | number | undefined;
}

export interface FastTemplate {
  id: number;
  name: string;
  fields: FastFieldDefinition[];
}

export interface FastLogicalMessage {
  templateId: number;
  msgType: string;
  seqNum: number;
  symbol: string;
  price: number;
  orderQty: number;
  side: "1" | "2"; // 1=Buy, 2=Sell
  ordStatus: "0" | "1" | "2" | "4"; // 0=New, 1=Partial, 2=Filled, 4=Cancelled
}

export interface FastEncodedPacket {
  templateId: number;
  asciiFixString: string;
  asciiByteLength: number;
  fastBinaryBytes: Uint8Array;
  fastHexDump: string;
  fastByteLength: number;
  bandwidthReductionPct: number; // e.g. 88.5%
  pMapBits: string; // e.g. "11010010"
  fieldsDecoded: Record<string, string | number>;
}

// Default Template: NSE/BSE Co-location Execution Report (Template ID 101)
export const FAST_TEMPLATE_101: FastTemplate = {
  id: 101,
  name: "ExecutionReport_FAST",
  fields: [
    { tag: 35, name: "MsgType", type: "string", operator: "COPY", defaultValue: "8" },
    { tag: 34, name: "SeqNum", type: "uInt32", operator: "DELTA" },
    { tag: 55, name: "Symbol", type: "string", operator: "COPY", defaultValue: "NIFTY" },
    { tag: 44, name: "Price", type: "decimal", operator: "DELTA" },
    { tag: 38, name: "OrderQty", type: "uInt32", operator: "DEFAULT", defaultValue: 50 },
    { tag: 54, name: "Side", type: "string", operator: "COPY", defaultValue: "1" },
    { tag: 39, name: "OrdStatus", type: "string", operator: "NONE" },
  ],
};

// 1. FAST Stop-Bit Encoding (7-bit payloads, MSB 0x80 on the final byte)
export function encodeStopBitUInt(val: number): number[] {
  let v = Math.floor(Math.max(0, val));
  const bytes: number[] = [];
  do {
    bytes.unshift(v & 0x7f);
    v = Math.floor(v / 128);
  } while (v > 0);

  // Set MSB (0x80) on the last byte as stop-bit
  bytes[bytes.length - 1] = (bytes[bytes.length - 1] ?? 0) | 0x80;
  return bytes;
}

export function decodeStopBitUInt(bytes: number[], offset: { index: number }): number {
  let val = 0;
  while (offset.index < bytes.length) {
    const b = bytes[offset.index] ?? 0;
    offset.index++;
    val = val * 128 + (b & 0x7f);
    if ((b & 0x80) !== 0) break; // Stop-bit reached
  }
  return val;
}

export function encodeStopBitString(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) & 0x7f;
    bytes.push(code);
  }
  if (bytes.length === 0) bytes.push(0);
  bytes[bytes.length - 1] = (bytes[bytes.length - 1] ?? 0) | 0x80;
  return bytes;
}

export function decodeStopBitString(bytes: number[], offset: { index: number }): string {
  let result = "";
  while (offset.index < bytes.length) {
    const b = bytes[offset.index] ?? 0;
    offset.index++;
    result += String.fromCharCode(b & 0x7f);
    if ((b & 0x80) !== 0) break;
  }
  return result;
}

// 2. Stateful FAST Codec Engine
export class FastCodecEngine {
  private template: FastTemplate;
  private previousValues: Record<string, string | number> = {};

  constructor(template: FastTemplate = FAST_TEMPLATE_101) {
    this.template = template;
    this.resetState();
  }

  public resetState(): void {
    this.previousValues = {
      MsgType: "8",
      SeqNum: 1000,
      Symbol: "NIFTY",
      Price: 24200.0,
      OrderQty: 50,
      Side: "1",
      OrdStatus: "0",
    };
  }

  // Encode a logical FIX message into FAST binary with P-Map and field operators
  public encode(msg: FastLogicalMessage): FastEncodedPacket {
    const rawAscii = `8=FIX.4.4\x019=168\x0135=${msg.msgType}\x0134=${msg.seqNum}\x0149=MM_NSE\x0156=INST_GATE\x0155=${msg.symbol}\x0154=${msg.side}\x0138=${msg.orderQty}\x0144=${msg.price.toFixed(2)}\x0139=${msg.ordStatus}\x0110=188\x01`;

    const binaryPayload: number[] = [];
    const pMapBits: number[] = [1]; // Bit 0: Template ID is present

    // Template ID stop-bit
    binaryPayload.push(...encodeStopBitUInt(this.template.id));

    // Evaluate each field according to FAST field operators
    this.template.fields.forEach((field) => {
      const fieldVal = (msg as any)[field.name.charAt(0).toLowerCase() + field.name.slice(1)] ??
                       (msg as any)[field.name];
      const prevVal = this.previousValues[field.name];

      if (field.operator === "COPY") {
        if (fieldVal === prevVal) {
          // Unchanged: Omit from stream, set P-map bit = 0
          pMapBits.push(0);
        } else {
          // Changed: Transmit new value, set P-map bit = 1, update state
          pMapBits.push(1);
          binaryPayload.push(...encodeStopBitString(String(fieldVal)));
          this.previousValues[field.name] = fieldVal;
        }
      } else if (field.operator === "DELTA") {
        pMapBits.push(1);
        if (field.type === "decimal") {
          const delta = Math.round((Number(fieldVal) - Number(prevVal ?? 24200.0)) * 10);
          const signBit = delta < 0 ? 0x40 : 0x00;
          const absVal = Math.abs(delta);
          const encoded = encodeStopBitUInt(absVal);
          encoded[0] = (encoded[0] ?? 0) | signBit;
          binaryPayload.push(...encoded);
        } else {
          const delta = Number(fieldVal) - Number(prevVal ?? 0);
          binaryPayload.push(...encodeStopBitUInt(Math.max(0, delta)));
        }
        this.previousValues[field.name] = fieldVal;
      } else if (field.operator === "DEFAULT") {
        if (fieldVal === field.defaultValue) {
          // Equals default: omit from wire, bit = 0
          pMapBits.push(0);
        } else {
          // Custom value: transmit, bit = 1
          pMapBits.push(1);
          binaryPayload.push(...encodeStopBitUInt(Number(fieldVal)));
          this.previousValues[field.name] = fieldVal;
        }
      } else {
        // NONE: raw transmission
        pMapBits.push(1);
        binaryPayload.push(...encodeStopBitString(String(fieldVal)));
        this.previousValues[field.name] = fieldVal;
      }
    });

    // Encode P-Map into stop-bit byte(s)
    let pMapByte = 0;
    for (let i = 0; i < Math.min(pMapBits.length, 7); i++) {
      if (pMapBits[i] === 1) {
        pMapByte |= (1 << (6 - i));
      }
    }
    pMapByte |= 0x80; // stop bit
    const fullFastBytes = new Uint8Array([pMapByte, ...binaryPayload]);

    const hexDump = Array.from(fullFastBytes)
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join(" ");

    const asciiLen = rawAscii.length;
    const fastLen = fullFastBytes.length;
    const reduction = Math.round(((asciiLen - fastLen) / asciiLen) * 1000) / 10;

    return {
      templateId: this.template.id,
      asciiFixString: rawAscii,
      asciiByteLength: asciiLen,
      fastBinaryBytes: fullFastBytes,
      fastHexDump: hexDump,
      fastByteLength: fastLen,
      bandwidthReductionPct: reduction,
      pMapBits: pMapBits.join(""),
      fieldsDecoded: { ...this.previousValues },
    };
  }

  // Decode FAST binary stream back to logical message
  public decode(bytes: Uint8Array): Record<string, string | number> {
    const byteArray = Array.from(bytes);
    const offset = { index: 0 };

    // Read P-Map byte
    const pMapByte = byteArray[offset.index] ?? 0x80;
    offset.index++;
    const pMapBits: number[] = [];
    for (let i = 0; i < 7; i++) {
      pMapBits.push((pMapByte & (1 << (6 - i))) !== 0 ? 1 : 0);
    }

    // Read Template ID if bit 0 is 1
    let templateId = this.template.id;
    if (pMapBits[0] === 1) {
      templateId = decodeStopBitUInt(byteArray, offset);
    }

    const decoded: Record<string, string | number> = { templateId };
    let bitIdx = 1;

    this.template.fields.forEach((field) => {
      const bit = pMapBits[bitIdx] ?? 0;
      bitIdx++;

      if (field.operator === "COPY") {
        if (bit === 1) {
          const val = decodeStopBitString(byteArray, offset);
          this.previousValues[field.name] = val;
        }
        decoded[field.name] = this.previousValues[field.name] ?? field.defaultValue ?? "";
      } else if (field.operator === "DELTA") {
        if (bit === 1) {
          const delta = decodeStopBitUInt(byteArray, offset);
          if (field.type === "decimal") {
            const prev = Number(this.previousValues[field.name] ?? 24200.0);
            const next = Math.round((prev + delta * 0.1) * 10) / 10;
            this.previousValues[field.name] = next;
          } else {
            const prev = Number(this.previousValues[field.name] ?? 0);
            this.previousValues[field.name] = prev + delta;
          }
        }
        decoded[field.name] = this.previousValues[field.name] ?? 0;
      } else if (field.operator === "DEFAULT") {
        if (bit === 1) {
          decoded[field.name] = decodeStopBitUInt(byteArray, offset);
        } else {
          decoded[field.name] = field.defaultValue ?? 50;
        }
        this.previousValues[field.name] = decoded[field.name] ?? 50;
      } else {
        decoded[field.name] = decodeStopBitString(byteArray, offset);
        this.previousValues[field.name] = decoded[field.name] ?? "";
      }
    });

    return decoded;
  }
}

// Generate Sample Sequence of Streaming FAST Messages
export function generateSampleFastStream(count: number = 8): FastEncodedPacket[] {
  const engine = new FastCodecEngine();
  const packets: FastEncodedPacket[] = [];
  let seq = 1001;
  let px = 24200.0;

  for (let i = 0; i < count; i++) {
    px = Math.round((px + (i % 2 === 0 ? 0.5 : -0.5)) * 10) / 10;
    const packet = engine.encode({
      templateId: 101,
      msgType: "8",
      seqNum: seq,
      symbol: "NIFTY",
      price: px,
      orderQty: 50,
      side: i % 3 === 0 ? "2" : "1",
      ordStatus: i === 0 ? "0" : i === 1 ? "1" : "2",
    });
    packets.push(packet);
    seq++;
  }

  return packets;
}
