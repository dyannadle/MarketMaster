import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { Route } from "@/routes/challenges";

describe("Challenges Route Component", () => {
  it("renders ChallengesAndGym component without throwing", () => {
    const Component = Route.options.component!;
    expect(Component).toBeDefined();
    expect(() => render(<Component />)).not.toThrow();
  });
});
