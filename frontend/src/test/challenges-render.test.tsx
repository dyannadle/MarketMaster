import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Route } from "@/routes/challenges";

describe("Challenges Route Component", () => {
  it("renders ChallengesAndGym component without throwing", () => {
    const Component = Route.options.component!;
    expect(Component).toBeDefined();
    expect(() => render(<Component />)).not.toThrow();
  });

  it("switches between Replay Gym and Daily Challenges Leaderboard tabs", () => {
    const Component = Route.options.component!;
    render(<Component />);
    
    // Check initial gym tab
    expect(screen.getByText(/Replay Gym & Simulator/i)).toBeInTheDocument();
    expect(screen.getByText(/Rated Mode \(Rule 4.3\)/i)).toBeInTheDocument();

    // Switch to Leaderboard tab
    const leaderboardTab = screen.getByText(/Daily Challenges & Leaderboard/i);
    fireEvent.click(leaderboardTab);

    // Verify daily setups section renders
    expect(screen.getByText(/Today's Curated Historical Setups/i)).toBeInTheDocument();
    expect(screen.getByText(/National Trader Leaderboard/i)).toBeInTheDocument();
  });
});
