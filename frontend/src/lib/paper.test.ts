import { describe, expect, it } from "vitest";
import { applyOrder, STARTING_CASH, type Account } from "./paper";

const fresh = (): Account => ({ cash: STARTING_CASH, positions: [], orders: [] });

describe("paper trading", () => {
  it("starts with ₹10,00,000", () => expect(STARTING_CASH).toBe(1_000_000));
  it("rejects buys beyond available cash", () => {
    expect(applyOrder(fresh(), { symbol: "X", side: "BUY", qty: 1000, price: 2000, type: "MARKET" })).toBe("Insufficient virtual funds");
  });
  it("rejects selling more than held", () => {
    expect(applyOrder(fresh(), { symbol: "X", side: "SELL", qty: 1, price: 10, type: "MARKET" })).toBe("Not enough holdings to sell");
  });
  it("buy then sell returns cash", () => {
    const a = applyOrder(fresh(), { symbol: "X", side: "BUY", qty: 10, price: 100, type: "MARKET" }) as Account;
    expect(a.cash).toBe(STARTING_CASH - 1000);
    const b = applyOrder(a, { symbol: "X", side: "SELL", qty: 10, price: 110, type: "MARKET" }) as Account;
    expect(b.cash).toBe(STARTING_CASH + 100);
    expect(b.positions).toHaveLength(0);
  });
});
