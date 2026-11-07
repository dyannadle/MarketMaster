import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import { LayoutDashboard, GraduationCap, LineChart, CandlestickChart, FlaskConical, Briefcase, Trophy, TrendingUp, Bell, Settings, Shield, LifeBuoy, LogOut } from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/learn", label: "Learn", icon: GraduationCap },
  { to: "/markets", label: "Markets", icon: LineChart },
  { to: "/trade", label: "Trade", icon: CandlestickChart },
  { to: "/lab", label: "Strategy Lab", icon: FlaskConical },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/challenges", label: "Challenges", icon: Trophy },
] as const;

const secondary = [
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/help", label: "Help", icon: LifeBuoy },
] as const;

const bare = ["/sign-in", "/sign-up", "/forgot-password"];

const mobile = [nav[0], nav[1], nav[2], nav[3], nav[5]];

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (bare.includes(pathname)) return <>{children}</>;
  const linkCls = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground";
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-sidebar p-4 md:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><TrendingUp className="size-4" /></span>
          <span className="font-bold tracking-tight">MarketMaster<span className="text-primary">.</span></span>
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              activeProps={{ className: "bg-sidebar-accent !text-primary" }}>
              <n.icon className="size-4" />{n.label}
            </Link>
          ))}
        </nav>
        <nav className="mt-6 flex flex-col gap-1 border-t pt-4">
          {secondary.map((n) => (
            <Link key={n.to} to={n.to} className={linkCls} activeProps={{ className: "bg-sidebar-accent !text-primary" }}><n.icon className="size-4" />{n.label}</Link>
          ))}
          {user?.role === "admin" && <Link to="/admin" className={linkCls} activeProps={{ className: "bg-sidebar-accent !text-primary" }}><Shield className="size-4" />Admin</Link>}
        </nav>
        <div className="mt-auto rounded-xl border bg-card p-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-semibold text-primary-foreground">{user.name[0]?.toUpperCase()}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{user.name}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div>
              <button aria-label="Sign out" onClick={async () => { await logout(); navigate({ to: "/sign-in", replace: true }); }} className="text-muted-foreground hover:text-foreground"><LogOut className="size-4" /></button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button asChild className="w-full" size="sm"><Link to="/sign-up">Create account</Link></Button>
              <Button asChild className="w-full" size="sm" variant="outline"><Link to="/sign-in">Sign in</Link></Button>
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">Paper trading only — virtual funds, simulated prices.</p>
        </div>
      </aside>
      <main className="pb-24 md:ml-60 md:pb-0">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-sidebar/95 backdrop-blur md:hidden">
        {mobile.map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
            activeProps={{ className: "!text-primary" }}>
            <n.icon className="size-5" />{n.label}
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
