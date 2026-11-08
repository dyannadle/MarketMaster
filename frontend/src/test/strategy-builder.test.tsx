import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { OptionsStrategyBuilder } from "@/components/trading/OptionsStrategyBuilder";

// Mock Recharts ResponsiveContainer to render children in test DOM
vi.mock("recharts", async () => {
  const original = await vi.importActual("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  };
});

describe("OptionsStrategyBuilder Component", () => {
  it("renders Iron Condor by default with 4 legs and payoff summary", () => {
    const handleExecute = vi.fn();
    render(
      <OptionsStrategyBuilder
        underlyingSymbol="NIFTY_FUT"
        spotPrice={24500}
        lotSize={50}
        onExecuteStrategy={handleExecute}
      />
    );

    // Header & Pre-built buttons
    expect(screen.getByText(/Institutional Multi-Leg Strategy Builder/i)).toBeInTheDocument();
    expect(screen.getByText("Bull Call Spread")).toBeInTheDocument();
    expect(screen.getByText("Iron Condor")).toBeInTheDocument();

    // Strategy legs table
    expect(screen.getByText(/STRATEGY LEGS \(4\)/i)).toBeInTheDocument();

    // SEBI Margin Relief Banner
    expect(screen.getByText(/SEBI Multi-Leg Portfolio Margin Relief/i)).toBeInTheDocument();
    expect(screen.getByText(/Required Margin/i)).toBeInTheDocument();
  });

  it("switches to Bull Call Spread when 1-click preset is clicked", () => {
    const handleExecute = vi.fn();
    render(
      <OptionsStrategyBuilder
        underlyingSymbol="NIFTY_FUT"
        spotPrice={24500}
        lotSize={50}
        onExecuteStrategy={handleExecute}
      />
    );

    const bullCallBtn = screen.getByText("Bull Call Spread");
    fireEvent.click(bullCallBtn);

    // Bull Call spread has 2 legs
    expect(screen.getByText(/STRATEGY LEGS \(2\)/i)).toBeInTheDocument();
  });

  it("triggers onExecuteStrategy when Execute button is clicked", async () => {
    const handleExecute = vi.fn();
    render(
      <OptionsStrategyBuilder
        underlyingSymbol="NIFTY_FUT"
        spotPrice={24500}
        lotSize={50}
        onExecuteStrategy={handleExecute}
      />
    );

    const execBtn = screen.getByRole("button", { name: /Execute/i });
    await act(async () => {
      fireEvent.click(execBtn);
    });

    expect(handleExecute).toHaveBeenCalledTimes(1);
    expect(handleExecute).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: expect.any(String),
          side: expect.any(String),
          strike: expect.any(Number),
        }),
      ]),
      expect.any(Number)
    );
  });
});
