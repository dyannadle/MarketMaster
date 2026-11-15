// Milestone 38: Level-3 FIX Drop-Copy Real-Time Audit Feed WebSocket & Regulatory Replay
// Simulates streaming FIX 4.4 drop-copy feeds, reconstructs L3/MBO matching engine book, and maintains SHA-256 hash chains.

export interface FixRawMessage {
  seqNum: number;
  sendingTime: string; // YYYYMMDD-HH:MM:SS.sss
  msgType: "D" | "8" | "F" | "G"; // D: NewOrder, 8: ExecReport, F: CancelReq, G: ReplaceReq
  msgTypeName: string;
  clOrdId: string;
  orderId?: string | undefined;
  execId?: string | undefined;
  execType?: string | undefined; // 0=New, 1=Partial, 2=Fill, 4=Cancelled, 8=Rejected
  ordStatus?: string | undefined;
  symbol: string;
  side: "1" | "2"; // 1=Buy, 2=Sell
  price: number;
  orderQty: number;
  cumQty: number;
  leavesQty: number;
  lastPx?: number | undefined;
  lastQty?: number | undefined;
  rawString: string;
  sha256Hash: string;
}

export interface Level3BookOrder {
  orderId: string;
  clOrdId: string;
  side: "BUY" | "SELL";
  price: number;
  qty: number;
  initialQty: number;
  timestamp: string;
  queuePosition: number;
}

export interface Level2DepthLevel {
  price: number;
  totalVolume: number;
  orderCount: number;
  orders: Level3BookOrder[];
}

export interface ReconstructedBookState {
  symbol: string;
  lastUpdateTime: string;
  totalActiveOrders: number;
  bids: Level2DepthLevel[]; // sorted descending by price
  asks: Level2DepthLevel[]; // sorted ascending by price
  spread: number;
  midPrice: number;
}

// Compute deterministic SHA-256 hash simulation (synchronous & lightweight for high-throughput stream)
export function computeFixStreamHash(prevHash: string, seqNum: number, raw: string): string {
  let h1 = 0xdeadbeef ^ seqNum;
  let h2 = 0x41c6ce57;
  const str = `${prevHash}|${seqNum}|${raw}`;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const hex1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const hex2 = (h2 >>> 0).toString(16).padStart(8, "0");
  const hex3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, "0");
  const hex4 = ((h1 + h2) >>> 0).toString(16).padStart(8, "0");
  return `${hex1}${hex2}${hex3}${hex4}`;
}

// Calculate standard FIX checksum: sum of ASCII bytes modulo 256
export function calculateFixChecksum(body: string): string {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    sum = (sum + body.charCodeAt(i)) % 256;
  }
  return sum.toString().padStart(3, "0");
}

// Format millisecond timestamp: YYYYMMDD-HH:MM:SS.sss
export function getSendingTimeNow(offsetMs: number = 0): string {
  const d = new Date(Date.now() + offsetMs);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const sss = String(d.getMilliseconds()).padStart(3, "0");
  return `${yyyy}${mm}${dd}-${hh}:${min}:${ss}.${sss}`;
}

// 1. Generate Raw FIX 4.4 String from Object
export function serializeFixMessage(fields: Record<number, string | number>): string {
  const header = `8=FIX.4.4\x01`;
  const bodyFields = Object.entries(fields)
    .filter(([tag]) => Number(tag) !== 8 && Number(tag) !== 9 && Number(tag) !== 10)
    .map(([tag, val]) => `${tag}=${val}\x01`)
    .join("");

  const bodyLength = bodyFields.length;
  const fullBody = `9=${bodyLength}\x01${bodyFields}`;
  const checksum = calculateFixChecksum(`${header}${fullBody}`);
  return `${header}${fullBody}10=${checksum}\x01`;
}

// 2. Incremental Level-3 Matching Engine Book Class
export class Level3BookReconstructor {
  public symbol: string;
  private buyOrders = new Map<string, Level3BookOrder>();
  private sellOrders = new Map<string, Level3BookOrder>();
  private lastTime: string = "";

  constructor(symbol: string = "NIFTY") {
    this.symbol = symbol;
  }

  // Process incoming FIX message to update resting order book
  public applyFixMessage(msg: FixRawMessage): void {
    this.lastTime = msg.sendingTime;
    const isBuy = msg.side === "1";
    const orderMap = isBuy ? this.buyOrders : this.sellOrders;
    const orderId = msg.orderId || msg.clOrdId;

    if (msg.msgType === "D") {
      // New Order Single: Insert into order book
      orderMap.set(orderId, {
        orderId,
        clOrdId: msg.clOrdId,
        side: isBuy ? "BUY" : "SELL",
        price: msg.price,
        qty: msg.orderQty,
        initialQty: msg.orderQty,
        timestamp: msg.sendingTime,
        queuePosition: 1,
      });
    } else if (msg.msgType === "8") {
      // Execution Report
      if (msg.execType === "0") {
        // Confirmed New
        if (!orderMap.has(orderId)) {
          orderMap.set(orderId, {
            orderId,
            clOrdId: msg.clOrdId,
            side: isBuy ? "BUY" : "SELL",
            price: msg.price,
            qty: msg.leavesQty,
            initialQty: msg.orderQty,
            timestamp: msg.sendingTime,
            queuePosition: 1,
          });
        }
      } else if (msg.execType === "1") {
        // Partial Fill: Decrement resting quantity
        const existing = orderMap.get(orderId);
        if (existing) {
          existing.qty = msg.leavesQty;
        }
      } else if (msg.execType === "2" || msg.execType === "4" || msg.execType === "8") {
        // Full Fill, Cancelled, or Rejected: Evict from resting book
        orderMap.delete(orderId);
      }
    } else if (msg.msgType === "F") {
      // Order Cancel Request: Evict order
      orderMap.delete(orderId);
    }
  }

  // Extract snapshot of aggregated Level-2 book from resting Level-3 orders
  public getSnapshot(): ReconstructedBookState {
    const bidsMap = new Map<number, Level3BookOrder[]>();
    const asksMap = new Map<number, Level3BookOrder[]>();

    this.buyOrders.forEach((order) => {
      const list = bidsMap.get(order.price) || [];
      list.push(order);
      bidsMap.set(order.price, list);
    });

    this.sellOrders.forEach((order) => {
      const list = asksMap.get(order.price) || [];
      list.push(order);
      asksMap.set(order.price, list);
    });

    // Sort Bids descending (highest buy price first)
    const bids: Level2DepthLevel[] = Array.from(bidsMap.entries())
      .map(([price, orders]) => ({
        price,
        totalVolume: orders.reduce((sum, o) => sum + o.qty, 0),
        orderCount: orders.length,
        orders: orders.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
      }))
      .sort((a, b) => b.price - a.price)
      .slice(0, 5);

    // Sort Asks ascending (lowest sell price first)
    const asks: Level2DepthLevel[] = Array.from(asksMap.entries())
      .map(([price, orders]) => ({
        price,
        totalVolume: orders.reduce((sum, o) => sum + o.qty, 0),
        orderCount: orders.length,
        orders: orders.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
      }))
      .sort((a, b) => a.price - b.price)
      .slice(0, 5);

    const bestBid = bids[0]?.price ?? 24200.0;
    const bestAsk = asks[0]?.price ?? 24200.5;
    const spread = Math.max(0, Math.round((bestAsk - bestBid) * 100) / 100);
    const midPrice = Math.round(((bestBid + bestAsk) / 2.0) * 100) / 100;

    return {
      symbol: this.symbol,
      lastUpdateTime: this.lastTime || getSendingTimeNow(),
      totalActiveOrders: this.buyOrders.size + this.sellOrders.size,
      bids,
      asks,
      spread,
      midPrice,
    };
  }

  public reset(): void {
    this.buyOrders.clear();
    this.sellOrders.clear();
  }
}

// 3. Generate Realistic Sample Streaming FIX Drop-Copy Events
export function generateInitialFixStream(symbol: string = "NIFTY", basePrice: number = 24200.0): FixRawMessage[] {
  const stream: FixRawMessage[] = [];
  let prevHash = "0000000000000000000000000000000000000000000000000000000000000000";
  let seq = 1;

  const offsets = [
    { side: "1", pxDelta: -0.5, qty: 150, type: "D", clId: "CLORD-101", ordId: "ORD-901" },
    { side: "1", pxDelta: -1.0, qty: 300, type: "D", clId: "CLORD-102", ordId: "ORD-902" },
    { side: "1", pxDelta: -1.5, qty: 500, type: "D", clId: "CLORD-103", ordId: "ORD-903" },
    { side: "2", pxDelta: 0.5, qty: 200, type: "D", clId: "CLORD-201", ordId: "ORD-911" },
    { side: "2", pxDelta: 1.0, qty: 450, type: "D", clId: "CLORD-202", ordId: "ORD-912" },
    { side: "2", pxDelta: 1.5, qty: 600, type: "D", clId: "CLORD-203", ordId: "ORD-913" },
    // Partial fill on buy order
    { side: "1", pxDelta: -0.5, qty: 150, type: "8", clId: "CLORD-101", ordId: "ORD-901", execType: "1", ordStatus: "1", cumQty: 50, leavesQty: 100, lastPx: basePrice - 0.5, lastQty: 50 },
    // Full fill on sell order
    { side: "2", pxDelta: 0.5, qty: 200, type: "8", clId: "CLORD-201", ordId: "ORD-911", execType: "2", ordStatus: "2", cumQty: 200, leavesQty: 0, lastPx: basePrice + 0.5, lastQty: 200 },
    // Cancel on far bid
    { side: "1", pxDelta: -1.5, qty: 500, type: "8", clId: "CLORD-103", ordId: "ORD-903", execType: "4", ordStatus: "4", cumQty: 0, leavesQty: 0 },
    // New aggressive bid
    { side: "1", pxDelta: 0.0, qty: 250, type: "D", clId: "CLORD-104", ordId: "ORD-904" },
  ];

  offsets.forEach((evt, idx) => {
    const time = getSendingTimeNow(idx * 120);
    const px = Math.round((basePrice + evt.pxDelta) * 10) / 10;
    const msgType = evt.type as "D" | "8";

    const fields: Record<number, string | number> = {
      35: msgType,
      34: seq,
      49: "MM_GATEWAY_NSE",
      56: "INST_BROKER_42",
      52: time,
      11: evt.clId,
      37: evt.ordId,
      55: symbol,
      54: evt.side,
      38: evt.qty,
      44: px,
      40: "2", // Limit
      39: evt.ordStatus || "0",
      14: evt.cumQty || 0,
      151: evt.leavesQty !== undefined ? evt.leavesQty : evt.qty,
    };

    if (msgType === "8") {
      fields[17] = `EXEC-${seq + 8000}`;
      fields[150] = evt.execType || "0";
      if (evt.lastPx) fields[31] = evt.lastPx;
      if (evt.lastQty) fields[32] = evt.lastQty;
    }

    const raw = serializeFixMessage(fields);
    const hash = computeFixStreamHash(prevHash, seq, raw);
    prevHash = hash;

    stream.push({
      seqNum: seq,
      sendingTime: time,
      msgType,
      msgTypeName: msgType === "D" ? "NewOrderSingle" : "ExecutionReport",
      clOrdId: evt.clId,
      orderId: evt.ordId,
      execId: msgType === "8" ? `EXEC-${seq + 8000}` : undefined,
      execType: evt.execType,
      ordStatus: evt.ordStatus || "0",
      symbol,
      side: evt.side as "1" | "2",
      price: px,
      orderQty: evt.qty,
      cumQty: evt.cumQty || 0,
      leavesQty: evt.leavesQty !== undefined ? evt.leavesQty : evt.qty,
      lastPx: evt.lastPx,
      lastQty: evt.lastQty,
      rawString: raw,
      sha256Hash: hash,
    });

    seq++;
  });

  return stream;
}

// 4. Create Next Streaming FIX Event Tick
export function generateNextFixTick(
  prevMsg: FixRawMessage | undefined,
  symbol: string,
  midPrice: number
): FixRawMessage {
  const seq = (prevMsg ? prevMsg.seqNum : 0) + 1;
  const prevHash = prevMsg ? prevMsg.sha256Hash : "0000000000000000000000000000000000000000000000000000000000000000";
  const time = getSendingTimeNow();

  const isBuy = Math.random() > 0.5;
  const isExec = Math.random() > 0.45;
  const delta = (Math.random() - 0.5) * 2.0;
  const px = Math.round((midPrice + delta) * 10) / 10;
  const qty = [50, 100, 150, 200, 300][Math.floor(Math.random() * 5)]!;
  const clId = `CLORD-${1000 + seq}`;
  const ordId = `ORD-${9000 + seq}`;

  const msgType: "D" | "8" = isExec ? "8" : "D";
  const execType = isExec ? (Math.random() > 0.3 ? "2" : "1") : undefined;
  const ordStatus = isExec ? (execType === "2" ? "2" : "1") : "0";
  const cumQty = isExec ? (execType === "2" ? qty : Math.floor(qty / 2)) : 0;
  const leavesQty = qty - cumQty;

  const fields: Record<number, string | number> = {
    35: msgType,
    34: seq,
    49: "MM_GATEWAY_NSE",
    56: "INST_BROKER_42",
    52: time,
    11: clId,
    37: ordId,
    55: symbol,
    54: isBuy ? "1" : "2",
    38: qty,
    44: px,
    40: "2",
    39: ordStatus,
    14: cumQty,
    151: leavesQty,
  };

  if (isExec) {
    fields[17] = `EXEC-${seq + 8000}`;
    fields[150] = execType!;
    fields[31] = px;
    fields[32] = cumQty;
  }

  const raw = serializeFixMessage(fields);
  const hash = computeFixStreamHash(prevHash, seq, raw);

  return {
    seqNum: seq,
    sendingTime: time,
    msgType,
    msgTypeName: msgType === "D" ? "NewOrderSingle" : "ExecutionReport",
    clOrdId: clId,
    orderId: ordId,
    execId: isExec ? `EXEC-${seq + 8000}` : undefined,
    execType,
    ordStatus,
    symbol,
    side: isBuy ? "1" : "2",
    price: px,
    orderQty: qty,
    cumQty,
    leavesQty,
    lastPx: isExec ? px : undefined,
    lastQty: isExec ? cumQty : undefined,
    rawString: raw,
    sha256Hash: hash,
  };
}

// 5. Generate SEBI Form TR-8 Drop-Copy Regulatory Audit Certificate
export function generateSebiDropCopyAuditJson(stream: FixRawMessage[], symbol: string) {
  const latestHash = stream.length > 0 ? stream[stream.length - 1]!.sha256Hash : "NONE";
  return {
    sebiForm: "SEBI Schedule V Form TR-8",
    clearingBroker: "MarketMaster Institutional Clearing Gate 42",
    symbol,
    timestampUtc: new Date().toISOString(),
    totalMessagesProcessed: stream.length,
    finalStreamHashSha256: latestHash,
    complianceStatus: "VERIFIED_AUDITABLE",
    auditHashChain: stream.slice(-10).map((m) => ({
      seq: m.seqNum,
      time: m.sendingTime,
      type: m.msgTypeName,
      hash: m.sha256Hash,
    })),
  };
}
