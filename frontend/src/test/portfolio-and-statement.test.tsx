import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Route } from "../routes/portfolio";
import { TradeStatementExporter } from "../components/trading/TradeStatementExporter";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: any) => config,
  Link: ({ children, to, className }: any) => <a href={to} className={className}>{children}</a>,
}));

vi.mock("../lib/paper", () => ({
  STARTING_CASH: 1000000,
  useAccount: () => ({
    acc: {
      cash: 950000,
      positions: [
        { symbol: "NIFTY_FUT", qty: 50, avg: 24200 },
        { symbol: "RELIANCE", qty: 100, avg: 1280 },
      ],
      orders: [],
    },
    reset: vi.fn(),
  }),
  useLivePrices: () => ({
    NIFTY_FUT: { p: 24300 },
    RELIANCE: { p: 1290 },
  }),
}));

describe("Portfolio & Trade Statement Exporter Tests", () => {
  it("renders portfolio overview, equity, exposure, and open positions", () => {
    const Component = (Route as any).component;
    render(<Component />);

    expect(screen.getByText(/Portfolio & Risk/i)).toBeInTheDocument();
    expect(screen.getByText(/Total equity/i)).toBeInTheDocument();
    expect(screen.getByText(/NIFTY_FUT/i)).toBeInTheDocument();
    expect(screen.getByText(/RELIANCE/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Export Statement \(CSV \/ PDF\)/i })).toBeInTheDocument();
  });

  it("renders TradeStatementExporter modal with audit summary and export buttons", async () => {
    const onClose = vi.fn();
    render(<TradeStatementExporter isOpen={true} onClose={onClose} />);

    expect(await screen.findByText(/SEBI-Compliant Trade Statement/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download CSV/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Print \/ PDF/i })).toBeInTheDocument();

    const closeBtn = screen.getByRole("button", { name: /Close Statement/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
