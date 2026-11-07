/**
 * MarketMaster API Client Adapter
 * Connects frontend TanStack components to the FastAPI Python Quant Backend.
 * Automatically falls back to local simulation when backend is unreachable.
 */

const API_BASE_URL = typeof window !== "undefined" && window.location.hostname === "localhost"
  ? "http://localhost:8000/api/v1"
  : "/api/v1";

const TOKEN_KEY = "mm-jwt-token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const backendApi = {
  // Authentication
  async register(email: string, password: string, displayName: string) {
    const res = await request<{ access_token: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        display_name: displayName,
        age_confirmed: true, // Rule 4.2 compliance
      }),
    });
    setStoredToken(res.access_token);
    return res.user;
  },

  async login(email: string, password: string) {
    const res = await request<{ access_token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.access_token);
    return res.user;
  },

  async getMe() {
    return request<any>("/auth/me");
  },

  // Trading & Ledger
  async placeOrder(params: {
    symbol: string;
    side: "BUY" | "SELL";
    orderType?: string;
    quantity: number;
    limitPrice?: number;
    stopLoss?: number;
    targetPrice?: number;
  }) {
    return request<any>("/trading/orders", {
      method: "POST",
      body: JSON.stringify({
        symbol: params.symbol,
        side: params.side,
        order_type: params.orderType || "MARKET",
        quantity: params.quantity,
        limit_price: params.limitPrice,
        stop_loss: params.stopLoss,
        target_price: params.targetPrice,
      }),
    });
  },

  async getPositions() {
    return request<any[]>("/trading/positions");
  },

  async exitPosition(positionId: string, exitPrice?: number) {
    return request<any>(`/trading/positions/${positionId}/exit${exitPrice ? `?exit_price=${exitPrice}` : ""}`, {
      method: "POST",
    });
  },

  async auditLedger() {
    return request<any>("/trading/ledger/audit");
  },

  // Quant Derivatives
  async calculateBlackScholes(spot: number, strike: number, days: number, vol: number, rate = 0.065) {
    return request<any>("/quant/black-scholes", {
      method: "POST",
      body: JSON.stringify({
        spot_price: spot,
        strike_price: strike,
        time_to_expiry_days: days,
        volatility: vol,
        risk_free_rate: rate,
      }),
    });
  },

  async runBacktest(strategyName: string, symbol: string, fastPeriod = 9, slowPeriod = 21) {
    return request<any>("/quant/backtest", {
      method: "POST",
      body: JSON.stringify({
        strategy_name: strategyName,
        symbol,
        fast_period: fastPeriod,
        slow_period: slowPeriod,
        atr_stop_multiplier: 1.5,
        risk_per_trade: 0.01,
      }),
    });
  },

  // Market Replay
  async getReplaySession(symbol = "NIFTY_FUT", bars = 375, blindMode = false) {
    return request<any>(`/replay/session?symbol=${symbol}&bars=${bars}&blind_mode=${blindMode}`);
  },
};

