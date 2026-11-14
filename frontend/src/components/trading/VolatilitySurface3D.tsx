import { useState, useMemo, useRef, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  Activity,
  Layers,
  Rotate3d,
  Sliders,
  ShieldAlert,
  Info,
  Sparkles,
  Maximize2,
} from "lucide-react";
import {
  generateVolatilitySurface,
  VolatilitySurfaceData,
  SabrParameters,
} from "@/lib/volatility-surface";

interface VolatilitySurface3DProps {
  symbol?: string;
  spotPrice?: number;
}

export function VolatilitySurface3D({
  symbol = "NIFTY",
  spotPrice = 24500,
}: VolatilitySurface3DProps) {
  // SABR parameter state
  const [sabrParams, setSabrParams] = useState<SabrParameters>({
    alpha: 0.145,
    beta: 0.7,
    rho: -0.38,
    nu: 0.42,
  });

  // 3D View Angles
  const [azimuth, setAzimuth] = useState<number>(-35); // Horizontal rotation in degrees
  const [elevation, setElevation] = useState<number>(32); // Vertical tilt in degrees
  const [selectedDte, setSelectedDte] = useState<number>(28);
  const [hoveredPoint, setHoveredPoint] = useState<{
    dte: number;
    strike: number;
    iv: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Generate surface data
  const surfaceData: VolatilitySurfaceData = useMemo(() => {
    return generateVolatilitySurface(symbol, spotPrice, 0.065, sabrParams);
  }, [symbol, spotPrice, sabrParams]);

  // Color generator based on IV percentage (12% to 24%)
  const getIvColor = (iv: number) => {
    const min = 11;
    const max = 23;
    const t = Math.max(0, Math.min(1, (iv - min) / (max - min)));

    if (t < 0.33) {
      // Deep Blue to Cyan
      const r = Math.round(30 + t * 3 * 20);
      const g = Math.round(64 + t * 3 * 140);
      const b = Math.round(180 + t * 3 * 75);
      return `rgb(${r}, ${g}, ${b})`;
    } else if (t < 0.66) {
      // Cyan to Emerald Green
      const u = (t - 0.33) * 3;
      const r = Math.round(50 + u * 10);
      const g = Math.round(204 - u * 30);
      const b = Math.round(255 - u * 150);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Emerald to Orange / Crimson
      const u = (t - 0.66) * 3;
      const r = Math.round(60 + u * 185);
      const g = Math.round(174 - u * 120);
      const b = Math.round(105 - u * 65);
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  // Render 3D Wireframe & Polygons on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Coordinate normalization helpers
    const dtes = surfaceData.dteList;
    const strikes = surfaceData.strikes;
    const minStrike = strikes[0]!;
    const maxStrike = strikes[strikes.length - 1]!;
    const minDte = dtes[0]!;
    const maxDte = dtes[dtes.length - 1]!;

    const azRad = (azimuth * Math.PI) / 180;
    const elRad = (elevation * Math.PI) / 180;

    // 3D projection function
    const project = (strike: number, dte: number, iv: number) => {
      // Normalize to [-1, 1]
      const nx = ((strike - minStrike) / (maxStrike - minStrike)) * 2 - 1;
      const ny = ((dte - minDte) / (maxDte - minDte)) * 2 - 1;
      const nz = ((iv - 10) / (25 - 10)) * 2 - 1;

      // Azimuth rotation around Z
      const rx = nx * Math.cos(azRad) - ny * Math.sin(azRad);
      const ry = nx * Math.sin(azRad) + ny * Math.cos(azRad);

      // Elevation rotation around X
      const py = ry * Math.cos(elRad) - nz * Math.sin(elRad);
      const pz = ry * Math.sin(elRad) + nz * Math.cos(elRad);

      // Canvas mapping
      const scale = Math.min(width, height) * 0.42;
      const cx = width / 2 + rx * scale;
      const cy = height / 2 + py * scale - pz * 30;

      return { x: cx, y: cy, z: pz, iv, strike, dte };
    };

    // Build 2D grid of projected points
    const grid: ReturnType<typeof project>[][] = [];
    dtes.forEach((dte, dteIdx) => {
      grid[dteIdx] = [];
      strikes.forEach((k) => {
        const pt = surfaceData.points.find((p) => p.dte === dte && p.strike === k);
        const iv = pt ? pt.iv : 15.0;
        grid[dteIdx]!.push(project(k, dte, iv));
      });
    });

    // Draw shaded surface quads
    for (let i = 0; i < dtes.length - 1; i++) {
      for (let j = 0; j < strikes.length - 1; j++) {
        const p1 = grid[i]![j]!;
        const p2 = grid[i]![j + 1]!;
        const p3 = grid[i + 1]![j + 1]!;
        const p4 = grid[i + 1]![j]!;

        const avgIv = (p1.iv + p2.iv + p3.iv + p4.iv) / 4;
        const color = getIvColor(avgIv);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.55;
        ctx.fill();

        ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.85;
        ctx.stroke();
      }
    }

    // Highlight selected DTE contour line
    const selectedDteIdx = dtes.indexOf(selectedDte);
    if (selectedDteIdx >= 0 && grid[selectedDteIdx]) {
      ctx.beginPath();
      grid[selectedDteIdx]!.forEach((pt, idx) => {
        if (idx === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.strokeStyle = "#38bdf8"; // bright sky blue
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1.0;
      ctx.stroke();
    }

    // Draw points on vertices
    grid.forEach((row) => {
      row.forEach((pt) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 0.9;
        ctx.fill();
      });
    });
  }, [surfaceData, azimuth, elevation, selectedDte]);

  // 2D Smile Data for Selected DTE
  const smileChartData = useMemo(() => {
    return surfaceData.points
      .filter((p) => p.dte === selectedDte)
      .map((p) => ({
        strike: p.strike,
        iv: p.iv,
        moneyness: p.moneyness,
        isAtm: p.isAtm,
      }));
  }, [surfaceData, selectedDte]);

  // 2D Term Structure Data (ATM IV across DTE)
  const termStructureData = useMemo(() => {
    return surfaceData.dteList.map((dte) => {
      const pt = surfaceData.points.find((p) => p.dte === dte && p.isAtm);
      return {
        dte: `${dte}D`,
        iv: pt ? pt.iv : 15.0,
      };
    });
  }, [surfaceData]);

  return (
    <div className="space-y-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      {/* Header and Regime Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black tracking-tight text-foreground flex items-center gap-1.5">
              <Rotate3d className="h-4 w-4 text-primary" /> 3D Options Volatility Surface & SABR Smile
            </h2>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
              {symbol} (Spot ₹{spotPrice.toLocaleString("en-IN")})
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time Black-Scholes inversion & Hagan SABR model smile mapping across Moneyness and Expirations.
          </p>
        </div>

        {/* Term Structure Regime Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black uppercase ${
              surfaceData.termStructureRegime === "CONTANGO"
                ? "bg-gain/10 text-gain border border-gain/20"
                : surfaceData.termStructureRegime === "BACKWARDATION"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Activity className="h-3 w-3" /> Term Structure: {surfaceData.termStructureRegime}
          </span>
          <span className="rounded-md border border-border/70 bg-muted/50 px-2 py-1 text-[11px] font-semibold text-foreground">
            Put/Call Skew: <strong className="text-primary">{surfaceData.putCallSkewRatio}x</strong>
          </span>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">ATM Implied Volatility</span>
          <p className="num text-lg font-black text-foreground mt-0.5">{surfaceData.atmIv}%</p>
          <span className="text-[10px] text-muted-foreground">Baseline India VIX Proxy</span>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Put-Call Skew Ratio</span>
          <p className="num text-lg font-black text-amber-400 mt-0.5">{surfaceData.putCallSkewRatio}</p>
          <span className="text-[10px] text-muted-foreground">90% OTM Put / 110% Call</span>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">25-Delta Risk Reversal</span>
          <p className="num text-lg font-black text-sky-400 mt-0.5">{surfaceData.riskReversal25Delta}%</p>
          <span className="text-[10px] text-muted-foreground">Downside crash premium</span>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-2.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">SABR Vol of Vol (nu)</span>
          <p className="num text-lg font-black text-foreground mt-0.5">{sabrParams.nu.toFixed(2)}</p>
          <span className="text-[10px] text-muted-foreground">Smile curvature intensity</span>
        </div>
      </div>

      {/* 3D Canvas Projection View & Camera Controls */}
      <div className="relative rounded-xl border border-border/80 bg-zinc-950/90 overflow-hidden p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-800/80 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-zinc-300 flex items-center gap-1.5">
              <Rotate3d className="h-3.5 w-3.5 text-primary" /> Interactive 3D Mesh
            </span>
            <span className="text-zinc-500">|</span>
            <label className="flex items-center gap-1.5 text-zinc-400">
              <span>Azimuth:</span>
              <input
                type="range"
                min="-180"
                max="180"
                value={azimuth}
                onChange={(e) => setAzimuth(Number(e.target.value))}
                className="w-20 accent-primary"
              />
              <span className="num font-bold text-zinc-200 w-8">{azimuth}°</span>
            </label>
            <label className="flex items-center gap-1.5 text-zinc-400">
              <span>Elevation:</span>
              <input
                type="range"
                min="5"
                max="80"
                value={elevation}
                onChange={(e) => setElevation(Number(e.target.value))}
                className="w-20 accent-primary"
              />
              <span className="num font-bold text-zinc-200 w-8">{elevation}°</span>
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400">Highlight Expiry:</span>
            {surfaceData.dteList.map((dte) => (
              <button
                key={dte}
                onClick={() => setSelectedDte(dte)}
                className={`rounded px-2 py-0.5 text-[10px] font-bold transition-all ${
                  selectedDte === dte
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {dte}D
              </button>
            ))}
          </div>
        </div>

        {/* The 3D Canvas */}
        <div className="flex justify-center items-center py-2">
          <canvas
            ref={canvasRef}
            width={720}
            height={340}
            className="w-full max-w-3xl h-[280px] sm:h-[340px] rounded-lg cursor-grab active:cursor-grabbing"
          />
        </div>

        {/* Heatmap Legend */}
        <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span>IV Intensity:</span>
            <div className="h-2 w-32 rounded-full bg-gradient-to-r from-blue-600 via-emerald-500 to-rose-600" />
            <span>Low (11%) → Extreme (23%+)</span>
          </div>
          <span className="text-zinc-500">
            X-Axis: Strike Price | Y-Axis: Days to Expiry (DTE) | Z-Axis: Implied Volatility
          </span>
        </div>
      </div>

      {/* 2D Cross-Section Panels: Volatility Smile & Term Structure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Panel 1: IV Smile Curve */}
        <div className="rounded-xl border border-border/70 bg-card/60 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-black uppercase text-foreground">
                Volatility Smile ({selectedDte}D Expiry)
              </h3>
            </div>
            <span className="text-[10px] text-muted-foreground">Strike vs Implied Vol</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={smileChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <XAxis dataKey="strike" tick={{ fontSize: 10 }} stroke="#888888" />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} stroke="#888888" unit="%" />
                <RechartsTooltip
                  formatter={(val: any) => [`${val}%`, "Implied Vol"]}
                  labelFormatter={(strike: any) => `Strike: ₹${strike}`}
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "11px" }}
                />
                <ReferenceLine x={spotPrice} stroke="#eab308" strokeDasharray="3 3" label={{ value: "ATM Spot", fill: "#eab308", fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="iv"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#38bdf8" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel 2: Term Structure Curve */}
        <div className="rounded-xl border border-border/70 bg-card/60 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-black uppercase text-foreground">
                ATM Volatility Term Structure
              </h3>
            </div>
            <span className="text-[10px] text-muted-foreground">DTE vs ATM IV</span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={termStructureData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <XAxis dataKey="dte" tick={{ fontSize: 10 }} stroke="#888888" />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10 }} stroke="#888888" unit="%" />
                <RechartsTooltip
                  formatter={(val: any) => [`${val}%`, "ATM IV"]}
                  labelFormatter={(dte: any) => `Maturity: ${dte}`}
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px", fontSize: "11px" }}
                />
                <Line
                  type="monotone"
                  dataKey="iv"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#10b981" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Interactive SABR Parameter Calibration Sliders */}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-primary" /> Institutional SABR Model Calibration
          </span>
          <span className="text-[10px] text-muted-foreground">Hagan et al. (2002) PDE asymptotic approximation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">Correlation (rho):</span>
              <span className="num font-bold text-foreground">{sabrParams.rho.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-0.9"
              max="0.5"
              step="0.05"
              value={sabrParams.rho}
              onChange={(e) => setSabrParams((prev) => ({ ...prev, rho: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
            <span className="text-[9px] text-muted-foreground">Controls put skew tilt (negative = equity skew)</span>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">Vol of Vol (nu):</span>
              <span className="num font-bold text-foreground">{sabrParams.nu.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={sabrParams.nu}
              onChange={(e) => setSabrParams((prev) => ({ ...prev, nu: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
            <span className="text-[9px] text-muted-foreground">Controls smile curvature (wing curvature)</span>
          </div>

          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">ATM Base Vol (alpha):</span>
              <span className="num font-bold text-foreground">{(sabrParams.alpha * 100).toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0.08"
              max="0.30"
              step="0.01"
              value={sabrParams.alpha}
              onChange={(e) => setSabrParams((prev) => ({ ...prev, alpha: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
            <span className="text-[9px] text-muted-foreground">Shifts overall surface height up/down</span>
          </div>
        </div>
      </div>
    </div>
  );
}
