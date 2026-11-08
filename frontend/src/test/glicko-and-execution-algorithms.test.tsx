import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { calculateUpdatedRating, getRankFromRating, GlickoTrader } from "@/lib/glicko2";
import { InstitutionalExecutionAlgorithms } from "@/components/trading/InstitutionalExecutionAlgorithms";

// Mock Recharts ResponsiveContainer to render children in test DOM
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  };
});

describe("Glicko-2 Rating Engine & Ranks", () => {
  it("determines correct rank titles and tiers based on Elo rating", () => {
    expect(getRankFromRating(1200).title).toBe("Novice Scalper");
    expect(getRankFromRating(1500).title).toBe("Prop Desk Trainee");
    expect(getRankFromRating(1800).title).toBe("Senior Derivatives Trader");
    expect(getRankFromRating(2150).title).toBe("Macro Hedge Fund PM");
  });

  it("increases rating and reduces RD after a profitable, disciplined session", () => {
    const initialTrader: GlickoTrader = {
      rating: 1500,
      rd: 300,
      vol: 0.06,
      totalSessions: 5,
      bestRating: 1500,
      rankTitle: "Prop Desk Trainee",
    };

    const { updated, ratingDelta } = calculateUpdatedRating(
      initialTrader,
      25000, // +₹25,000 profit
      0.8,   // 80% win rate
      95,    // 95 discipline
      1600   // Benchmark difficulty
    );

    expect(ratingDelta).toBeGreaterThan(0);
    expect(updated.rating).toBeGreaterThan(1500);
    expect(updated.rd).toBeLessThan(300); // Uncertainty reduced
    expect(updated.totalSessions).toBe(6);
  });
});

describe("InstitutionalExecutionAlgorithms Component", () => {
  it("renders TWAP Slicer by default and allows switching to VWAP, Iceberg, and Arbitrage", () => {
    render(<InstitutionalExecutionAlgorithms />);

    expect(screen.getByText(/Institutional Execution Algorithms Suite/i)).toBeInTheDocument();
    expect(screen.getByText("TWAP Slicer")).toBeInTheDocument();
    expect(screen.getByText(/Market Impact Alpha/i)).toBeInTheDocument();

    // Switch to VWAP
    const vwapBtn = screen.getByText("VWAP Curve");
    fireEvent.click(vwapBtn);
    expect(screen.getByText(/Intraday Volume-Weighted Pacing/i)).toBeInTheDocument();

    // Switch to Iceberg
    const icebergBtn = screen.getByText("Iceberg Queue");
    fireEvent.click(icebergBtn);
    expect(screen.getByText(/Total Hidden Parent Order/i)).toBeInTheDocument();
    expect(screen.getByText(/SIMULATED LEVEL-2 DEPTH LADDER/i)).toBeInTheDocument();

    // Switch to Arbitrage
    const arbBtn = screen.getByText("Cash & Carry Arbitrage");
    fireEvent.click(arbBtn);
    expect(screen.getByText(/Cash-and-Carry Arbitrage Opportunity/i)).toBeInTheDocument();
    expect(screen.getByText(/Annualized APY/i)).toBeInTheDocument();
  });
});
