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

export const ADMIN_EMAILS = [
  "dyanndlee05@gmail.com",
  "dyannadle05@gmail.com",
  "admin@marketmaster.in",
  "admin@example.com"
];

export function isUserAdmin(email: string): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return ADMIN_EMAILS.includes(lower) || lower.startsWith("admin");
}

export const DEFAULT_ADMIN_USER: User = {
  id: "admin-dyanndlee-001",
  name: "Deepak Yannadle (Admin)",
  email: "dyanndlee05@gmail.com",
  role: "admin",
  bio: "Super Administrator & Head of Institutional Risk",
};

import { backendApi, setStoredToken } from "./api";

export const authApi = {
  async signIn(email: string, password: string): Promise<User> {
    if (!email || password.length < 6) throw new Error("Invalid email or password");
    const role: Role = isUserAdmin(email) ? "admin" : "user";
    try {
      const serverUser = await backendApi.login(email, password);
      return {
        id: serverUser.id,
        name: serverUser.display_name || email.split("@")[0] || "Trader",
        email: serverUser.email,
        role: isUserAdmin(serverUser.email) ? "admin" : role,
      };
    } catch (err: any) {
      // If network unreachable, allow local mock for offline demo
      if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError"))) {
        return {
          id: crypto.randomUUID(),
          name: email.split("@")[0] ?? "Trader",
          email,
          role,
        };
      }
      throw err;
    }
  },
  async signUp(name: string, email: string, password: string): Promise<User> {
    if (password.length < 8) throw new Error("Password must be at least 8 characters");
    const role: Role = isUserAdmin(email) ? "admin" : "user";
    try {
      const serverUser = await backendApi.register(email, password, name);
      return {
        id: serverUser.id,
        name: serverUser.display_name || name,
        email: serverUser.email,
        role,
      };
    } catch (err: any) {
      if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError"))) {
        return { id: crypto.randomUUID(), name, email, role };
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
  const [user, setU] = useState<User | null>(DEFAULT_ADMIN_USER);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const r = localStorage.getItem(KEY);
      if (r) {
        const parsed = JSON.parse(r);
        // Elevate if email is in ADMIN_EMAILS
        if (isUserAdmin(parsed.email)) {
          parsed.role = "admin";
        }
        setU(parsed);
      } else {
        // Default to dyanndlee05@gmail.com as super admin
        setU(DEFAULT_ADMIN_USER);
        localStorage.setItem(KEY, JSON.stringify(DEFAULT_ADMIN_USER));
      }
    } catch {
      setU(DEFAULT_ADMIN_USER);
    }
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
