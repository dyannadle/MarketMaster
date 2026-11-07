import { useEffect, useState, useCallback } from "react";
import { instruments } from "./data";

export type Position = { symbol: string; qty: number; avg: number };
export type Order = { id: string; symbol: string; side: "BUY" | "SELL"; qty: number; price: number; type: string; time: number };
export type Account = { cash: number; positions: Position[]; orders: Order[] };

export const STARTING_CASH = 1_000_000;
const KEY = "mm-paper-account";
const fresh = (): Account => ({ cash: STARTING_CASH, positions: [], orders: [] });

/** Pure order application — returns new account or an error string. */
export function applyOrder(acc: Account, o: Omit<Order, "id" | "time">): Account | string {
  if (o.qty <= 0) return "Quantity must be positive";
  const cost = o.qty * o.price;
  const pos = acc.positions.find((p) => p.symbol === o.symbol);
  let positions = acc.positions.filter((p) => p.symbol !== o.symbol);
  let cash = acc.cash;
  if (o.side === "BUY") {
    if (cost > cash) return "Insufficient virtual funds";
    cash -= cost;
    const qty = (pos?.qty ?? 0) + o.qty;
    const avg = ((pos?.qty ?? 0) * (pos?.avg ?? 0) + cost) / qty;
    positions.push({ symbol: o.symbol, qty, avg });
  } else {
    if (!pos || pos.qty < o.qty) return "Not enough holdings to sell";
    cash += cost;
    if (pos.qty > o.qty) positions.push({ ...pos, qty: pos.qty - o.qty });
  }
  const order: Order = { ...o, id: crypto.randomUUID(), time: Date.now() };
  return { cash, positions, orders: [order, ...acc.orders].slice(0, 100) };
}

export function useAccount() {
  const [acc, setAcc] = useState<Account>(fresh);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setAcc(JSON.parse(raw));
    } catch {}
  }, []);
  const save = useCallback((a: Account) => {
    setAcc(a);
    localStorage.setItem(KEY, JSON.stringify(a));
  }, []);
  const reset = () => save(fresh());
  return { acc, save, reset };
}

/** Simulated live prices ticking every second. */
export function useLivePrices() {
  const [prices, setPrices] = useState<Record<string, { p: number; base: number }>>(() =>
    Object.fromEntries(instruments.map((i) => [i.symbol, { p: i.price, base: i.price }])),
  );
  useEffect(() => {
    const id = setInterval(() => {
      setPrices((prev) => {
        const next: typeof prev = {};
        for (const [k, v] of Object.entries(prev)) {
          const p = v.p * (1 + (Math.random() - 0.5) * 0.002);
          next[k] = { p: +p.toFixed(2), base: v.base };
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return prices;
}
