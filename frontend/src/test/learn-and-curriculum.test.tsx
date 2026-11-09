import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Route } from "../routes/learn.index";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: any) => config,
  Link: ({ children, to, className }: any) => <a href={to} className={className}>{children}</a>,
}));

describe("Learning Academy Curriculum Automated Tests", () => {
  const Component = (Route as any).component;

  it("renders Learning Academy header and level selector chips", () => {
    render(<Component />);

    expect(screen.getByText(/Learning Academy/i)).toBeInTheDocument();
    expect(screen.getByText(/All levels/i)).toBeInTheDocument();
    expect(screen.getByText(/L0 · Financial Literacy/i)).toBeInTheDocument();
    expect(screen.getByText(/L3 · Trading & Derivatives/i)).toBeInTheDocument();
    expect(screen.getByText(/L4 · Risk, Quant & Algo/i)).toBeInTheDocument();
  });

  it("filters curriculum courses when a level chip is selected", () => {
    render(<Component />);

    const l4Chip = screen.getByText(/L4 · Risk, Quant & Algo/i);
    fireEvent.click(l4Chip);

    expect(screen.getByText(/Risk Management & RMS/i)).toBeInTheDocument();
    expect(screen.getByText(/Quantitative Finance/i)).toBeInTheDocument();
    expect(screen.getByText(/Algorithmic Trading Systems/i)).toBeInTheDocument();
    expect(screen.getByText(/Execution Algorithms/i)).toBeInTheDocument();
  });
});
