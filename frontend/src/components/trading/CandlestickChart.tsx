import { useState, useEffect, useMemo, useRef } from "react";
import { Maximize2, RefreshCw } from "lucide-react";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  symbol: string;
  currentPrice: number;
  basePrice: number;
}

export type Timeframe = "1m" | "5m" | "15m" | "1D";

export function CandlestickChart({ symbol, currentPrice, basePrice }: CandlestickChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate initial historical candles for the symbol and timeframe
  const [candles, setCandles] = useState<Candle[]>(() => {
    return generateCandles(basePrice, 50, timeframe);
  });

  // Reset historical candles when symbol or timeframe changes
  useEffect(() => {
    setCandles(generateCandles(basePrice, 50, timeframe));
  }, [symbol, timeframe, basePrice]);

  // Live tick updater: updates the current forming candle in real-time
  useEffect(() => {
    setCandles((prev) => {
      if (prev.length === 0) return prev;
      const last = { ...prev[prev.length - 1]! };
      last.close = currentPrice;
      last.high = Math.max(last.high, currentPrice);
      last.low = Math.min(last.low, currentPrice);
      last.volume += Math.floor(Math.random() * 15) + 5;
      return [...prev.slice(0, -1), last];
    });
  }, [currentPrice]);

  // Dimensions & Scale Math
  const { minPrice, maxPrice, priceRange, maxVol } = useMemo(() => {
    if (candles.length === 0) return { minPrice: 0, maxPrice: 1, priceRange: 1, maxVol: 100 };
    let min = Infinity;
    let max = -Infinity;
    let mv = 0;
    for (const c of candles) {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > mv) mv = c.volume;
    }
    const padding = (max - min) * 0.08 || 10;
    return {
      minPrice: min - padding,
      maxPrice: max + padding,
      priceRange: (max + padding) - (min - padding),
      maxVol: mv || 100,
    };
  }, [candles]);

  const chartHeight = 280;
  const volHeight = 50;
  const candleAreaHeight = chartHeight - volHeight;

  const getY = (price: number) => {
    return candleAreaHeight - ((price - minPrice) / priceRange) * candleAreaHeight;
  };

  const getVolY = (vol: number) => {
    return chartHeight - (vol / maxVol) * (volHeight - 10);
  };

  const activeCandle = hoveredCandle || candles[candles.length - 1] || null;

  return (
    <div className="flex flex-col rounded-xl border border-border/80 bg-card p-4 shadow-sm" ref={containerRef}>
      {/* Chart Header: Symbol, Timeframes, and OHLC Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-secondary/40 p-1 text-xs font-semibold">
            {(["1m", "5m", "15m", "1D"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`rounded px-2.5 py-1 transition-colors ${
                  timeframe === tf ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {activeCandle && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
              <span className="text-muted-foreground">O:</span>
              <span className="text-foreground">{activeCandle.open.toFixed(2)}</span>
              <span className="text-muted-foreground">H:</span>
              <span className="text-gain">{activeCandle.high.toFixed(2)}</span>
              <span className="text-muted-foreground">L:</span>
              <span className="text-loss">{activeCandle.low.toFixed(2)}</span>
              <span className="text-muted-foreground">C:</span>
              <span className={activeCandle.close >= activeCandle.open ? "text-gain" : "text-loss"}>
                {activeCandle.close.toFixed(2)}
              </span>
              <span className="text-muted-foreground">Vol:</span>
              <span className="text-muted-foreground">{activeCandle.volume.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Ticks
          </span>
        </div>
      </div>

      {/* SVG Candlestick Viewport */}
      <div className="relative mt-3 h-[280px] w-full overflow-hidden select-none">
        <svg
          className="h-full w-full"
          preserveAspectRatio="none"
          viewBox={`0 0 ${candles.length * 14 + 60} ${chartHeight}`}
          onMouseLeave={() => setHoveredCandle(null)}
        >
          {/* Horizontal Grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map((ratio) => {
            const y = candleAreaHeight * ratio;
            const price = maxPrice - ratio * priceRange;
            return (
              <g key={ratio}>
                <line x1={0} y1={y} x2={candles.length * 14} stroke="var(--border)" strokeDasharray="3 3" opacity={0.3} />
                <text x={candles.length * 14 + 6} y={y + 3} fill="var(--muted-foreground)" fontSize={9} fontFamily="monospace">
                  {price.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Volume separator */}
          <line x1={0} y1={candleAreaHeight} x2={candles.length * 14} stroke="var(--border)" opacity={0.4} />

          {/* Candlesticks & Volume Bars */}
          {candles.map((c, i) => {
            const x = i * 14 + 7;
            const isBull = c.close >= c.open;
            const color = isBull ? "#10b981" : "#f43f5e";
            const wickY1 = getY(c.high);
            const wickY2 = getY(c.low);
            const bodyY = Math.min(getY(c.open), getY(c.close));
            const bodyHeight = Math.max(2, Math.abs(getY(c.open) - getY(c.close)));
            const volY = getVolY(c.volume);

            return (
              <g
                key={c.time}
                onMouseEnter={() => setHoveredCandle(c)}
                className="cursor-crosshair group"
              >
                {/* Volume Bar */}
                <rect
                  x={x - 4}
                  y={volY}
                  width={8}
                  height={chartHeight - volY}
                  fill={color}
                  opacity={0.3}
                  className="group-hover:opacity-60 transition-opacity"
                />

                {/* Candle Wick */}
                <line
                  x1={x}
                  y1={wickY1}
                  x2={x}
                  y2={wickY2}
                  stroke={color}
                  strokeWidth={1.5}
                />

                {/* Candle Body */}
                <rect
                  x={x - 4}
                  y={bodyY}
                  width={8}
                  height={bodyHeight}
                  fill={color}
                  rx={1}
                />
              </g>
            );
          })}

          {/* Current Live Price Horizontal Guideline */}
          {candles.length > 0 && (
            <g>
              <line
                x1={0}
                y1={getY(currentPrice)}
                x2={candles.length * 14}
                stroke="var(--primary)"
                strokeDasharray="2 2"
                strokeWidth={1.2}
              />
              <rect
                x={candles.length * 14 + 2}
                y={getY(currentPrice) - 8}
                width={54}
                height={16}
                fill="var(--primary)"
                rx={3}
              />
              <text
                x={candles.length * 14 + 6}
                y={getY(currentPrice) + 4}
                fill="var(--primary-foreground)"
                fontSize={9}
                fontWeight="bold"
                fontFamily="monospace"
              >
                {currentPrice.toFixed(1)}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

// Helper to seed realistic candlestick walks
function generateCandles(basePrice: number, count: number, timeframe: Timeframe): Candle[] {
  const candles: Candle[] = [];
  const tfSeconds = timeframe === "1m" ? 60 : timeframe === "5m" ? 300 : timeframe === "15m" ? 900 : 86400;
  let cur = basePrice;
  const now = Date.now();

  for (let i = count; i >= 0; i--) {
    const time = now - i * tfSeconds * 1000;
    const volatility = basePrice * 0.002;
    const delta = (Math.random() - 0.49) * volatility;
    const open = cur;
    const close = Math.round((open + delta) * 100) / 100;
    const high = Math.round((Math.max(open, close) + Math.random() * volatility * 0.7) * 100) / 100;
    const low = Math.round((Math.min(open, close) - Math.random() * volatility * 0.7) * 100) / 100;
    const volume = Math.floor(Math.random() * 1500) + 300;

    candles.push({ time, open, high, low, close, volume });
    cur = close;
  }
  return candles;
}
