import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Route } from "../routes/admin";
import { backendApi } from "../lib/api";

// Mock router link
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (config: any) => config,
  Link: ({ children, to, className }: any) => <a href={to} className={className}>{children}</a>,
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Mock auth hook with default super admin
vi.mock("../lib/auth", () => ({
  useAuth: () => ({
    user: {
      id: "usr-admin-01",
      email: "dyanndlee05@gmail.com",
      role: "admin",
      display_name: "Deepak Yannadle",
      virtual_equity: 1000000,
    },
    ready: true,
  }),
}));

// Mock backend API
vi.mock("../lib/api", () => ({
  backendApi: {
    getAdminUsers: vi.fn().mockResolvedValue([
      {
        id: "usr-01",
        name: "Test Admin",
        email: "dyanndlee05@gmail.com",
        role: "admin",
        virtualEquity: 1000000,
        disciplineScore: 100,
        status: "Active",
        joinedDate: "2026-10-01",
      },
      {
        id: "usr-02",
        name: "Trader Alpha",
        email: "trader@marketmaster.in",
        role: "user",
        virtualEquity: 950000,
        disciplineScore: 78,
        status: "Cool-Down",
        joinedDate: "2026-10-15",
      },
    ]),
    getAdminSystemStats: vi.fn().mockResolvedValue({
      rms_kill_switch_active: false,
      matching_engine_status: "ONLINE",
      total_capital_managed: 6374000,
    }),
    adjustUserBalance: vi.fn().mockResolvedValue({ status: "SUCCESS" }),
    toggleRmsKillSwitch: vi.fn().mockResolvedValue({ rms_kill_switch_active: true }),
  },
}));

describe("AdminConsole Component Automation Tests", () => {
  const Component = (Route as any).component;

  it("renders the Admin Console header and Super Admin badge", () => {
    render(<Component />);

    expect(screen.getByText(/Institutional Admin Console & RMS Oversight/i)).toBeInTheDocument();
    expect(screen.getByText(/Super Admin: dyanndlee05@gmail.com/i)).toBeInTheDocument();
  });

  it("displays administrative metric tiles: Capital, Engine Status, and Feed Telemetry", () => {
    render(<Component />);
    expect(screen.getByText(/TOTAL CAPITAL MANAGED/i)).toBeInTheDocument();
    expect(screen.getByText(/MATCHING ENGINE/i)).toBeInTheDocument();
    expect(screen.getByText(/FEED PROVIDER/i)).toBeInTheDocument();
    expect(screen.getByText(/DISCIPLINE AVERAGE/i)).toBeInTheDocument();
  });

  it("filters users by email and name in search bar", () => {
    render(<Component />);
    const searchInput = screen.getByPlaceholderText(/Search traders by email or name/i);
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "dyanndlee05" } });
    expect(screen.getAllByText(/dyanndlee05@gmail.com/i).length).toBeGreaterThan(0);
  });

  it("allows toggling the emergency RMS platform kill-switch", async () => {
    render(<Component />);

    const killSwitchBtn = screen.getByRole("button", { name: /Trigger Emergency Platform Kill-Switch/i });
    expect(killSwitchBtn).toBeInTheDocument();

    fireEvent.click(killSwitchBtn);
    expect(backendApi.toggleRmsKillSwitch).toHaveBeenCalledWith(true);
  });
});
