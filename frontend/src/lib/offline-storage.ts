/**
 * IndexedDB Local Storage Manager for MarketMaster Offline Replay Terminal (PIP Part 3.3)
 * Provides offline storage for:
 * 1. Historical 1-minute candle datasets (Nifty 50, Bank Nifty, Breakout setups)
 * 2. Offline replay sessions & trades
 * 3. Offline SM-2 review sync queue
 */

export interface OfflineCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OfflineDataset {
  symbol: string;
  name: string;
  timeframe: string;
  candleCount: number;
  updatedAt: number;
  candles: OfflineCandle[];
}

export interface OfflineReplayRun {
  id: string;
  presetId: string;
  assetSymbol: string;
  pnl: number;
  maxDrawdown: number;
  calmarRatio: number;
  disciplineScore: number;
  completedAt: number;
  synced: boolean;
}

const DB_NAME = 'marketmaster_offline_store';
const DB_VERSION = 1;

export const STORES = {
  DATASETS: 'historical_datasets',
  RUNS: 'offline_replay_runs',
  SYNC_QUEUE: 'offline_sync_queue',
} as const;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported or running in SSR'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.DATASETS)) {
        db.createObjectStore(STORES.DATASETS, { keyPath: 'symbol' });
      }
      if (!db.objectStoreNames.contains(STORES.RUNS)) {
        const runStore = db.createObjectStore(STORES.RUNS, { keyPath: 'id' });
        runStore.createIndex('synced', 'synced', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves or updates a historical candle dataset in IndexedDB
 */
export async function saveOfflineDataset(dataset: OfflineDataset): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DATASETS, 'readwrite');
    const store = tx.objectStore(STORES.DATASETS);
    const req = store.put(dataset);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves a historical candle dataset by symbol
 */
export async function getOfflineDataset(symbol: string): Promise<OfflineDataset | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DATASETS, 'readonly');
    const store = tx.objectStore(STORES.DATASETS);
    const req = store.get(symbol);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Lists all stored datasets available offline
 */
export async function listOfflineDatasets(): Promise<{ symbol: string; name: string; candleCount: number }[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.DATASETS, 'readonly');
    const store = tx.objectStore(STORES.DATASETS);
    const req = store.getAll();
    req.onsuccess = () => {
      const items: OfflineDataset[] = req.result || [];
      resolve(
        items.map((item) => ({
          symbol: item.symbol,
          name: item.name,
          candleCount: item.candleCount,
        }))
      );
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Saves an offline completed replay session
 */
export async function recordOfflineReplayRun(run: Omit<OfflineReplayRun, 'id' | 'synced'>): Promise<string> {
  const db = await openDB();
  const id = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const record: OfflineReplayRun = {
    ...run,
    id,
    synced: false,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RUNS, 'readwrite');
    const store = tx.objectStore(STORES.RUNS);
    const req = store.put(record);
    req.onsuccess = () => resolve(id);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Fetches unsynced offline replay runs
 */
export async function getPendingOfflineRuns(): Promise<OfflineReplayRun[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RUNS, 'readonly');
    const store = tx.objectStore(STORES.RUNS);
    const req = store.getAll();
    req.onsuccess = () => {
      const items: OfflineReplayRun[] = req.result || [];
      resolve(items.filter((i) => !i.synced));
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Marks offline runs as synced after network reconnection
 */
export async function markOfflineRunsSynced(runIds: string[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RUNS, 'readwrite');
    const store = tx.objectStore(STORES.RUNS);
    let count = 0;
    if (runIds.length === 0) {
      resolve();
      return;
    }

    runIds.forEach((id) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (getReq.result) {
          const updated = { ...getReq.result, synced: true };
          store.put(updated);
        }
        count++;
        if (count === runIds.length) {
          resolve();
        }
      };
      getReq.onerror = () => reject(getReq.error);
    });
  });
}

/**
 * Default offline dataset initializer for Nifty 50 and Bank Nifty break-outs
 */
export function generateSyntheticDataset(
  symbol: string,
  name: string,
  initialPrice: number,
  bars: number = 375
): OfflineDataset {
  const candles: OfflineCandle[] = [];
  let price = initialPrice;
  const startTs = Date.now() - bars * 60 * 1000;

  for (let i = 0; i < bars; i++) {
    const u = (Math.random() - 0.495) * 0.0025; // mild drift
    const open = price;
    price = Math.round(price * (1 + u) * 100) / 100;
    const high = Math.round(Math.max(open, price) * (1 + Math.random() * 0.0015) * 100) / 100;
    const low = Math.round(Math.min(open, price) * (1 - Math.random() * 0.0015) * 100) / 100;
    const close = price;
    const volume = Math.round(15000 + Math.random() * 85000);

    candles.push({
      timestamp: startTs + i * 60 * 1000,
      open,
      high,
      low,
      close,
      volume,
    });
  }

  return {
    symbol,
    name,
    timeframe: '1m',
    candleCount: candles.length,
    updatedAt: Date.now(),
    candles,
  };
}
