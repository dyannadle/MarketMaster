// Milestone 20: Financial Information eXchange (FIX 4.4) Protocol Engine & Drop Copy Feed
// Implements standard broker-dealer / exchange gateway messaging (Tags 8, 9, 35, 49, 56, 34, 52, 11, 37, 55, 54, 38, 40, 44, 39, 150, 10)

export interface FixField {
  tag: number;
  name: string;
  value: string;
  description: string;
}

export interface FixMessageLog {
  id: string;
  timestamp: string; // ISO string
  rawFix: string; // Pipe or SOH delimited string
  msgType: "D" | "8" | "F" | "j" | string;
  msgTypeName: string;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  price?: number | undefined;
  clOrdId: string;
  ordStatus: string;
  fields: FixField[];
}

const STORAGE_KEY = "mm_fix_drop_copy_v1";
const EVENT_NAME = "mm-fix-log-update";

/** Compute standard FIX 3-digit CheckSum (modulo 256 of byte values) */
export function calculateFixChecksum(bodyWithoutChecksum: string): string {
  let sum = 0;
  for (let i = 0; i < bodyWithoutChecksum.length; i++) {
    sum += bodyWithoutChecksum.charCodeAt(i);
  }
  const checksum = (sum % 256).toString().padStart(3, "0");
  return checksum;
}

/** Formats current UTC timestamp in standard FIX format: YYYYMMDD-HH:MM:SS.sss */
export function formatFixSendingTime(date = new Date()): string {
  const pad = (n: number, w = 2) => n.toString().padStart(w, "0");
  const yyyy = date.getUTCFullYear();
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());
  const ms = pad(date.getUTCMilliseconds(), 3);
  return `${yyyy}${mm}${dd}-${hh}:${min}:${ss}.${ms}`;
}

/** Translates tag numbers to official FIX 4.4 field names and values */
export function getFixFieldDescription(tag: number, val: string): { name: string; description: string } {
  switch (tag) {
    case 8:
      return { name: "BeginString", description: "FIX protocol version" };
    case 9:
      return { name: "BodyLength", description: "Byte count between tag 9 and tag 10" };
    case 35:
      switch (val) {
        case "D": return { name: "MsgType", description: "New Order Single" };
        case "8": return { name: "MsgType", description: "Execution Report" };
        case "F": return { name: "MsgType", description: "Order Cancel Request" };
        case "j": return { name: "MsgType", description: "Business Reject" };
        default: return { name: "MsgType", description: `Custom Message (${val})` };
      }
    case 49:
      return { name: "SenderCompID", description: "Firm identifier of the sender" };
    case 56:
      return { name: "TargetCompID", description: "Exchange or broker gateway destination" };
    case 34:
      return { name: "MsgSeqNum", description: "Integer message sequence counter" };
    case 52:
      return { name: "SendingTime", description: "UTC timestamp when message was transmitted" };
    case 11:
      return { name: "ClOrdID", description: "Unique client order identifier" };
    case 37:
      return { name: "OrderID", description: "Exchange / broker generated order identifier" };
    case 55:
      return { name: "Symbol", description: "Ticker or instrument symbol" };
    case 54:
      return { name: "Side", description: val === "1" ? "1 = Buy" : "2 = Sell" };
    case 38:
      return { name: "OrderQty", description: "Quantity ordered in lots/shares" };
    case 40:
      return { name: "OrdType", description: val === "1" ? "1 = Market" : val === "2" ? "2 = Limit" : "3 = Stop" };
    case 44:
      return { name: "Price", description: "Limit price per share/contract" };
    case 39:
      switch (val) {
        case "0": return { name: "OrdStatus", description: "0 = New" };
        case "1": return { name: "OrdStatus", description: "1 = Partially Filled" };
        case "2": return { name: "OrdStatus", description: "2 = Filled" };
        case "4": return { name: "OrdStatus", description: "4 = Cancelled" };
        case "8": return { name: "OrdStatus", description: "8 = Rejected" };
        default: return { name: "OrdStatus", description: val };
      }
    case 150:
      return { name: "ExecType", description: val === "0" ? "0 = New" : val === "F" ? "F = Trade" : val };
    case 10:
      return { name: "CheckSum", description: "3-character modulo 256 verification sum" };
    default:
      return { name: `Tag_${tag}`, description: `Value: ${val}` };
  }
}

/** Parses raw FIX tag-value string */
export function parseRawFix(raw: string): FixField[] {
  // Accepts '|' or '\x01' (SOH) delimiter
  const tokens = raw.split(/[|\x01]/).filter((t) => t.trim().length > 0);
  return tokens.map((token) => {
    const eqIdx = token.indexOf("=");
    if (eqIdx === -1) {
      return { tag: 0, name: "Unknown", value: token, description: token };
    }
    const tag = parseInt(token.slice(0, eqIdx), 10);
    const value = token.slice(eqIdx + 1);
    const { name, description } = getFixFieldDescription(tag, value);
    return { tag, name, value, description };
  });
}

/**
 * Creates FIX 4.4 New Order Single (35=D)
 */
export function createNewOrderSingleFix(params: {
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  orderType: "MARKET" | "LIMIT";
  price?: number;
  seqNum?: number;
}): FixMessageLog {
  const seqNum = params.seqNum || Math.floor(Math.random() * 9000 + 1000);
  const clOrdId = `MM-ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const sendingTime = formatFixSendingTime();

  const sideVal = params.side === "BUY" ? "1" : "2";
  const ordTypeVal = params.orderType === "MARKET" ? "1" : "2";

  // Build body tags (everything between tag 9 and tag 10)
  const bodyParts = [
    "35=D",
    "49=MM_CLIENT_PROD",
    "56=NSE_MATCH_GW",
    `34=${seqNum}`,
    `52=${sendingTime}`,
    `11=${clOrdId}`,
    `55=${params.symbol}`,
    `54=${sideVal}`,
    `38=${params.qty}`,
    `40=${ordTypeVal}`,
  ];

  if (params.orderType === "LIMIT" && params.price) {
    bodyParts.push(`44=${params.price.toFixed(2)}`);
  }

  const bodyStr = bodyParts.join("|") + "|";
  const bodyLength = bodyStr.length;

  const header = `8=FIX.4.4|9=${bodyLength}|`;
  const preChecksum = header + bodyStr;
  const checksum = calculateFixChecksum(preChecksum);
  const rawFix = `${preChecksum}10=${checksum}|`;

  const parsedFields = parseRawFix(rawFix);

  return {
    id: `fix-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    rawFix,
    msgType: "D",
    msgTypeName: "New Order Single (35=D)",
    symbol: params.symbol,
    side: params.side,
    qty: params.qty,
    price: params.price,
    clOrdId,
    ordStatus: "0 (New)",
    fields: parsedFields,
  };
}

/**
 * Creates FIX 4.4 Execution Report (35=8)
 */
export function createExecutionReportFix(params: {
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  fillPrice: number;
  clOrdId?: string;
  seqNum?: number;
}): FixMessageLog {
  const seqNum = params.seqNum || Math.floor(Math.random() * 9000 + 1000);
  const clOrdId = params.clOrdId || `MM-ORD-${Date.now().toString(36).toUpperCase()}`;
  const orderId = `NSE-EXEC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const sendingTime = formatFixSendingTime();
  const sideVal = params.side === "BUY" ? "1" : "2";

  const bodyParts = [
    "35=8",
    "49=NSE_MATCH_GW",
    "56=MM_CLIENT_PROD",
    `34=${seqNum}`,
    `52=${sendingTime}`,
    `11=${clOrdId}`,
    `37=${orderId}`,
    `150=F`, // Trade/Fill
    `39=2`, // Filled
    `55=${params.symbol}`,
    `54=${sideVal}`,
    `38=${params.qty}`,
    `44=${params.fillPrice.toFixed(2)}`,
  ];

  const bodyStr = bodyParts.join("|") + "|";
  const bodyLength = bodyStr.length;
  const header = `8=FIX.4.4|9=${bodyLength}|`;
  const preChecksum = header + bodyStr;
  const checksum = calculateFixChecksum(preChecksum);
  const rawFix = `${preChecksum}10=${checksum}|`;

  const parsedFields = parseRawFix(rawFix);

  return {
    id: `fix-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    rawFix,
    msgType: "8",
    msgTypeName: "Execution Report (35=8)",
    symbol: params.symbol,
    side: params.side,
    qty: params.qty,
    price: params.fillPrice,
    clOrdId,
    ordStatus: "2 (Filled)",
    fields: parsedFields,
  };
}

/** Stored initial seeds if storage empty */
const INITIAL_FIX_SEEDS: FixMessageLog[] = [
  createNewOrderSingleFix({ symbol: "RELIANCE", side: "BUY", qty: 10, orderType: "LIMIT", price: 2945.5, seqNum: 1001 }),
  createExecutionReportFix({ symbol: "RELIANCE", side: "BUY", qty: 10, fillPrice: 2945.5, seqNum: 1002 }),
  createNewOrderSingleFix({ symbol: "NIFTY_FUT", side: "BUY", qty: 50, orderType: "MARKET", seqNum: 1003 }),
  createExecutionReportFix({ symbol: "NIFTY_FUT", side: "BUY", qty: 50, fillPrice: 24510.0, seqNum: 1004 }),
];

export function getStoredFixLogs(): FixMessageLog[] {
  if (typeof window === "undefined") return INITIAL_FIX_SEEDS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_FIX_SEEDS));
      return INITIAL_FIX_SEEDS;
    }
    return JSON.parse(raw);
  } catch (_e) {
    return INITIAL_FIX_SEEDS;
  }
}

export function logFixMessage(msg: FixMessageLog): void {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredFixLogs();
    const updated = [msg, ...current].slice(0, 50); // Keep last 50
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
  } catch (err) {
    console.error("Failed saving FIX log:", err);
  }
}

/** Exports full Drop Copy audit stream as a downloadable .fix file */
export function exportDropCopyFile(messages: FixMessageLog[]): void {
  if (typeof window === "undefined") return;
  const content = messages.map((m) => m.rawFix).join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `marketmaster_drop_copy_${new Date().toISOString().slice(0, 10)}.fix`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
