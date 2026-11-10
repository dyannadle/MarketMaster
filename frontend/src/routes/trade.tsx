import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { ShieldAlert, Zap, ArrowDownUp, RefreshCw, Layers, LineChart as ChartIcon, HeartPulse, Radio, Newspaper, FileSpreadsheet, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Change } from "@/components/AppShell";
import { inr, instruments } from "@/lib/data";
import { applyOrder, useAccount, useLivePrices } from "@/lib/paper";
import { backendApi } from "@/lib/api";
import { CandlestickChart } from "@/components/trading/CandlestickChart";
import { PostMortemModal, PostMortemData } from "@/components/trading/PostMortemModal";
import { OptionsChainMatrix, SelectedOptionStrike } from "@/components/trading/OptionsChainMatrix";
import { OptionsStrategyBuilder, StrategyLeg } from "@/components/trading/OptionsStrategyBuilder";
import { LiveNewsFeed } from "@/components/trading/LiveNewsFeed";
import { nativeBridge } from "@/lib/native";
import { TradeStatementExporter } from "@/components/trading/TradeStatementExporter";
import { checkCoolDownStatus, detectRevengeTrading } from "@/lib/journal";

export const Route = createFileRoute("/trade")({
  validateSearch: (s: Record<string, unknown>): { s?: string | undefined } => ({
    s: typeof s["s"] === "string" ? s["s"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Paper Trading Terminal — MarketMaster" },
      { name: "description", content: "Place simulated market and limit orders with ₹10 lakh virtual capital." },
      { property: "og:title", content: "Paper Trading Terminal — MarketMaster" },
      { property: "og:description", content: "Realistic order entry, positions and order book — zero real money." },
    ],
  }),
  component: Trade,
});

const tradable = instruments.filter((i) => i.segment !== "Index");

function Trade() {
  const { s } = Route.useSearch();
  const prices = useLivePrices();
  const { acc, save } = useAccount();
  const [sym, setSym] = useState(s && tradable.some((t) => t.symbol === s) ? s : tradable[0]!.symbol);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [type, setType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [lots, setLots] = useState(1);
  const [limit, setLimit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendPositions, setBackendPositions] = useState<any[]>([]);

  // Navigation View Toggle: Candlestick Chart vs Options Chain Matrix vs Strategy Builder vs Live News Wire
  const [terminalView, setTerminalView] = useState<"CHART" | "OPTIONS_CHAIN" | "STRATEGY_BUILDER" | "NEWS_WIRE">("CHART");
  const [marketQuotes, setMarketQuotes] = useState<any[]>([]);

  // Multi-Leg Strategy Execution Handler
  const handleExecuteStrategy = async (strategyLegs: StrategyLeg[], marginRequired: number) => {
    let successCount = 0;
    for (const leg of strategyLegs) {
      const legSymbol = `${sym}_${leg.strike}_${leg.type === "CALL" ? "CE" : "PE"}`;
      const legQty = leg.lots * (inst.lot || 50);

      try {
        await backendApi.placeOrder({
          symbol: legSymbol,
          side: leg.side,
          quantity: legQty,
          orderType: "MARKET",
        });
        successCount++;
      } catch {
        // Local paper fallback
        const r = applyOrder(acc, {
          symbol: legSymbol,
          side: leg.side,
          qty: legQty,
          price: leg.premium,
          type: "MARKET",
        });
        if (typeof r !== "string") {
          save(r);
          successCount++;
        }
      }
    }

    await refreshPositions();
    nativeBridge.vibrateFill();
  };

  // Post-Mortem & Psychological Diagnostics State
  const [postMortemData, setPostMortemData] = useState<PostMortemData | null>(null);
  const [isPostMortemOpen, setIsPostMortemOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [disciplineScore, setDisciplineScore] = useState(85);

  // Cool-Down Breathing Mode (Discipline < 70)
  const [isCoolDownActive, setIsCoolDownActive] = useState(false);
  const [coolDownRemaining, setCoolDownRemaining] = useState(0);

  const inst = tradable.find((t) => t.symbol === sym) || tradable[0]!;
  const q = prices[sym] || { p: 24500, base: 24450 };

  // Check persistent cool-down status on mount
  useEffect(() => {
    const status = checkCoolDownStatus();
    if (status.isTriggered && status.remainingSeconds > 0) {
      setIsCoolDownActive(true);
      setCoolDownRemaining(status.remainingSeconds);
    }
  }, []);

  // Cool-Down Timer Ticker
  useEffect(() => {
    if (!isCoolDownActive || coolDownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCoolDownRemaining((prev) => {
        if (prev <= 1) {
          setIsCoolDownActive(false);
          toast.info("Cool-down finished. You may resume trading with calm focus.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isCoolDownActive, coolDownRemaining]);

  // Fetch backend positions
  const refreshPositions = async () => {
    try {
      const pos = await backendApi.getPositions();
      if (Array.isArray(pos)) setBackendPositions(pos.filter((p) => p.is_open));
    } catch {
      // Local fallback
    }
  };

  useEffect(() => {
    refreshPositions();

    // Fetch live market quotes from Yahoo Finance backend every 5 seconds
    const fetchQuotes = async () => {
      try {
        const res = await backendApi.getMarketQuotes([
          "^NSEI", "^NSEBANK", "RELIANCE.NS", "HDFCBANK.NS", "TCS.NS", "INFY.NS", "ICICIBANK.NS", "GC=F"
        ]);
        if (res && res.quotes) {
          setMarketQuotes(res.quotes);
        }
      } catch {
        // Fallback handled by local prices
      }
    };

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 5000);
    return () => clearInterval(interval);
  }, []);

  const qty = lots * inst.lot;
  const px = type === "LIMIT" && Number(limit) > 0 ? Number(limit) : q.p;

  // Real-time Level-2 Microstructure and Power-Law Slippage Calculations
  const { slippagePts, estimatedFillPrice, marginRequired, taxes } = useMemo(() => {
    const baseDepth = 2500.0;
    const ratio = Math.max(qty / baseDepth, 0.001);
    const slipPct = 0.0005 * Math.pow(ratio, 0.6);
    const pts = Math.round(q.p * slipPct * 100) / 100;
    const estFill = side === "BUY" ? q.p + pts : q.p - pts;

    const turnover = qty * estFill;
    const margin = Math.round(turnover * 0.10);
    const stt = side === "SELL" ? turnover * 0.000125 : 0.0;
    const stampDuty = side === "BUY" ? turnover * 0.00002 : 0.0;
    const exchangeCharge = turnover * 0.000019;
    const gst = exchangeCharge * 0.18;
    const totalTax = stt + stampDuty + exchangeCharge + gst;

    return {
      slippagePts: pts,
      estimatedFillPrice: estFill,
      marginRequired: margin,
      taxes: { stt, stampDuty, exchangeCharge, gst, totalTax },
    };
  }, [qty, side, q.p]);

  // Simulated Level-2 Depth Book
  const book = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      bid: q.p * (1 - 0.0003 * (i + 1)),
      ask: q.p * (1 + 0.0003 * (i + 1)),
      qb: 100 + ((i * 37) % 90) * 7,
      qa: 120 + ((i * 53) % 80) * 6,
    }));
  }, [q.p]);

  // Execute Order
  const place = async () => {
    if (isCoolDownActive) {
      toast.error(`Cool-Down Mode Active! Please wait ${formatTime(coolDownRemaining)} before trading.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const backendRes = await backendApi.placeOrder({
        symbol: sym,
        side,
        quantity: qty,
        orderType: type,
        limitPrice: type === "LIMIT" && Number(limit) > 0 ? Number(limit) : undefined,
        stopLoss: Number(stopLoss) > 0 ? Number(stopLoss) : undefined,
        targetPrice: Number(targetPrice) > 0 ? Number(targetPrice) : undefined,
      });

      const fill = backendRes?.fill_price != null ? backendRes.fill_price : estimatedFillPrice;
      const slip = backendRes?.slippage != null ? backendRes.slippage : slippagePts;
      toast.success(
        `${side} ${qty} ${sym} filled @ ₹${Number(fill).toFixed(2)} (Slippage: ₹${Number(slip).toFixed(2)})`
      );
      nativeBridge.vibrateFill();
      await refreshPositions();
    } catch {
      // Offline fallback: Use local paper engine
      const r = applyOrder(acc, { symbol: sym, side, qty, price: estimatedFillPrice, type });
      if (typeof r === "string") {
        toast.error(r);
      } else {
        save(r);
        toast.success(
          `${side} ${qty} ${sym} @ ₹${estimatedFillPrice.toFixed(2)} executed (Simulated matching engine)`
        );
        nativeBridge.vibrateFill();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Exit Open Position with Automated Post-Mortem Diagnostics
  const handleExit = async (posId: string, posSymbol?: string, posAvgPrice?: number, posQty?: number) => {
    let exitData: any = null;
    const currentLtp = prices[posSymbol || sym]?.p || q.p;

    try {
      const res = await backendApi.exitPosition(posId, currentLtp);
      exitData = res;
      toast.success("Position closed at market price.");
      await refreshPositions();
    } catch {
      // Local fallback calculation
      const avg = posAvgPrice || q.base || 24500;
      const quantity = posQty || inst.lot || 50;
      const pnl = (currentLtp - avg) * quantity;

      // Update local paper account to remove closed position and credit cash
      const targetSymbol = posSymbol || sym;
      const updatedPositions = acc.positions.filter((p) => p.symbol !== targetSymbol);
      save({
        ...acc,
        positions: updatedPositions,
        cash: acc.cash + (currentLtp * quantity),
      });

      exitData = {
        position_id: posId,
        symbol: targetSymbol,
        exit_price: currentLtp,
        realized_pnl: pnl,
        discipline_score: pnl < 0 && !stopLoss ? Math.max(0, disciplineScore - 10) : Math.min(100, disciplineScore + 3),
        post_mortem: {
          tags: pnl < 0
            ? stopLoss ? ["#ControlledRisk", "#PlanAdhered"] : ["#NoStopLoss", "#RevengeRisk"]
            : ["#ProfitableExit", "#TargetAchieved"],
        },
      };
    }

    if (exitData) {
      const pnl = exitData.realized_pnl;
      const isLoss = pnl < 0;
      const newScore = exitData.discipline_score ?? 85;

      // Check Rule 4.3 Revenge Trading & Cool-Down Invariants
      const revengeCheck = detectRevengeTrading(pnl, type);
      const isCoolDown = newScore < 70 || revengeCheck.isRevenge;

      setDisciplineScore(newScore);

      if (isCoolDown) {
        setIsCoolDownActive(true);
        setCoolDownRemaining(revengeCheck.coolDownSeconds || 180);
        if (revengeCheck.isRevenge) {
          toast.warning("Revenge trading detected (>= 2 losing market orders within 45s of stop-out)! Mandatory 3-minute cool-down breathing reset activated.");
        } else {
          toast.warning("Discipline dropped below 70! Mandatory 3-minute cool-down breathing mode activated.");
        }
      }

      const assignedTags = revengeCheck.isRevenge
        ? ["#RevengeTrade", "#FOMOEntry"]
        : isLoss
        ? stopLoss
          ? ["#PlanAdhered"]
          : ["#MovedStopLoss", "#RevengeTrade"]
        : ["#PlanAdhered"];

      setPostMortemData({
        symbol: exitData.symbol || sym,
        side: "BUY",
        quantity: posQty || qty,
        entryPrice: posAvgPrice || px,
        exitPrice: exitData.exit_price || currentLtp,
        realizedPnl: pnl,
        disciplineScore: newScore,
        disciplineDelta: isLoss ? -10 : +5,
        tags: assignedTags,
        stopLossUsed: Boolean(stopLoss),
        targetUsed: Boolean(targetPrice),
        isCoolDownTriggered: isCoolDown,
      });
      setIsPostMortemOpen(true);
    }
  };

  // One-Click Options Strike Selection Handler
  const handleSelectOptionStrike = (opt: SelectedOptionStrike) => {
    setSym(opt.symbol);
    setSide("BUY");
    setType("LIMIT");
    setLimit(opt.ltp.toFixed(2));
    setLots(1);
    toast.info(`Selected ${opt.type} strike ${opt.strike} @ ₹${opt.ltp}. Order ticket populated.`);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Live Yahoo Finance Market Ticker Tape */}
      <div className="overflow-x-auto rounded-xl border border-border/80 bg-card/60 p-2.5 shadow-sm">
        <div className="flex items-center gap-4 min-w-max text-xs">
          <div className="flex items-center gap-1.5 border-r border-border/60 pr-3 font-bold text-foreground">
            <Radio className="size-3 text-gain animate-pulse" />
            <span className="text-[11px] uppercase tracking-wider text-primary">Live Ticker (Yahoo Finance)</span>
          </div>

          {(marketQuotes.length > 0 ? marketQuotes : [
            { symbol: "^NSEI", name: "NIFTY 50", price: 24200.0, change: 124.5, change_percent: 0.52 },
            { symbol: "^NSEBANK", name: "BANK NIFTY", price: 51800.0, change: -180.2, change_percent: -0.35 },
            { symbol: "RELIANCE.NS", name: "RELIANCE", price: 1280.0, change: 14.2, change_percent: 1.12 },
            { symbol: "HDFCBANK.NS", name: "HDFC BANK", price: 1740.0, change: 8.5, change_percent: 0.49 },
            { symbol: "TCS.NS", name: "TCS", price: 4120.0, change: -22.0, change_percent: -0.53 },
            { symbol: "INFY.NS", name: "INFOSYS", price: 1860.0, change: 12.8, change_percent: 0.69 },
            { symbol: "ICICIBANK.NS", name: "ICICI BANK", price: 1260.0, change: 6.4, change_percent: 0.51 },
            { symbol: "GC=F", name: "GOLD (MCX)", price: 78200.0, change: 350.0, change_percent: 0.45 },
          ]).map((quote) => {
            const isPos = quote.change >= 0;
            const isSelected = sym.includes(quote.symbol.replace(".NS", "").replace("^", ""));
            return (
              <button
                key={quote.symbol}
                onClick={() => {
                  const match = tradable.find((t) => t.symbol.includes(quote.symbol.replace(".NS", "").replace("^", "")));
                  if (match) setSym(match.symbol);
                }}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1 transition-all ${
                  isSelected ? "bg-primary/15 border border-primary/40 font-bold" : "hover:bg-accent/40"
                }`}
              >
                <span className="font-bold text-foreground">{quote.name || quote.symbol}</span>
                <span className="font-mono text-muted-foreground">₹{Number(quote.price).toLocaleString("en-IN", { maximumFractionDigits: 1 })}</span>
                <span className={`font-mono text-[11px] font-semibold ${isPos ? "text-gain" : "text-loss"}`}>
                  {isPos ? "+" : ""}{quote.change_percent ? quote.change_percent.toFixed(2) : "0.00"}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr_340px]">
        {/* 1. Watchlist */}
        <div className="rounded-xl border border-border/80 bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border/40 p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>MARKET WATCH</span>
            <span className="text-[10px] text-primary">{tradable.length} ASSETS</span>
          </div>
          <ul className="max-h-[75vh] overflow-y-auto divide-y divide-border/30">
            {tradable.map((t) => {
              const p = prices[t.symbol] || { p: 0, base: 1 };
              const chg = ((p.p - p.base) / p.base) * 100;
              return (
                <li key={t.symbol}>
                  <button
                    onClick={() => setSym(t.symbol)}
                    className={`flex w-full justify-between px-3 py-2.5 text-left text-sm transition-colors ${
                      t.symbol === sym ? "bg-accent font-semibold" : "hover:bg-accent/40"
                    }`}
                  >
                    <div>
                      <span className="block text-foreground">{t.symbol}</span>
                      <span className="text-[10px] text-muted-foreground">{t.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="num block font-mono text-xs">{p.p.toLocaleString("en-IN")}</span>
                      <Change v={chg} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 2. Main Stage: View Switcher, Candlesticks / Options Chain / News Wire, Positions & History */}
        <div className="space-y-4">
          {/* Top View Selector Bar */}
          <div className="flex items-center justify-between rounded-xl border border-border/80 bg-card p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTerminalView("CHART")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  terminalView === "CHART" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <ChartIcon className="h-3.5 w-3.5" /> Candlestick Terminal
              </button>
              <button
                onClick={() => setTerminalView("OPTIONS_CHAIN")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  terminalView === "OPTIONS_CHAIN" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> Options Chain Matrix
              </button>
              <button
                onClick={() => setTerminalView("STRATEGY_BUILDER")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  terminalView === "STRATEGY_BUILDER" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" /> Strategy Builder & Payoff
              </button>
              <button
                onClick={() => setTerminalView("NEWS_WIRE")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  terminalView === "NEWS_WIRE" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Newspaper className="h-3.5 w-3.5" /> Market News Wire
              </button>
            </div>

          <div className="flex items-center gap-3">
            {/* Discipline Score Tag */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Discipline:</span>
              <span className={`num font-bold ${disciplineScore >= 80 ? "text-gain" : disciplineScore >= 70 ? "text-amber-400" : "text-loss"}`}>
                {disciplineScore}/100
              </span>
            </div>

            {/* Cool-Down Indicator */}
            {isCoolDownActive && (
              <span className="flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold text-rose-400 animate-pulse">
                <HeartPulse className="h-3 w-3" /> Cool-Down ({formatTime(coolDownRemaining)})
              </span>
            )}
          </div>
        </div>

        {/* View Switch: Candlesticks vs Options Chain */}
        {terminalView === "CHART" ? (
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black tracking-tight">{sym}</h1>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                    {inst.segment}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {inst.name} · {inst.exchange} · Lot Size: {inst.lot}
                </p>
              </div>
              <div className="text-right">
                <span className="num text-2xl font-black text-foreground">{q.p.toLocaleString("en-IN")}</span>
                <div className="mt-0.5">
                  <Change v={((q.p - q.base) / q.base) * 100} />
                </div>
              </div>
            </div>

            <CandlestickChart symbol={sym} currentPrice={q.p} basePrice={q.base} />
          </div>
        ) : terminalView === "OPTIONS_CHAIN" ? (
          <OptionsChainMatrix
            underlyingSymbol={sym}
            spotPrice={q.p}
            onSelectOption={handleSelectOptionStrike}
            onOpenStrategyBuilder={() => setTerminalView("STRATEGY_BUILDER")}
          />
        ) : terminalView === "STRATEGY_BUILDER" ? (
          <OptionsStrategyBuilder
            underlyingSymbol={sym}
            spotPrice={q.p}
            lotSize={inst.lot || 50}
            onExecuteStrategy={handleExecuteStrategy}
          />
        ) : (
          <LiveNewsFeed />
        )}

        {/* Live Positions Telemetry */}
        <div className="rounded-xl border border-border/80 bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border/40 p-3 text-xs font-semibold text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" /> OPEN POSITIONS
            </span>
            <button onClick={refreshPositions} className="hover:text-foreground">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {backendPositions.length === 0 && acc.positions.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">No active positions. Place a trade to open a simulated position.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-muted-foreground">
                    <th className="p-2.5 text-left">Symbol</th>
                    <th className="p-2.5 text-left">Side</th>
                    <th className="p-2.5 text-right">Qty</th>
                    <th className="p-2.5 text-right">Avg Price</th>
                    <th className="p-2.5 text-right">LTP</th>
                    <th className="p-2.5 text-right">P&L</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20 font-mono">
                  {/* Backend Open Positions */}
                  {backendPositions.map((pos) => {
                    const avg = Number(pos.avg_entry_price || 0);
                    const ltp = Number(prices[pos.symbol]?.p || avg);
                    const qty = Number(pos.quantity || 0);
                    const pnl = pos.side === "LONG"
                      ? (ltp - avg) * qty
                      : (avg - ltp) * qty;
                    return (
                      <tr key={pos.id} className="hover:bg-accent/30">
                        <td className="p-2.5 font-sans font-bold">{pos.symbol}</td>
                        <td className={`p-2.5 font-bold ${pos.side === "LONG" ? "text-gain" : "text-loss"}`}>{pos.side}</td>
                        <td className="p-2.5 text-right">{qty}</td>
                        <td className="p-2.5 text-right">₹{avg.toFixed(2)}</td>
                        <td className="p-2.5 text-right">₹{ltp.toFixed(2)}</td>
                        <td className={`p-2.5 text-right font-bold ${pnl >= 0 ? "text-gain" : "text-loss"}`}>
                          {pnl >= 0 ? "+" : ""}{inr(pnl)}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleExit(pos.id, pos.symbol, avg, qty)}
                            className="rounded bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-rose-400 hover:bg-destructive/20"
                          >
                            Exit
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Local Paper Fallback Positions */}
                  {backendPositions.length === 0 &&
                    acc.positions.map((pos) => {
                      const avg = Number(pos.avg ?? (pos as any).price ?? (prices[pos.symbol]?.base || 24500));
                      const ltp = Number(prices[pos.symbol]?.p ?? avg);
                      const qty = Number(pos.qty || 0);
                      const pnl = (ltp - avg) * qty;
                      return (
                        <tr key={pos.symbol} className="hover:bg-accent/30">
                          <td className="p-2.5 font-sans font-bold">{pos.symbol}</td>
                          <td className="p-2.5 font-bold text-gain">BUY</td>
                          <td className="p-2.5 text-right">{qty}</td>
                          <td className="p-2.5 text-right">₹{avg.toFixed(2)}</td>
                          <td className="p-2.5 text-right">₹{ltp.toFixed(2)}</td>
                          <td className={`p-2.5 text-right font-bold ${pnl >= 0 ? "text-gain" : "text-loss"}`}>
                            {pnl >= 0 ? "+" : ""}{inr(pnl)}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => handleExit(`local_${pos.symbol}`, pos.symbol, avg, qty)}
                              className="rounded bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-rose-400 hover:bg-destructive/20"
                            >
                              Exit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audited Order Trail */}
        <div className="rounded-xl border border-border/80 bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border/40 p-3 text-xs font-semibold text-muted-foreground">
            <span className="uppercase tracking-wider">AUDITED ORDER TRAIL</span>
            <button
              onClick={() => setIsStatementOpen(true)}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline font-bold transition-all"
            >
              <FileSpreadsheet className="size-3.5" /> Export Statement
            </button>
          </div>
          {acc.orders.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">No recent orders recorded.</p>
          ) : (
            <table className="w-full text-xs">
              <tbody className="divide-y divide-border/20 font-mono">
                {acc.orders.slice(0, 6).map((o) => {
                  const orderPx = Number(o.price ?? 0);
                  const orderQty = Number(o.qty ?? 0);
                  return (
                    <tr key={o.id} className="hover:bg-accent/20">
                      <td className={`p-2.5 font-bold ${o.side === "BUY" ? "text-gain" : "text-loss"}`}>{o.side || "BUY"}</td>
                      <td className="p-2.5 font-sans">{o.symbol}</td>
                      <td className="p-2.5 text-right">{orderQty}</td>
                      <td className="p-2.5 text-right">₹{orderPx.toFixed(2)}</td>
                      <td className="p-2.5 text-xs text-muted-foreground">{o.type || "MARKET"}</td>
                      <td className="p-2.5 text-xs text-gain text-right font-semibold">FILLED</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Real-Time Live Indian Market Wire (10-minute Auto-refresh) */}
        {terminalView !== "NEWS_WIRE" && (
          <LiveNewsFeed isCompact />
        )}
      </div>

      {/* 3. Right: Order Ticket & Market Depth Ladder */}
      <div className="space-y-4">
        {/* Order Entry Form */}
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          {/* Side Tabs */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setSide("BUY")}
              className={`rounded-md py-2 text-xs font-bold transition-all ${
                side === "BUY" ? "bg-emerald-500 text-white shadow-md" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              BUY / LONG
            </button>
            <button
              onClick={() => setSide("SELL")}
              className={`rounded-md py-2 text-xs font-bold transition-all ${
                side === "SELL" ? "bg-rose-500 text-white shadow-md" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              SELL / SHORT
            </button>
          </div>

          {/* Order Type Tabs */}
          <div className="mt-3 flex gap-2 text-xs">
            {(["MARKET", "LIMIT"] as const).map((x) => (
              <button
                key={x}
                onClick={() => setType(x)}
                className={`rounded-md border px-3 py-1 font-semibold transition-colors ${
                  type === x ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {x}
              </button>
            ))}
          </div>

          {/* Lots Input */}
          <div className="mt-4">
            <label className="flex justify-between text-xs text-muted-foreground">
              <span>Quantity ({lots} Lots)</span>
              <span className="font-mono text-foreground">{qty} contracts</span>
            </label>
            <input
              type="number"
              min={1}
              value={lots}
              onChange={(e) => setLots(Math.max(1, Number(e.target.value)))}
              className="num mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground"
            />
          </div>

          {/* Limit Price */}
          {type === "LIMIT" && (
            <div className="mt-3">
              <label className="block text-xs text-muted-foreground">Limit Price (₹)</label>
              <input
                type="number"
                value={limit}
                placeholder={q.p.toFixed(2)}
                onChange={(e) => setLimit(e.target.value)}
                className="num mt-1 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground"
              />
            </div>
          )}

          {/* Stop Loss (Rule 4.3) */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-muted-foreground">Stop Loss (SL)</label>
              <input
                type="number"
                value={stopLoss}
                placeholder={side === "BUY" ? (q.p - 100).toFixed(0) : (q.p + 100).toFixed(0)}
                onChange={(e) => setStopLoss(e.target.value)}
                className="num mt-1 w-full rounded-md border border-rose-500/30 bg-background px-2.5 py-1.5 text-xs text-rose-400 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] text-muted-foreground">Target Price (TP)</label>
              <input
                type="number"
                value={targetPrice}
                placeholder={side === "BUY" ? (q.p + 200).toFixed(0) : (q.p - 200).toFixed(0)}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="num mt-1 w-full rounded-md border border-emerald-500/30 bg-background px-2.5 py-1.5 text-xs text-emerald-400 font-mono"
              />
            </div>
          </div>

          {/* Live Microstructure & Fee Calculations */}
          <div className="mt-4 space-y-1.5 rounded-lg border border-border/50 bg-secondary/20 p-2.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Order Value</span>
              <span className="num font-bold text-foreground">{inr(qty * px)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Margin Required (10%)</span>
              <span className="num font-semibold text-foreground">{inr(marginRequired)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Expected Slippage</span>
              <span className="num font-mono text-amber-400">
                {side === "BUY" ? "+" : "-"}₹{slippagePts.toFixed(2)} pts
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Statutory Taxes (STT/GST)</span>
              <span className="num font-mono text-muted-foreground">₹{taxes.totalTax.toFixed(2)}</span>
            </div>
            <div className="border-t border-border/40 pt-1 flex justify-between text-muted-foreground">
              <span>Est. Fill Price</span>
              <span className="num font-bold text-primary">₹{estimatedFillPrice.toFixed(2)}</span>
            </div>
          </div>

          <Button
            className={`mt-4 w-full font-bold uppercase tracking-wider ${
              isCoolDownActive
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : side === "BUY"
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-rose-600 hover:bg-rose-500 text-white"
            }`}
            onClick={place}
            disabled={isSubmitting || isCoolDownActive}
          >
            {isCoolDownActive
              ? `Cool-Down Active (${formatTime(coolDownRemaining)})`
              : isSubmitting
              ? "Executing Order..."
              : `${side} ${qty} ${sym}`}
          </Button>
        </div>

        {/* Level-2 Order Book Depth */}
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <ArrowDownUp className="h-3.5 w-3.5 text-primary" /> LEVEL-2 DEPTH
            </span>
            <span className="text-[10px] text-muted-foreground">NSE L2 Queue</span>
          </div>

          <div className="num grid grid-cols-2 gap-x-2 text-xs font-mono">
            <div className="border-b border-border/30 pb-1 flex justify-between text-[10px] text-muted-foreground">
              <span>QTY</span><span>BID</span>
            </div>
            <div className="border-b border-border/30 pb-1 flex justify-between text-[10px] text-muted-foreground">
              <span>ASK</span><span>QTY</span>
            </div>
            {book.map((b, i) => (
              <div key={i} className="contents">
                <p className="flex justify-between py-1 px-1.5 rounded bg-emerald-500/5 text-emerald-400">
                  <span className="text-muted-foreground">{b.qb}</span>
                  <span className="font-bold">₹{b.bid.toFixed(1)}</span>
                </p>
                <p className="flex justify-between py-1 px-1.5 rounded bg-rose-500/5 text-rose-400">
                  <span className="font-bold">₹{b.ask.toFixed(1)}</span>
                  <span className="text-muted-foreground">{b.qa}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Post-Mortem Diagnostics Modal */}
      <PostMortemModal
        isOpen={isPostMortemOpen}
        onClose={() => setIsPostMortemOpen(false)}
        data={postMortemData}
      />

      {/* SEBI-Compliant Trade Statement & Risk Audit Exporter Modal */}
      <TradeStatementExporter
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
      />
      </div>
    </div>
  );
}
