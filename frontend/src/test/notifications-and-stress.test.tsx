import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  dispatchNotification,
  getStoredNotifications,
  markAsRead,
  clearAllNotifications,
  NotificationItem,
} from "@/lib/notifications";
import {
  calculateCrossMargin,
  simulatePortfolioStress,
  PRESET_STRESS_SCENARIOS,
  PositionSummary,
} from "@/lib/cross-margin-stress";

describe("Milestone 16: Notification Dispatcher & Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("mm_notifications_v1", JSON.stringify([]));
  });

  it("should dispatch and persist a new order fill notification", () => {
    const item = dispatchNotification({
      type: "ORDER_FILL",
      title: "Limit Order Executed",
      message: "BUY 50 NIFTY @ ₹24,500 filled via FIFO queue.",
      meta: { symbol: "NIFTY", qty: 50, price: 24500 },
    });

    expect(item.id).toBeDefined();
    expect(item.read).toBe(false);
    expect(item.type).toBe("ORDER_FILL");

    const all = getStoredNotifications();
    expect(all.length).toBeGreaterThan(0);
    expect(all[0]?.title).toBe("Limit Order Executed");
  });

  it("should mark notifications as read correctly", () => {
    const item1 = dispatchNotification({
      type: "RISK_ALERT",
      title: "Rule 4.3 Capital Guard",
      message: "Daily risk is ₹3,000.",
    });

    const item2 = dispatchNotification({
      type: "SM2_DUE",
      title: "Flashcard Review Due",
      message: "4 cards ready.",
    });

    expect(getStoredNotifications().filter((n) => !n.read).length).toBe(2);

    markAsRead(item1.id);
    const updated = getStoredNotifications();
    const found1 = updated.find((n) => n.id === item1.id);
    const found2 = updated.find((n) => n.id === item2.id);

    expect(found1?.read).toBe(true);
    expect(found2?.read).toBe(false);

    // Mark all as read
    markAsRead();
    expect(getStoredNotifications().filter((n) => !n.read).length).toBe(0);
  });

  it("should clear all notifications", () => {
    dispatchNotification({
      type: "TOURNAMENT",
      title: "Alpha Arena Live",
      message: "Round 1 commenced.",
    });
    expect(getStoredNotifications().length).toBeGreaterThan(0);

    clearAllNotifications();
    expect(getStoredNotifications().length).toBe(0);
  });
});

describe("Milestone 17: Multi-Asset Cross-Margin & Stress Testing Engine", () => {
  const samplePositions: PositionSummary[] = [
    {
      symbol: "RELIANCE",
      qty: 100,
      avg: 2900,
      ltp: 3000,
      assetClass: "EQUITY",
    },
    {
      symbol: "RELIANCE_FUT",
      qty: -100,
      avg: 3010,
      ltp: 3005,
      assetClass: "FUTURE",
    },
    {
      symbol: "NIFTY24500PE",
      qty: 50,
      avg: 120,
      ltp: 135,
      assetClass: "OPTION_PE",
      delta: -0.45,
      vega: 15,
    },
  ];

  it("should compute SEBI PRAN cross-margin relief on hedged positions", () => {
    const cash = 500000;
    const result = calculateCrossMargin(samplePositions, cash);

    expect(result.unhedgedMargin).toBeGreaterThan(0);
    expect(result.marginRelief).toBeGreaterThan(0);
    expect(result.reliefPercentage).toBeGreaterThan(0);
    expect(result.crossMarginRequired).toBeLessThan(result.unhedgedMargin);
    expect(result.isMarginDeficient).toBe(false);
    expect(result.hedgeBreakdown.length).toBeGreaterThanOrEqual(1);

    const cashFuturesHedge = result.hedgeBreakdown.find((h) =>
      h.category.includes("Cash-Futures")
    );
    expect(cashFuturesHedge).toBeDefined();
    expect(cashFuturesHedge?.reliefAmount).toBeGreaterThan(0);
  });

  it("should simulate macro shocks and evaluate Rule 4.3 drawdown limits", () => {
    const cash = 500000;
    const blackSwanShock = PRESET_STRESS_SCENARIOS.find((s) =>
      s.name.includes("Black Swan")
    )!;

    const stressRes = simulatePortfolioStress(samplePositions, cash, blackSwanShock);

    expect(stressRes.scenarioName).toBe(blackSwanShock.name);
    expect(stressRes.baselineEquity).toBeGreaterThan(0);
    expect(stressRes.stressedEquity).toBeDefined();
    expect(stressRes.portfolioGreeks.netDelta).toBeDefined();
    expect(stressRes.portfolioGreeks.netVega).toBeDefined();

    // Verify Rule 4.3 calculation
    expect(stressRes.rule43Threshold).toBe(stressRes.baselineEquity * 0.015);
    if (Math.abs(Math.min(0, stressRes.mtmImpact)) > stressRes.rule43Threshold) {
      expect(stressRes.rule43Breached).toBe(true);
    } else {
      expect(stressRes.rule43Breached).toBe(false);
    }
  });

  it("should handle empty positions gracefully", () => {
    const emptyMargin = calculateCrossMargin([], 100000);
    expect(emptyMargin.unhedgedMargin).toBe(0);
    expect(emptyMargin.crossMarginRequired).toBe(0);
    expect(emptyMargin.marginRelief).toBe(0);

    const emptyStress = simulatePortfolioStress([], 100000, PRESET_STRESS_SCENARIOS[0]!);
    expect(emptyStress.baselineEquity).toBe(100000);
    expect(emptyStress.mtmImpact).toBe(0);
    expect(emptyStress.rule43Breached).toBe(false);
  });
});
