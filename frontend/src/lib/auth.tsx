/**
 * Auth adapter — UI-only demo implementation.
 * Replace the bodies of signIn / signUp / signOut / requestPasswordReset / updateProfile
 * with calls to YOUR backend. Keep the same return shapes and the UI keeps working.
 * NOTE: the demo stores the session in localStorage; real role checks must happen on your server.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "user" | "admin";
export type User = { id: string; name: string; email: string; role: Role; phone?: string; bio?: string };

const KEY = "mm-session";

import { backendApi, setStoredToken } from "./api";

export const authApi = {
  async signIn(email: string, password: string): Promise<User> {
    if (!email || password.length < 6) throw new Error("Invalid email or password");
    try {
      const serverUser = await backendApi.login(email, password);
      return {
        id: serverUser.id,
        name: serverUser.display_name || email.split("@")[0] || "Trader",
        email: serverUser.email,
        role: email.startsWith("admin") ? "admin" : "user",
      };
    } catch (err: any) {
      // If network unreachable, allow local mock for offline demo
      if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError"))) {
        return { id: crypto.randomUUID(), name: email.split("@")[0] ?? "Trader", email, role: email.startsWith("admin") ? "admin" : "user" };
      }
      throw err;
    }
  },
  async signUp(name: string, email: string, password: string): Promise<User> {
    if (password.length < 8) throw new Error("Password must be at least 8 characters");
    try {
      const serverUser = await backendApi.register(email, password, name);
      return {
        id: serverUser.id,
        name: serverUser.display_name || name,
        email: serverUser.email,
        role: "user",
      };
    } catch (err: any) {
      if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError"))) {
        return { id: crypto.randomUUID(), name, email, role: "user" };
      }
      throw err;
    }
  },
  async requestPasswordReset(email: string): Promise<void> {
    if (!email.includes("@")) throw new Error("Enter a valid email");
  },
  async signOut(): Promise<void> {
    setStoredToken(null);
  },
};

type Ctx = { user: User | null; ready: boolean; setUser: (u: User | null) => void; logout: () => Promise<void> };
const AuthCtx = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setU] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const r = localStorage.getItem(KEY); if (r) setU(JSON.parse(r)); } catch {}
    setReady(true);
  }, []);
  const setUser = (u: User | null) => {
    setU(u);
    if (u) localStorage.setItem(KEY, JSON.stringify(u)); else localStorage.removeItem(KEY);
  };
  const logout = async () => { await authApi.signOut(); setUser(null); };
  return <AuthCtx.Provider value={{ user, ready, setUser, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
}
