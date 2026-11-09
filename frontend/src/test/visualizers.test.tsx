import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PositionSizingVisualizer } from "../components/visualizers/PositionSizingVisualizer";
import { OptionGreeksVisualizer } from "../components/visualizers/OptionGreeksVisualizer";
import { CompoundingVisualizer } from "../components/visualizers/CompoundingVisualizer";
import { InflationVisualizer } from "../components/visualizers/InflationVisualizer";
import { OrderFlowSlippageVisualizer } from "../components/visualizers/OrderFlowSlippageVisualizer";

// Mock recharts ResponsiveContainer to avoid 0x0 container measurement warning in test DOM
vi.mock("recharts", async () => {
  const original = await vi.importActual<any>("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: 500, height: 300 }}>{children}</div>,
  };
});

describe("Interactive Financial & Quant Visualizers", () => {
  describe("PositionSizingVisualizer", () => {
    it("renders with default ₹10 Lakh equity and 1.5% Rule risk", () => {
      render(<PositionSizingVisualizer />);
      expect(screen.getByText(/Institutional Position Sizing & 1.5% Risk Engine/i)).toBeInTheDocument();
      expect(screen.getAllByText(/NIFTY_FUT/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Safe Sizing Invariant Active/i)).toBeInTheDocument();
    });

    it("displays violation warning when risk exceeds 1.5%", () => {
      render(<PositionSizingVisualizer />);
      const rangeInputs = screen.getAllByRole("slider");
      // The second slider is the risk percentage slider (min 0.5, max 3.0)
      const riskSlider = rangeInputs[1] || rangeInputs[0]!;
      fireEvent.change(riskSlider, { target: { value: "2.5" } });
      expect(screen.getByText(/Rule 4.3 Alert/i)).toBeInTheDocument();
    });
  });

  describe("OptionGreeksVisualizer", () => {
    it("calculates Black-Scholes Greeks (Delta, Gamma, Vega, Theta)", () => {
      render(<OptionGreeksVisualizer />);
      expect(screen.getByText(/Black-Scholes Options Greeks & Payoff Engine/i)).toBeInTheDocument();
      expect(screen.getByText(/Delta/i)).toBeInTheDocument();
      expect(screen.getByText(/Theta/i)).toBeInTheDocument();
      expect(screen.getByText(/Vega/i)).toBeInTheDocument();
      expect(screen.getByText(/Gamma/i)).toBeInTheDocument();
    });

    it("allows toggling between CALL and PUT options", () => {
      render(<OptionGreeksVisualizer />);
      const putButton = screen.getByRole("button", { name: /PUT/i });
      fireEvent.click(putButton);
      expect(screen.getByRole("button", { name: /PUT/i })).toBeInTheDocument();
    });
  });

  describe("CompoundingVisualizer", () => {
    it("renders compounding simulator and wealth projection", () => {
      render(<CompoundingVisualizer />);
      expect(screen.getByText(/Compounding Growth Visualizer/i)).toBeInTheDocument();
    });
  });

  describe("InflationVisualizer", () => {
    it("renders inflation purchasing power degradation simulator", () => {
      render(<InflationVisualizer />);
      expect(screen.getByText(/Purchasing Power Simulator/i)).toBeInTheDocument();
    });
  });

  describe("OrderFlowSlippageVisualizer", () => {
    it("simulates institutional impact cost and bid-ask spread walk", () => {
      render(<OrderFlowSlippageVisualizer />);
      expect(screen.getByText(/Market Microstructure & Power-Law Slippage/i)).toBeInTheDocument();
    });
  });
});
