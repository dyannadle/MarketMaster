import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  getJournalTrades,
  saveJournalTrade,
  resetJournal,
  calculateBehavioralMistakes,
  detectRevengeTrading,
  recordLossEvent,
  checkCoolDownStatus,
  triggerCoolDown,
  cancelCoolDown,
  JournalTrade,
} from "@/lib/journal";
import { BehavioralMistakeHeatmap } from "@/components/trading/BehavioralMistakeHeatmap";
import { PostMortemModal, PostMortemData } from "@/components/trading/PostMortemModal";

describe("Behavioral Trade Journal & Psychology Engine", () => {
  beforeEach(() => {
    localStorage.clear();
    cancelCoolDown();
  });

  it("retrieves seed trades if localStorage is empty", () => {
    const trades = getJournalTrades();
    expect(trades.length).toBeGreaterThanOrEqual(5);
    expect(trades[0]!.tags).toBeDefined();
  });

  it("saves and persists a new trade with behavioral tags", () => {
    const testTrade: JournalTrade = {
      id: "test-001",
      timestamp: Date.now(),
      symbol: "NIFTY_FUT",
      side: "BUY",
      quantity: 50,
      entryPrice: 24500,
      exitPrice: 24600,
      realizedPnl: 5000,
      tags: ["#PlanAdhered"],
      notes: "Strictly executed VWAP bounce",
      stopLossUsed: true,
      targetUsed: true,
      disciplineScore: 95,
    };

    saveJournalTrade(testTrade);
    const stored = getJournalTrades();
    expect(stored.some((t) => t.id === "test-001")).toBe(true);
  });

  it("calculates behavioral mistake heatmap metrics and emotional leakage", () => {
    const mockTrades: JournalTrade[] = [
      {
        id: "1",
        timestamp: Date.now() - 50000,
        symbol: "NIFTY",
        side: "BUY",
        quantity: 50,
        entryPrice: 24500,
        exitPrice: 24650,
        realizedPnl: 7500,
        tags: ["#PlanAdhered"],
        notes: "Good trade",
        stopLossUsed: true,
        targetUsed: true,
        disciplineScore: 95,
      },
      {
        id: "2",
        timestamp: Date.now() - 40000,
        symbol: "NIFTY",
        side: "BUY",
        quantity: 100,
        entryPrice: 24650,
        exitPrice: 24550,
        realizedPnl: -10000,
        tags: ["#RevengeTrade", "#FOMOEntry"],
        notes: "Chased without setup",
        stopLossUsed: false,
        targetUsed: false,
        disciplineScore: 60,
      },
      {
        id: "3",
        timestamp: Date.now() - 20000,
        symbol: "BANKNIFTY",
        side: "SELL",
        quantity: 30,
        entryPrice: 52000,
        exitPrice: 52200,
        realizedPnl: -6000,
        tags: ["#MovedStopLoss"],
        notes: "Moved stop loss",
        stopLossUsed: true,
        targetUsed: true,
        disciplineScore: 65,
      },
    ];

    const report = calculateBehavioralMistakes(mockTrades);
    expect(report.totalTrades).toBe(3);
    expect(report.netPnl).toBe(-8500);
    expect(report.disciplinedPnl).toBe(7500);
    expect(report.disciplinedWinRatePct).toBe(100);
    expect(report.emotionalLossTax).toBe(16000); // 10000 + 6000
    expect(report.emotionalTradesCount).toBe(2);
    expect(report.topBehavioralLeak).toBeDefined();
    expect(report.coachingRecommendation).toBeDefined();
  });

  it("detects revenge trading (>= 2 losing market trades within 45 seconds of a loss)", () => {
    // 1st loss:
    const check1 = detectRevengeTrading(-5000, "MARKET");
    expect(check1.isRevenge).toBe(false);

    // 2nd loss within 45 seconds:
    const check2 = detectRevengeTrading(-4000, "MARKET");
    expect(check2.isRevenge).toBe(true);
    expect(check2.coolDownSeconds).toBe(180);

    // Verify cool-down status is active
    const status = checkCoolDownStatus();
    expect(status.isTriggered).toBe(true);
    expect(status.remainingSeconds).toBeGreaterThan(0);
  });

  it("does not trigger cool-down on profitable orders", () => {
    const check = detectRevengeTrading(3000, "MARKET");
    expect(check.isRevenge).toBe(false);
  });

  it("renders BehavioralMistakeHeatmap component cleanly", () => {
    render(<BehavioralMistakeHeatmap />);
    expect(screen.getByText(/Behavioral Mistake Heatmap/i)).toBeInTheDocument();
    expect(screen.getByText(/Disciplined Edge P&L/i)).toBeInTheDocument();
    expect(screen.getByText(/Emotional Leakage/i)).toBeInTheDocument();
  });

  it("renders PostMortemModal and allows tag selection & save", () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn();

    const postMortemData: PostMortemData = {
      symbol: "NIFTY_FUT",
      side: "BUY",
      quantity: 50,
      entryPrice: 24500,
      exitPrice: 24400,
      realizedPnl: -5000,
      disciplineScore: 68,
      disciplineDelta: -10,
      tags: ["#NoStopLoss"],
      stopLossUsed: false,
      targetUsed: false,
      isCoolDownTriggered: true,
    };

    render(
      <PostMortemModal
        isOpen={true}
        onClose={handleClose}
        data={postMortemData}
        onSave={handleSave}
      />
    );

    expect(screen.getByText(/Institutional Trade Post-Mortem/i)).toBeInTheDocument();
    expect(screen.getByText(/Psychological Cool-Down/i)).toBeInTheDocument();

    // Toggle a tag
    const fomoTag = screen.getByText("#FOMOEntry");
    fireEvent.click(fomoTag);

    // Click save
    const saveBtn = screen.getByText(/Save Journal & Continue/i);
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
