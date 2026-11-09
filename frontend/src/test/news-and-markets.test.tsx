import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Route as NewsRoute } from "../routes/news";
import { Route as MarketsRoute } from "../routes/markets";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: any) => config,
  Link: ({ children, to, className }: any) => <a href={to} className={className}>{children}</a>,
}));

vi.mock("../lib/paper", () => ({
  useLivePrices: () => ({
    "NIFTY 50": { p: 24350, base: 24200 },
    "SENSEX": { p: 80120, base: 79800 },
    "RELIANCE": { p: 2945.5, base: 2920 },
    "TCS": { p: 4120.2, base: 4100 },
    "HDFCBANK": { p: 1688.4, base: 1675 },
    "INFY": { p: 1862.75, base: 1850 },
    "NIFTY FUT": { p: 24410, base: 24300 },
    "BANKNIFTY FUT": { p: 52180, base: 51900 },
    "USDINR": { p: 83.42, base: 83.35 },
    "EURINR": { p: 90.18, base: 90.10 },
    "GOLD": { p: 72450, base: 72100 },
    "CRUDEOIL": { p: 6520, base: 6480 },
    "NIFTYBEES": { p: 268.3, base: 265 },
    "GOLDBEES": { p: 62.1, base: 61.8 },
  }),
}));

describe("Live News Wire & Markets Exploration Tests", () => {
  describe("News Route & Live Wire", () => {
    it("renders the Live Indian Market Wire header and telemetries", () => {
      const Component = (NewsRoute as any).component;
      render(<Component />);

      expect(screen.getByText(/Live Indian Market Wire/i)).toBeInTheDocument();
      expect(screen.getByText(/Macro Sentiment/i)).toBeInTheDocument();
      expect(screen.getByText(/Wire Cadence/i)).toBeInTheDocument();
      expect(screen.getByText(/Open Trade Terminal/i)).toBeInTheDocument();
    });
  });

  describe("Markets Route & Segment Filtering", () => {
    it("renders simulated market instruments and segment pills", () => {
      const Component = (MarketsRoute as any).component;
      render(<Component />);

      expect(screen.getByText(/^Markets$/i)).toBeInTheDocument();
      expect(screen.getAllByText(/NIFTY 50/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/RELIANCE/i).length).toBeGreaterThan(0);

      // Click F&O filter
      const foButton = screen.getByRole("button", { name: "F&O" });
      fireEvent.click(foButton);
      expect(screen.getAllByText(/NIFTY FUT/i).length).toBeGreaterThan(0);
    });
  });
});
