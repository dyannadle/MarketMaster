import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { Route } from "@/routes/trade";

describe("Trade Route Component", () => {
  it("renders Trade component without throwing", () => {
    vi.spyOn(Route, "useSearch").mockReturnValue({ s: undefined } as any);
    const Component = Route.options.component!;
    expect(Component).toBeDefined();
    expect(() => render(<Component />)).not.toThrow();
  });

  it("handles corrupted or partial localStorage orders safely", () => {
    vi.spyOn(Route, "useSearch").mockReturnValue({ s: undefined } as any);
    localStorage.setItem(
      "mm-paper-account",
      JSON.stringify({
        cash: 1000000,
        positions: [{ symbol: "RELIANCE", qty: 10, avg: null }],
        orders: [
          { id: "1", symbol: "RELIANCE", side: "BUY", qty: 10, price: undefined, type: "MARKET" },
          { id: "2", symbol: "TCS", side: "SELL", qty: 5, price: null, type: "LIMIT" },
        ],
      })
    );
    const Component = Route.options.component!;
    expect(() => render(<Component />)).not.toThrow();
  });
});

