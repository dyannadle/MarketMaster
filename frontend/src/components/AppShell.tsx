import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  GraduationCap,
  LineChart,
  CandlestickChart,
  FlaskConical,
  Briefcase,
  Trophy,
  TrendingUp,
  Bell,
  Settings,
  Shield,
  LifeBuoy,
  LogOut,
  Newspaper,
  Radio
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/learn", label: "Learn", icon: GraduationCap },
  { to: "/markets", label: "Markets", icon: LineChart },
  { to: "/trade", label: "Trade Terminal", icon: CandlestickChart },
  { to: "/news", label: "Market News Wire", icon: Newspaper, badge: "LIVE" },
  { to: "/lab", label: "Strategy Lab", icon: FlaskConical },
  { to: "/portfolio", label: "Portfolio & RMS", icon: Briefcase },
  { to: "/challenges", label: "Practice Gym", icon: Trophy, badge: "NEW" },
] as const;

const secondary = [
  { to: "/admin", label: "Admin Console", icon: Shield, adminOnly: true },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/help", label: "Help & SEBI Rules", icon: LifeBuoy },
] as const;

const bare = ["/sign-in", "/sign-up", "/forgot-password"];

const mobile = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/trade", label: "Trade", icon: CandlestickChart },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/challenges", label: "Gym", icon: Trophy },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  if (bare.includes(pathname)) return <>{children}</>;
  const linkCls = "flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground";
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar p-4 md:flex">
        <Link to="/" className="mb-6 flex items-center gap-2 px-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <TrendingUp className="size-4" />
          </span>
          <div>
            <span className="font-bold tracking-tight text-foreground">MarketMaster<span className="text-primary">.</span></span>
            <span className="block text-[10px] text-muted-foreground">Institutional Trading Terminal</span>
          </div>
        </Link>

        {/* Live Status Indicator Pill */}
        <div className="mb-4 flex items-center justify-between rounded-lg border border-border/60 bg-accent/30 px-3 py-1.5 text-[11px]">
          <span className="flex items-center gap-1.5 font-bold text-foreground">
            <Radio className="size-3 text-gain animate-pulse" /> NSE / MCX Live
          </span>
          <span className="font-mono text-muted-foreground">Yahoo Fin</span>
        </div>

        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              activeProps={{ className: "bg-sidebar-accent !text-primary font-bold shadow-sm" }}
            >
              <div className="flex items-center gap-3">
                <n.icon className="size-4" />
                <span>{n.label}</span>
              </div>
              {"badge" in n && n.badge && (
                <span className={`rounded px-1.5 py-0.2 text-[9px] font-extrabold uppercase ${
                  n.badge === "LIVE" ? "bg-emerald-500/15 text-emerald-400" : "bg-primary/20 text-primary"
                }`}>
                  {n.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <nav className="mt-4 flex flex-col gap-1 border-t pt-3">
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">System & RMS</p>
          {secondary.map((n) => {
            if ("adminOnly" in n && n.adminOnly && user?.role !== "admin") return null;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={linkCls}
                activeProps={{ className: "bg-sidebar-accent !text-primary font-bold" }}
              >
                <div className="flex items-center gap-3">
                  <n.icon className="size-4" />
                  <span>{n.label}</span>
                </div>
                {n.to === "/notifications" && unreadCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-foreground">
                    {unreadCount}
                  </span>
                )}
                {"adminOnly" in n && n.adminOnly && (
                  <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-400">
                    SUPER
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl border bg-card p-3 shadow-sm">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-foreground">
                {user.name[0]?.toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-bold text-foreground">{user.name}</p>
                  {user.role === "admin" && (
                    <span className="rounded bg-rose-500/20 px-1 py-0.2 text-[9px] font-extrabold text-rose-400 uppercase">
                      Admin
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <button
                aria-label="Sign out"
                onClick={async () => {
                  await logout();
                  navigate({ to: "/sign-in", replace: true });
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button asChild className="w-full" size="sm"><Link to="/sign-up">Create account</Link></Button>
              <Button asChild className="w-full" size="sm" variant="outline"><Link to="/sign-in">Sign in</Link></Button>
            </div>
          )}
          <p className="mt-2.5 text-[10px] text-muted-foreground border-t border-border/40 pt-2">
            Paper trading only — ₹10L virtual funds, simulated matching.
          </p>
        </div>
      </aside>
      <main className="pb-24 md:ml-64 md:pb-0">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-sidebar/95 backdrop-blur md:hidden">
        {mobile.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.to === "/" }}
            className="flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted-foreground"
            activeProps={{ className: "!text-primary font-bold" }}
          >
            <n.icon className="size-4" />
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b px-5 py-6 md:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

export function Change({ v }: { v: number }) {
  return <span className={`num ${v >= 0 ? "text-gain" : "text-loss"}`}>{v >= 0 ? "+" : ""}{v.toFixed(2)}%</span>;
}
